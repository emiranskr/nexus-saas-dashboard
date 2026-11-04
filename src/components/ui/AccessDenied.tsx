'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldAlert, LayoutDashboard, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface AccessDeniedProps {
  title?: string;
  pageName?: string;
  description?: string;
}

export function AccessDenied({
  title = 'Yetkisiz Erişim (403)',
  pageName = 'Bu Sayfa',
  description = 'Bu sayfaya erişim yetkiniz bulunmamaktadır. Bu alanı görüntülemek ve işlem yapabilmek için Sistem Yöneticisi (ADMIN) rolüne sahip olmanız gerekmektedir.',
}: AccessDeniedProps) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/80 bg-card/95 shadow-xl backdrop-blur">
        <CardContent className="flex flex-col items-center p-6 sm:p-10 text-center">
          {/* İkon */}
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-lg shadow-destructive/10">
            <ShieldAlert className="h-10 w-10" />
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-card border-2 border-border text-amber-500 shadow">
              <Lock className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Rozet */}
          <Badge variant="destructive" className="mb-3 px-3 py-1 text-[11px] uppercase tracking-wider font-bold">
            Yönetici Yetkisi Gerekli
          </Badge>

          {/* Başlık & Açıklama */}
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            {title}
          </h2>

          <p className="mt-1 text-sm font-semibold text-sky-600 dark:text-sky-400">
            {pageName}
          </p>

          <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Aksiyon Butonu */}
          <div className="mt-8 flex flex-col sm:flex-row w-full items-center justify-center gap-3">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard&apos;a Dön</span>
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-[11px] text-muted-foreground/75">
            Eğer bir hata olduğunu düşünüyorsanız lütfen sistem yöneticiniz ile iletişime geçiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
