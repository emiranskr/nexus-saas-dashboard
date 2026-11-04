'use client';

import * as React from 'react';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { UserDTO } from '@/types';
import { useSession } from 'next-auth/react';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';

export default function UsersPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const { toast } = useToast();

  const [users, setUsers] = React.useState<UserDTO[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [isLoading, setIsLoading] = React.useState(true);

  // Modallar
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserDTO | null>(null);

  // Form State
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        role: roleFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/users?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, page, search, roleFilter, statusFilter]);

  React.useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Ad Soyad zorunludur.';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Geçerli bir e-posta adresi giriniz.';
    if (!formData.password || formData.password.length < 8) errors.password = 'Şifre en az 8 karakter olmalıdır.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Kullanıcı oluşturulamadı.');
        const errLower = (data.error || '').toLowerCase();
        if (errLower.includes('e-posta') || errLower.includes('email') || errLower.includes('kullanılıyor')) {
          setFieldErrors((prev) => ({ ...prev, email: data.error }));
        } else if (errLower.includes('şifre') || errLower.includes('password')) {
          setFieldErrors((prev) => ({ ...prev, password: data.error }));
        }
        toast.error('Kullanıcı Eklenemedi', data.error || 'Bilgileri kontrol edip tekrar deneyiniz.');
      } else {
        setIsCreateOpen(false);
        setFormData({ name: '', email: '', password: '', role: 'USER', status: 'ACTIVE' });
        toast.success('Kullanıcı Başarıyla Eklendi', `${data.name} sisteme kaydedildi.`);
        fetchUsers();
      }
    } catch {
      setFormError('İşlem sırasında hata oluştu.');
      toast.error('Bağlantı Hatası', 'Sunucuya bağlanırken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Ad Soyad zorunludur.';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Geçerli bir e-posta adresi giriniz.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Güncelleme başarısız oldu.');
        const errLower = (data.error || '').toLowerCase();
        if (errLower.includes('e-posta') || errLower.includes('email') || errLower.includes('kullanılıyor')) {
          setFieldErrors((prev) => ({ ...prev, email: data.error }));
        }
        toast.error('Güncelleme Başarısız', data.error || 'Bilgileri kontrol ediniz.');
      } else {
        setIsEditOpen(false);
        setSelectedUser(null);
        toast.success('Kullanıcı Güncellendi', `${data.name} bilgileri başarıyla güncellendi.`);
        fetchUsers();
      }
    } catch {
      setFormError('İşlem sırasında hata oluştu.');
      toast.error('Bağlantı Hatası', 'İşlem sırasında beklenmeyen bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const deletedName = selectedUser.name;
        setIsDeleteOpen(false);
        setSelectedUser(null);
        toast.success('Kullanıcı Silindi', `${deletedName} hesabı başarıyla kaldırıldı.`);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error('Silme İşlemi Başarısız', data.error || 'Kullanıcı silinemedi.');
      }
    } catch {
      toast.error('Hata Oluştu', 'Silme işlemi sırasında sunucu hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (u: UserDTO) => {
    setSelectedUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      status: u.status,
    });
    setFormError('');
    setFieldErrors({});
    setIsEditOpen(true);
  };

  const openDeleteModal = (u: UserDTO) => {
    setSelectedUser(u);
    setIsDeleteOpen(true);
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium">Yetki kontrolü yapılıyor...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AccessDenied
        pageName="Kullanıcı Yönetimi"
        description="Kullanıcı listesi, yetkilendirme ve hesap yönetimi ekranı yalnızca Sistem Yöneticisi (ADMIN) yetkisine sahip kullanıcılar tarafından görüntülenebilir."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Yeni Ekle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <span>Kullanıcı Yönetimi</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Sistem kullanıcılarını, rollerini ve erişim durumlarını yönetin ({total} toplam kayıt).
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => {
              setFormData({ name: '', email: '', password: '', role: 'USER', status: 'ACTIVE' });
              setFormError('');
              setFieldErrors({});
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Yeni Kullanıcı Ekle</span>
          </Button>
        )}
      </div>

      {/* Filtre ve Arama Çubuğu */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Arama Inputu */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="İsim veya e-posta ile ara..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Rol Filtresi */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Rol:
              </span>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">Tüm Roller</option>
                <option value="ADMIN">Yönetici (Admin)</option>
                <option value="USER">Standart Kullanıcı</option>
              </select>
            </div>

            {/* Durum Filtresi */}
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
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
                <option value="SUSPENDED">Askıda</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kullanıcılar Tablosu */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-accent/40 border-b border-border">
                <tr className="text-muted-foreground font-semibold">
                  <th className="py-3.5 px-4 font-semibold">Kullanıcı</th>
                  <th className="py-3.5 px-4 font-semibold">Rol</th>
                  <th className="py-3.5 px-4 font-semibold">Durum</th>
                  <th className="py-3.5 px-4 font-semibold">Sipariş Sayısı</th>
                  <th className="py-3.5 px-4 font-semibold">Kayıt Tarihi</th>
                  {isAdmin && <th className="py-3.5 px-4 font-semibold text-right">İşlemler</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Kullanıcılar yükleniyor...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Arama kriterlerine uygun kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-accent/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-700 dark:text-sky-400 font-bold border border-sky-500/20">
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm">{u.name}</div>
                            <div className="text-muted-foreground text-[11px]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {u.role === 'ADMIN' ? (
                          <Badge variant="default" className="bg-indigo-600 text-white">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Kullanıcı</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.status === 'ACTIVE' && (
                          <Badge variant="success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aktif
                          </Badge>
                        )}
                        {u.status === 'INACTIVE' && (
                          <Badge variant="outline">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pasif
                          </Badge>
                        )}
                        {u.status === 'SUSPENDED' && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Askıya Alındı
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-foreground">
                        {u._count?.orders ?? 0} sipariş
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(u)}
                              title="Düzenle"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(u)}
                              title="Sil"
                              className="hover:text-rose-600 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sayfalama Kontrolleri */}
          <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
            <div>
              Toplam <span className="font-bold text-foreground">{total}</span> kullanıcıdan{' '}
              {users.length > 0 ? (page - 1) * 10 + 1 : 0} -{' '}
              {Math.min(page * 10, total)} arası gösteriliyor.
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

      {/* YENİ KULLANICI OLUŞTURMA MODALI */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Yeni Kullanıcı Ekle"
        description="Platforma yeni bir müşteri veya sistem yöneticisi kaydedin."
        isLoading={isSubmitting}
      >
        <form onSubmit={handleCreateSubmit} noValidate className="space-y-4 text-xs">
          {formError && (
            <div className="rounded-lg bg-destructive/10 p-2.5 text-destructive border border-destructive/20 font-semibold">
              {formError}
            </div>
          )}

          <Input
            id="create-user-name"
            label="Ad Soyad"
            required
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="Ali Vural"
            error={fieldErrors.name}
          />

          <Input
            id="create-user-email"
            label="E-posta"
            type="email"
            required
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="ali@sirket.com"
            error={fieldErrors.email}
          />

          <Input
            id="create-user-password"
            label="Şifre"
            type="password"
            required
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
            }}
            placeholder="En az 8 karakter, 1 büyük harf, 1 rakam"
            error={fieldErrors.password}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="create-user-role" className="font-semibold text-foreground">Rol</label>
              <select
                id="create-user-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="USER">Standart Kullanıcı</option>
                <option value="ADMIN">Yönetici (Admin)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="create-user-status" className="font-semibold text-foreground">Durum</label>
              <select
                id="create-user-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
                <option value="SUSPENDED">Askıda</option>
              </select>
            </div>
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
              Kullanıcıyı Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* KULLANICI DÜZENLEME MODALI */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Kullanıcı Bilgilerini Düzenle"
        description={`${selectedUser?.name} kullanıcısının bilgilerini ve yetkilerini güncelleyin.`}
        isLoading={isSubmitting}
      >
        <form onSubmit={handleEditSubmit} noValidate className="space-y-4 text-xs">
          {formError && (
            <div className="rounded-lg bg-destructive/10 p-2.5 text-destructive border border-destructive/20 font-semibold">
              {formError}
            </div>
          )}

          <Input
            id="edit-user-name"
            label="Ad Soyad"
            required
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={fieldErrors.name}
          />

          <Input
            id="edit-user-email"
            label="E-posta"
            type="email"
            required
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={fieldErrors.email}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="edit-user-role" className="font-semibold text-foreground">Rol</label>
              <select
                id="edit-user-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="USER">Standart Kullanıcı</option>
                <option value="ADMIN">Yönetici (Admin)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-user-status" className="font-semibold text-foreground">Durum</label>
              <select
                id="edit-user-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
                <option value="SUSPENDED">Askıda</option>
              </select>
            </div>
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
        title="Kullanıcıyı Sil"
        description={`${selectedUser?.name || 'Seçili'} (${selectedUser?.email || ''}) adlı hesabı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmLabel="Evet, Hesabı Sil"
        isLoading={isSubmitting}
      />
    </div>
  );
}
