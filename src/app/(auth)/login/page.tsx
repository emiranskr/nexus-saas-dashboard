'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Giriş yapılırken bir hata oluştu.');
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Arka plan glow efektleri */}
      <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-sky-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Logo ve Başlık */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-500/25 mb-2">
            <Layers className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Nexus SaaS Platform
          </h1>
          <p className="text-sm text-muted-foreground">
            Yönetim ve analitik konsoluna güvenli giriş yapın
          </p>
        </div>

        {/* Giriş Kartı */}
        <div className="rounded-2xl border border-border bg-card/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center gap-2">
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">E-posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexus.io"
                  className="flex h-10 w-full rounded-lg border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-lg border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              <span>Konsola Giriş Yap</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Hızlı Demo Girişi Butonları */}
          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 font-semibold">
              <Zap className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span>Hızlı Demo Hesapları (Tek Tıkla Doldur):</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials('admin@nexus.io', 'Admin123!')}
                className="flex items-center justify-between p-2 rounded-lg border border-border bg-accent/30 hover:bg-accent hover:border-sky-500/40 transition-colors text-left"
              >
                <div>
                  <div className="font-bold text-foreground">Yönetici (Admin)</div>
                  <div className="text-[10px] text-muted-foreground">admin@nexus.io</div>
                </div>
                <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('user@nexus.io', 'User123!')}
                className="flex items-center justify-between p-2 rounded-lg border border-border bg-accent/30 hover:bg-accent hover:border-indigo-500/40 transition-colors text-left"
              >
                <div>
                  <div className="font-bold text-foreground">Müşteri (User)</div>
                  <div className="text-[10px] text-muted-foreground">user@nexus.io</div>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Kayıt Ol Linki */}
        <p className="text-center text-xs text-muted-foreground">
          Henüz bir hesabınız yok mu?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Yeni Kurumsal Hesap Oluşturun
          </Link>
        </p>
      </div>
    </div>
  );
}
