'use client';

import * as React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import {
  Settings,
  User,
  Lock,
  Moon,
  Sun,
  Laptop,
  Shield,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Profil Formu
  const [name, setName] = React.useState('');
  const [profileMsg, setProfileMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileErrors, setProfileErrors] = React.useState<Record<string, string>>({});
  const [isProfileSaving, setIsProfileSaving] = React.useState(false);

  // Şifre Formu
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = React.useState('');
  const [passwordMsg, setPasswordMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordErrors, setPasswordErrors] = React.useState<Record<string, string>>({});
  const [isPasswordSaving, setIsPasswordSaving] = React.useState(false);

  React.useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErrors({});

    if (!name.trim()) {
      setProfileErrors({ name: 'Tam isim alanı zorunludur.' });
      return;
    }

    setIsProfileSaving(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileMsg({ type: 'error', text: data.error || 'Profil güncellenemedi.' });
        toast.error('Profil Güncellenemedi', data.error || 'Lütfen bilgilerinizi kontrol ediniz.');
      } else {
        setProfileMsg({ type: 'success', text: 'Profil başarıyla güncellendi.' });
        toast.success('Profil Güncellendi', 'Adınız ve profil bilgileriniz başarıyla kaydedildi.');
        await update({ name });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Bağlantı hatası oluştu.' });
      toast.error('Bağlantı Hatası', 'Sunucuya bağlanırken bir hata oluştu.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErrors({});

    const errors: Record<string, string> = {};
    if (!currentPassword) {
      errors.currentPassword = 'Lütfen mevcut şifrenizi giriniz.';
    }
    if (newPassword.length < 8) {
      errors.newPassword = 'Yeni şifre en az 8 karakter olmalıdır.';
    }
    if (newPassword !== newPasswordConfirm) {
      errors.confirm = 'Yeni şifreler birbiriyle eşleşmiyor.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsPasswordSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ type: 'error', text: data.error || 'Şifre değiştirilemedi.' });
        if (data.error?.toLowerCase().includes('mevcut')) {
          setPasswordErrors({ currentPassword: data.error });
        }
        toast.error('Şifre Değiştirilemedi', data.error || 'Mevcut şifrenizi kontrol ediniz.');
      } else {
        setPasswordMsg({ type: 'success', text: 'Şifreniz başarıyla güncellendi.' });
        toast.success('Şifre Güncellendi', 'Güvenlik parolanız başarıyla değiştirildi.');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'İşlem sırasında hata oluştu.' });
      toast.error('Hata Oluştu', 'Şifre güncellenirken bir sorun oluştu.');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          <span>Platform Ayarları</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Kişisel profilinizi, güvenlik parolalarınızı ve arayüz tercihlerinizi yapılandırın.
        </p>
      </div>

      {/* Profil Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>Profil Bilgileri</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Platformda görüntülenen adınız ve hesap kimliğiniz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            {profileMsg && (
              <div
                className={`p-3 rounded-lg border flex items-center gap-2 font-semibold ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="name"
                label="Tam İsim"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (profileErrors.name) setProfileErrors((prev) => ({ ...prev, name: '' }));
                }}
                error={profileErrors.name}
              />

              <Input
                id="email"
                label="E-posta (Değiştirilemez)"
                type="email"
                disabled
                value={session?.user?.email || ''}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-muted-foreground">Mevcut Rolünüz:</span>
              <Badge variant={session?.user?.role === 'ADMIN' ? 'default' : 'secondary'}>
                <Shield className="h-3 w-3 mr-1" />
                {session?.user?.role === 'ADMIN' ? 'Yönetici (Admin)' : 'Standart Kullanıcı'}
              </Badge>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={isProfileSaving}>
                Profil Bilgilerini Kaydet
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Şifre ve Güvenlik */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>Şifre ve Güvenlik</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Hesabınızın güvenliği için güçlü bir parola belirleyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            {passwordMsg && (
              <div
                className={`p-3 rounded-lg border flex items-center gap-2 font-semibold ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div>
              <Input
                id="currentPassword"
                label="Mevcut Şifre"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordErrors.currentPassword) setPasswordErrors((prev) => ({ ...prev, currentPassword: '' }));
                }}
                placeholder="Mevcut şifrenizi giriniz"
                error={passwordErrors.currentPassword}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="newPassword"
                label="Yeni Şifre"
                type="password"
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordErrors.newPassword) setPasswordErrors((prev) => ({ ...prev, newPassword: '' }));
                }}
                placeholder="En az 8 karakter"
                error={passwordErrors.newPassword}
              />

              <Input
                id="newPasswordConfirm"
                label="Yeni Şifre Tekrar"
                type="password"
                required
                value={newPasswordConfirm}
                onChange={(e) => {
                  setNewPasswordConfirm(e.target.value);
                  if (passwordErrors.confirm) setPasswordErrors((prev) => ({ ...prev, confirm: '' }));
                }}
                placeholder="Yeni şifreyi tekrar yazınız"
                error={passwordErrors.confirm}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={isPasswordSaving}>
                Şifreyi Güncelle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Görünüm ve Tema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground">
            Arayüz ve Tema Tercihi
          </CardTitle>
          <CardDescription className="text-xs">
            Platform görünümünü koyu, açık veya sistem modunda ayarlayın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-md shadow-primary/15'
                  : 'border-border text-foreground hover:bg-accent'
              }`}
            >
              <Moon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <div>
                <div className="font-bold text-xs">Koyu Tema</div>
                <div className="text-[10px] text-muted-foreground">Varsayılan SaaS Teması</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-md shadow-primary/15'
                  : 'border-border text-foreground hover:bg-accent'
              }`}
            >
              <Sun className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <div className="font-bold text-xs">Açık Tema</div>
                <div className="text-[10px] text-muted-foreground">Yüksek Kontrast Aydınlık</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                theme === 'system'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-md shadow-primary/15'
                  : 'border-border text-foreground hover:bg-accent'
              }`}
            >
              <Laptop className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <div>
                <div className="font-bold text-xs">Sistem Teması</div>
                <div className="text-[10px] text-muted-foreground">İşletim Sistemi Ayarı</div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Oturum Kapatma */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base font-bold text-destructive">
            Güvenli Oturumu Sonlandır
          </CardTitle>
          <CardDescription className="text-xs">
            Mevcut cihazdaki aktif oturumunuzu güvenle sonlandırın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Oturumu Kapat</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
