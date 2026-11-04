'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kayıt işlemi başarısız oldu');
        setIsLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      }
    } catch {
      setError('Bağlantı hatası oluştu.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -right-32 h-96 w-96 rounded-full bg-sky-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 h-96 w-96 rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-500/25 mb-2">
            <Layers className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Nexus Hesabı Oluştur
          </h1>
          <p className="text-sm text-muted-foreground">
            Kurumsal yönetim ve analitik paneline anında katılın
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="font-semibold">Hesabınız başarıyla oluşturuldu! Giriş sayfasına yönlendiriliyorsunuz...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tam İsim</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  className="flex h-10 w-full rounded-lg border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Kurumsal E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ahmet@sirket.com"
                  className="flex h-10 w-full rounded-lg border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Güvenli Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 8 karakter, 1 büyük harf ve 1 rakam"
                  className="flex h-10 w-full rounded-lg border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Minimum 8 karakter, en az bir büyük harf ve bir rakam gereklidir.
              </p>
            </div>

            <Button type="submit" className="w-full mt-3" isLoading={isLoading} disabled={success}>
              <span>Kayıt İşlemini Tamamla</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Zaten hesabınız var mı?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Giriş Yapın
          </Link>
        </p>
      </div>
    </div>
  );
}
