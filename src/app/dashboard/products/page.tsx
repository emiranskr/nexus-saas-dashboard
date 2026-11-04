'use client';

import * as React from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Tag,
  DollarSign,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ProductDTO, CategoryDTO } from '@/types';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ProductsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const { toast } = useToast();

  const [products, setProducts] = React.useState<ProductDTO[]>([]);
  const [categories, setCategories] = React.useState<CategoryDTO[]>([]);
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [isLoading, setIsLoading] = React.useState(true);

  // Modallar
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<ProductDTO | null>(null);

  // Form State
  const [formData, setFormData] = React.useState({
    name: '',
    sku: '',
    description: '',
    price: 0,
    stock: 0,
    categoryId: '',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const getStockBadge = (stock: number) => {
    if (stock <= 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 font-semibold">
          <XCircle className="h-3 w-3" />
          Tükendi
        </Badge>
      );
    }
    if (stock <= 5) {
      return (
        <Badge variant="warning" className="flex items-center gap-1 font-semibold">
          <AlertTriangle className="h-3 w-3" />
          Kritik Stok
        </Badge>
      );
    }
    return (
      <Badge variant="success" className="flex items-center gap-1 font-semibold">
        <CheckCircle2 className="h-3 w-3" />
        Normal Stok
      </Badge>
    );
  };

  const fetchCategories = React.useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {}
  }, []);

  const fetchProducts = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const query = new URLSearchParams({
        search,
        categoryId: categoryFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/products?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Ürün adı zorunludur.';
    if (!formData.sku.trim()) errors.sku = 'SKU kodu zorunludur.';
    if (formData.price < 0) errors.price = 'Fiyat 0 veya daha büyük olmalıdır.';
    if (formData.stock < 0) errors.stock = 'Stok 0 veya daha büyük olmalıdır.';
    if (!formData.categoryId) errors.categoryId = 'Lütfen bir kategori seçiniz.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Ürün eklenemedi.');
        if (data.error?.toLowerCase().includes('sku')) {
          setFieldErrors((prev) => ({ ...prev, sku: data.error }));
        }
        toast.error('Ürün Eklenemedi', data.error || 'Bilgileri kontrol edip tekrar deneyiniz.');
      } else {
        setIsCreateOpen(false);
        toast.success('Ürün Başarıyla Eklendi', `${data.name} ürün kataloğuna eklendi.`);
        fetchProducts();
      }
    } catch {
      setFormError('İşlem sırasında hata oluştu.');
      toast.error('Bağlantı Hatası', 'Ürün eklenirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFormError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Ürün adı zorunludur.';
    if (!formData.sku.trim()) errors.sku = 'SKU kodu zorunludur.';
    if (formData.price < 0) errors.price = 'Fiyat 0 veya daha büyük olmalıdır.';
    if (formData.stock < 0) errors.stock = 'Stok 0 veya daha büyük olmalıdır.';
    if (!formData.categoryId) errors.categoryId = 'Lütfen bir kategori seçiniz.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Güncelleme başarısız oldu.');
        if (data.error?.toLowerCase().includes('sku')) {
          setFieldErrors((prev) => ({ ...prev, sku: data.error }));
        }
        toast.error('Güncelleme Başarısız', data.error || 'Bilgileri kontrol ediniz.');
      } else {
        setIsEditOpen(false);
        setSelectedProduct(null);
        toast.success('Ürün Güncellendi', `${data.name} bilgileri başarıyla kaydedildi.`);
        fetchProducts();
      }
    } catch {
      setFormError('İşlem sırasında hata oluştu.');
      toast.error('Bağlantı Hatası', 'İşlem sırasında beklenmeyen bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const deletedName = selectedProduct.name;
        setIsDeleteOpen(false);
        setSelectedProduct(null);
        toast.success('Ürün Silindi', `${deletedName} ürünü başarıyla kaldırıldı veya arşive alındı.`);
        fetchProducts();
      } else {
        const data = await res.json();
        toast.error('Silme İşlemi Başarısız', data.error || 'Ürün silinemedi.');
      }
    } catch {
      toast.error('Hata Oluştu', 'Silme sırasında sunucu hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      price: 0,
      stock: 0,
      categoryId: categories[0]?.id || '',
      status: 'ACTIVE',
    });
    setFormError('');
    setFieldErrors({});
    setIsCreateOpen(true);
  };

  const openEditModal = (p: ProductDTO) => {
    setSelectedProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      description: p.description || '',
      price: p.price,
      stock: p.stock,
      categoryId: p.categoryId,
      status: p.status,
    });
    setFormError('');
    setFieldErrors({});
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Yeni Ürün Ekle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <span>Ürün ve Stok Yönetimi</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            SaaS ürün paketlerini, lisans kotalarını ve stok seviyelerini yönetin ({products.length} ürün).
          </p>
        </div>

        {isAdmin && (
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Yeni Ürün Ekle</span>
          </Button>
        )}
      </div>

      {/* Arama ve Filtre Kartı */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ürün adı veya SKU ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Kategori:
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">Tüm Kategoriler</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Durum:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">Tümü</option>
                <option value="ACTIVE">Satışta (Aktif)</option>
                <option value="DRAFT">Taslak</option>
                <option value="ARCHIVED">Arşivlendi</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ürünler Tablosu */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-accent/40 border-b border-border">
                <tr className="text-muted-foreground font-semibold">
                  <th className="py-3.5 px-4 font-semibold">Ürün Adı & SKU</th>
                  <th className="py-3.5 px-4 font-semibold">Kategori</th>
                  <th className="py-3.5 px-4 font-semibold">Birim Fiyat</th>
                  <th className="py-3.5 px-4 font-semibold">Stok Miktarı</th>
                  <th className="py-3.5 px-4 font-semibold">Durum</th>
                  {isAdmin && <th className="py-3.5 px-4 font-semibold text-right">İşlemler</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Ürünler yükleniyor...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Kriterlere uygun ürün bulunamadı.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isLowStock = p.stock <= 5;
                    return (
                      <tr key={p.id} className="hover:bg-accent/20 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-bold text-foreground text-sm">{p.name}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {p.sku}
                            </div>
                            {p.description && (
                              <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-foreground border border-border">
                            <Tag className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                            {p.category?.name || 'Genel'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-foreground text-sm">
                          {formatCurrency(p.price)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">
                              {p.stock} adet
                            </span>
                            {getStockBadge(p.stock)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {p.status === 'ACTIVE' && <Badge variant="success">Satışta</Badge>}
                          {p.status === 'DRAFT' && <Badge variant="outline">Taslak</Badge>}
                          {p.status === 'ARCHIVED' && (
                            <Badge variant="secondary">Arşiv</Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(p)}
                                title="Düzenle"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setIsDeleteOpen(true);
                                }}
                                title="Sil"
                                className="hover:text-rose-600 dark:hover:text-rose-400"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* YENİ ÜRÜN EKLEME MODALI */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Yeni Ürün / Servis Ekle"
        description="Platform kataloğuna yeni bir SaaS lisansı veya ek servis paketi tanımlayın."
        isLoading={isSubmitting}
      >
        <form onSubmit={handleCreateSubmit} noValidate className="space-y-4 text-xs">
          {formError && (
            <div className="rounded-lg bg-destructive/10 p-2.5 text-destructive border border-destructive/20 font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="create-prod-name"
              label="Ürün Adı"
              required
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Örn: AI Prompt Engine"
              error={fieldErrors.name}
            />
            <Input
              id="create-prod-sku"
              label="SKU Kodu"
              required
              value={formData.sku}
              onChange={(e) => {
                setFormData({ ...formData, sku: e.target.value.toUpperCase() });
                if (fieldErrors.sku) setFieldErrors((prev) => ({ ...prev, sku: '' }));
              }}
              placeholder="NXS-AI-ENG"
              error={fieldErrors.sku}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="create-prod-cat" className="text-xs font-semibold text-foreground">Kategori</label>
            <select
              id="create-prod-cat"
              value={formData.categoryId}
              onChange={(e) => {
                setFormData({ ...formData, categoryId: e.target.value });
                if (fieldErrors.categoryId) setFieldErrors((prev) => ({ ...prev, categoryId: '' }));
              }}
              className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <p className="text-xs text-destructive font-medium mt-1">{fieldErrors.categoryId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="create-prod-price"
              label="Birim Fiyat (TL)"
              type="number"
              required
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => {
                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 });
                if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: '' }));
              }}
              error={fieldErrors.price}
            />
            <Input
              id="create-prod-stock"
              label="Mevcut Stok Miktarı"
              type="number"
              required
              min="0"
              value={formData.stock}
              onChange={(e) => {
                setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 });
                if (fieldErrors.stock) setFieldErrors((prev) => ({ ...prev, stock: '' }));
              }}
              error={fieldErrors.stock}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="create-prod-desc" className="text-xs font-semibold text-foreground">Açıklama</label>
            <textarea
              id="create-prod-desc"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex w-full rounded-lg border border-input bg-card p-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ürün özellikleri ve detayları..."
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="create-prod-status" className="text-xs font-semibold text-foreground">Durum</label>
            <select
              id="create-prod-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ACTIVE">Satışta (Aktif)</option>
              <option value="DRAFT">Taslak</option>
              <option value="ARCHIVED">Arşivlendi</option>
            </select>
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
              Ürünü Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* DÜZENLEME MODALI */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Ürünü Düzenle"
        description={`${selectedProduct?.name} bilgilerini güncelleyin.`}
        isLoading={isSubmitting}
      >
        <form onSubmit={handleEditSubmit} noValidate className="space-y-4 text-xs">
          {formError && (
            <div className="rounded-lg bg-destructive/10 p-2.5 text-destructive border border-destructive/20 font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="edit-prod-name"
              label="Ürün Adı"
              type="text"
              required
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
              }}
              error={fieldErrors.name}
            />
            <Input
              id="edit-prod-sku"
              label="SKU Kodu"
              type="text"
              required
              value={formData.sku}
              onChange={(e) => {
                setFormData({ ...formData, sku: e.target.value.toUpperCase() });
                if (fieldErrors.sku) setFieldErrors((prev) => ({ ...prev, sku: '' }));
              }}
              error={fieldErrors.sku}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="edit-prod-price"
              label="Birim Fiyat (TL)"
              type="number"
              required
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => {
                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 });
                if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: '' }));
              }}
              error={fieldErrors.price}
            />
            <Input
              id="edit-prod-stock"
              label="Mevcut Stok Miktarı"
              type="number"
              required
              min="0"
              value={formData.stock}
              onChange={(e) => {
                setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 });
                if (fieldErrors.stock) setFieldErrors((prev) => ({ ...prev, stock: '' }));
              }}
              error={fieldErrors.stock}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-prod-desc" className="text-xs font-semibold text-foreground">Açıklama</label>
            <textarea
              id="edit-prod-desc"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex w-full rounded-lg border border-input bg-card p-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-prod-status" className="text-xs font-semibold text-foreground">Durum</label>
            <select
              id="edit-prod-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ACTIVE">Satışta (Aktif)</option>
              <option value="DRAFT">Taslak</option>
              <option value="ARCHIVED">Arşivlendi</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Değişiklikleri Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* SİLME ONAY MODALI */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Ürünü Sil"
        description={`${selectedProduct?.name || 'Seçili ürün'} (${selectedProduct?.sku || ''}) ürününü silmek istediğinize emin misiniz? Geçmiş sipariş kaydı olan ürünler güvenli şekilde arşive alınacaktır.`}
        confirmLabel="Evet, Ürünü Sil"
        isLoading={isSubmitting}
      />
    </div>
  );
}
