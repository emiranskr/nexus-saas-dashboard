'use client';

import * as React from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  CreditCard,
  Building,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { OrderDTO, ProductDTO, UserDTO } from '@/types';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function OrdersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const { toast } = useToast();

  const [orders, setOrders] = React.useState<OrderDTO[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [isLoading, setIsLoading] = React.useState(true);

  // Modallar
  const [selectedOrder, setSelectedOrder] = React.useState<OrderDTO | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  // Sipariş İptal Onay Diyaloğu (Requirement 3 Çözümü)
  const [cancelOrderId, setCancelOrderId] = React.useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Yeni Sipariş Formu
  const [availableProducts, setAvailableProducts] = React.useState<ProductDTO[]>([]);
  const [availableUsers, setAvailableUsers] = React.useState<UserDTO[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState('');
  const [orderItems, setOrderItems] = React.useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 1 },
  ]);
  const [paymentMethod, setPaymentMethod] = React.useState<'CREDIT_CARD' | 'BANK_TRANSFER'>(
    'CREDIT_CARD'
  );
  const [formError, setFormError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchOrders = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        status: statusFilter,
      });

      const res = await fetch(`/api/orders?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const loadCreateData = async () => {
    try {
      // 1. Ürünleri yükle
      const prodRes = await fetch('/api/products?status=ACTIVE');
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setAvailableProducts(pData);
        if (pData.length > 0) {
          setOrderItems([{ productId: pData[0].id, quantity: 1 }]);
        }
      }

      // 2. Yalnızca ADMIN ise kullanıcı listesini çek (HIGH-04 Çözümü)
      if (isAdmin) {
        const userRes = await fetch('/api/users?limit=50');
        if (userRes.ok) {
          const uData = await userRes.json();
          setAvailableUsers(uData.data || []);
          if (uData.data?.length > 0) {
            setSelectedUserId(session?.user?.id || uData.data[0].id);
          }
        }
      } else {
        // Standart kullanıcı kendi hesabına sipariş verir
        if (session?.user?.id) {
          setSelectedUserId(session.user.id);
        }
      }
    } catch (err) {
      console.error('loadCreateData error:', err);
    }
  };

  const handleOpenCreateModal = () => {
    if (!isAdmin && session?.user?.id) {
      setSelectedUserId(session.user.id);
    }
    loadCreateData();
    setFormError('');
    setIsCreateOpen(true);
  };

  const statusLabels: Record<string, string> = {
    COMPLETED: 'Tamamlandı',
    PROCESSING: 'İşleniyor',
    PENDING: 'Beklemede',
    CANCELLED: 'İptal Edildi',
  };

  const executeStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        toast.success(
          'Durum Güncellendi',
          `Sipariş durumu "${statusLabels[newStatus] || newStatus}" olarak güncellendi.`
        );
      } else {
        const err = await res.json();
        toast.error('Güncelleme Başarısız', err.error || 'Sipariş durumu güncellenemedi.');
      }
    } catch {
      toast.error('Hata Oluştu', 'Durum güncelleme sırasında bağlantı hatası oluştu.');
    }
  };

  const onStatusSelectChange = (orderId: string, newStatus: string) => {
    if (newStatus === 'CANCELLED') {
      setCancelOrderId(orderId);
      setIsCancelConfirmOpen(true);
    } else {
      executeStatusChange(orderId, newStatus);
    }
  };

  const confirmCancelOrder = async () => {
    if (!cancelOrderId) return;
    setIsCancelling(true);
    try {
      await executeStatusChange(cancelOrderId, 'CANCELLED');
      setIsCancelConfirmOpen(false);
      setCancelOrderId(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const validItems = orderItems.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Lütfen en az bir ürün seçiniz.');
      toast.warning('Eksik Bilgi', 'Lütfen sipariş için en az bir ürün ve miktar belirleyiniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId || session?.user?.id,
          paymentMethod,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Sipariş oluşturulamadı.');
        toast.error('Sipariş Oluşturulamadı', data.error || 'Stok veya kullanıcı kontrolünü sağlayınız.');
      } else {
        setIsCreateOpen(false);
        toast.success('Sipariş Onaylandı', `${data.orderNumber} nolu siparişiniz başarıyla alındı.`);
        fetchOrders();
      }
    } catch {
      setFormError('İşlem sırasında hata oluştu.');
      toast.error('Bağlantı Hatası', 'Sipariş gönderilirken sunucu hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Tamamlandı
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            İşleniyor
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Beklemede
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            İptal Edildi
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Hesaplanan tahmini sipariş toplamı
  const calculateEstimatedTotal = () => {
    return orderItems.reduce((sum, item) => {
      const p = availableProducts.find((prod) => prod.id === item.productId);
      return sum + (p ? p.price * item.quantity : 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Yeni Sipariş */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <span>Sipariş ve İşlem Takibi</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Platformdaki tüm müşteri siparişlerini, ödeme durumlarını ve ürün dağılımını izleyin ({total} toplam kayıt).
          </p>
        </div>

        <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Yeni Sipariş Oluştur</span>
        </Button>
      </div>

      {/* Arama ve Filtre Kartı */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Sipariş no, müşteri adı veya e-posta ile ara..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Durum:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">Tüm Durumlar</option>
                <option value="COMPLETED">Tamamlandı</option>
                <option value="PROCESSING">İşleniyor</option>
                <option value="PENDING">Beklemede</option>
                <option value="CANCELLED">İptal Edildi</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Siparişler Tablosu */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-accent/40 border-b border-border">
                <tr className="text-muted-foreground font-semibold">
                  <th className="py-3.5 px-4 font-semibold">Sipariş No</th>
                  <th className="py-3.5 px-4 font-semibold">Müşteri</th>
                  <th className="py-3.5 px-4 font-semibold">Ürünler</th>
                  <th className="py-3.5 px-4 font-semibold">Toplam Tutar</th>
                  <th className="py-3.5 px-4 font-semibold">Ödeme Yöntemi</th>
                  <th className="py-3.5 px-4 font-semibold">Tarih</th>
                  <th className="py-3.5 px-4 font-semibold">Durum</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      Siparişler yükleniyor...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      Kayıtlı sipariş bulunamadı.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-accent/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {o.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground text-sm">
                          {o.user?.name || 'Müşteri'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{o.user?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-foreground font-medium line-clamp-1">
                          {o.items?.map((it) => `${it.product?.name} (x${it.quantity})`).join(', ') ||
                            'Detaysız'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {o.items?.length || 0} kalem ürün
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black text-foreground text-sm">
                        {formatCurrency(o.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          {o.paymentMethod === 'BANK_TRANSFER' ? (
                            <>
                              <Building className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                              Havale / EFT
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                              Kredi Kartı
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <select
                            value={o.status}
                            onChange={(e) => onStatusSelectChange(o.id, e.target.value)}
                            className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="PROCESSING">İşleniyor</option>
                            <option value="COMPLETED">Tamamlandı</option>
                            <option value="PENDING">Beklemede</option>
                            <option value="CANCELLED">İptal Edildi</option>
                          </select>
                        ) : (
                          getStatusBadge(o.status)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 mr-1" />
                          <span>İncele</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sayfalama */}
          <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
            <div>
              Toplam <span className="font-bold text-foreground">{total}</span> siparişten{' '}
              {orders.length > 0 ? (page - 1) * 10 + 1 : 0} -{' '}
              {Math.min(page * 10, total)} arası listeleniyor.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage(page - 1)}
              >
                Önceki
              </Button>
              <span className="font-semibold px-2 text-foreground">
                Sayfa {page} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage(page + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SİPARİŞ DETAY MODALI */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Sipariş Detayı: ${selectedOrder?.orderNumber}`}
        description="Müşteri siparişi, kalemler ve ödeme bilgileri"
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs">
            {/* Üst Bilgiler */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-accent/30 p-3.5 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Müşteri</span>
                <span className="font-bold text-foreground">{selectedOrder.user?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Tarih</span>
                <span className="font-bold text-foreground">
                  {formatDateTime(selectedOrder.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Ödeme</span>
                <span className="font-bold text-foreground">
                  {selectedOrder.paymentMethod === 'BANK_TRANSFER' ? 'Havale/EFT' : 'Kredi Kartı'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Durum</span>
                <div>{getStatusBadge(selectedOrder.status)}</div>
              </div>
            </div>

            {/* Kalemler Tablosu */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-accent/40 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Ürün Adı</th>
                    <th className="py-2 px-3 font-semibold text-center">Miktar</th>
                    <th className="py-2 px-3 font-semibold text-right">Birim Fiyat</th>
                    <th className="py-2 px-3 font-semibold text-right">Ara Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {selectedOrder.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-foreground">{item.product?.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {item.product?.sku}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-foreground">
                        {item.quantity} adet
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-accent/30 border-t border-border">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 font-bold text-foreground text-right">
                      Genel Toplam:
                    </td>
                    <td className="py-3 px-3 font-black text-foreground text-sm text-right">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Kapat
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* YENİ SİPARİŞ OLUŞTURMA MODALI */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Yeni Sipariş Oluştur"
        description="Veritabanı transaction ile otomatik stok düşümü yapılarak güvenli sipariş oluşturulur."
        maxWidth="max-w-xl"
        isLoading={isSubmitting}
      >
        <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="rounded-lg bg-destructive/10 p-2.5 text-destructive border border-destructive/20 font-semibold">
              {formError}
            </div>
          )}

          {/* Müşteri Seçimi (HIGH-04 Çözümü) */}
          {isAdmin ? (
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Müşteri Seçin (Yönetici Yetkisi)</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-lg bg-accent/40 p-3 border border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Sipariş Sahibi</span>
                <span className="font-bold text-foreground text-sm">{session?.user?.name || session?.user?.email}</span>
              </div>
              <Badge variant="outline">Kendi Hesabınız</Badge>
            </div>
          )}

          {/* Ürün ve Adet Seçimi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground">Ürünler</label>
              <button
                type="button"
                onClick={() =>
                  setOrderItems([
                    ...orderItems,
                    { productId: availableProducts[0]?.id || '', quantity: 1 },
                  ])
                }
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Yeni Kalem Ekle
              </button>
            </div>

            {orderItems.map((item, idx) => {
              const selectedProd = availableProducts.find((p) => p.id === item.productId);
              return (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const newItems = [...orderItems];
                      newItems[idx].productId = e.target.value;
                      setOrderItems(newItems);
                    }}
                    className="flex-1 h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {formatCurrency(p.price)} (Kalan Stok: {p.stock})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    max={selectedProd ? selectedProd.stock : 99}
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const newItems = [...orderItems];
                      newItems[idx].quantity = isNaN(val) || val < 1 ? 1 : val;
                      setOrderItems(newItems);
                    }}
                    className="w-20 h-10 rounded-lg border border-input bg-card px-2 text-center text-sm font-bold font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Adet"
                  />

                  {orderItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = orderItems.filter((_, i) => i !== idx);
                        setOrderItems(newItems);
                      }}
                      className="p-2 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-accent"
                      title="Kalemi Sil"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ödeme Yöntemi */}
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Ödeme Yöntemi</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Kredi Kartı</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Building className="h-4 w-4" />
                <span>Banka Havalesi / EFT</span>
              </button>
            </div>
          </div>

          {/* Hesaplanan Toplam */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-accent/40 border border-border">
            <span className="font-semibold text-muted-foreground">Tahmini Sipariş Tutarı:</span>
            <span className="font-black text-lg text-foreground">
              {formatCurrency(calculateEstimatedTotal())}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Siparişi Onayla & Oluştur
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sipariş İptal Onay Diyaloğu (Requirement 3 Çözümü) */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => {
          if (!isCancelling) {
            setIsCancelConfirmOpen(false);
            setCancelOrderId(null);
          }
        }}
        onConfirm={confirmCancelOrder}
        title="Siparişi İptal Et"
        description="Bu siparişi iptal etmek istediğinize emin misiniz? Sipariş iptal edildiğinde ürün stokları veritabanında otomatik olarak güvenle iade edilecektir."
        confirmLabel="Evet, Siparişi İptal Et"
        cancelLabel="Vazgeç"
        isLoading={isCancelling}
        variant="destructive"
      />
    </div>
  );
}
