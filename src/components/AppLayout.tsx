'use client';
import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute: string;
}

export default function AppLayout({ children, activeRoute }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [platformName, setPlatformName] = useState('SwiftWallet');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/platform/config', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load platform name');
        return (await response.json()) as { platformName?: string };
      })
      .then((config) => {
        if (!cancelled && config.platformName) setPlatformName(config.platformName);
      })
      .catch((error: unknown) => {
        console.error('Unable to load platform branding', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNavOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeRoute]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar activeRoute={activeRoute} platformName={platformName} />
      </div>

      {/* Mobile Sidebar */}
      {mobileNavOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="lg:hidden">
            <Sidebar
              activeRoute={activeRoute}
              isMobile
              platformName={platformName}
              onClose={() => setMobileNavOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-sidebar"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">SW</span>
            </div>
            <span className="font-semibold text-foreground text-sm">{platformName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="pulse-dot" />
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-xs font-semibold text-foreground">MS</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin">{children}</div>
      </main>
    </div>
  );
}
