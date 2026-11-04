'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sabitlenebilir / Daraltılabilir Sol Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Ana İçerik Alanı */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background/50">
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
