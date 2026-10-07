'use client';
import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute: string;
}

export default function AppLayout({ children, activeRoute }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar activeRoute={activeRoute} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen lg:ml-0 pb-[72px] lg:pb-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">SW</span>
            </div>
            <span className="font-semibold text-foreground text-sm">SwiftWallet</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="pulse-dot" />
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-xs font-semibold text-foreground">MS</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <MobileNav activeRoute={activeRoute} />
      </div>
    </div>
  );
}