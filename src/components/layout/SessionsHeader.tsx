'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useClub } from '@/context/ClubContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sun, Moon, Trophy, Swords, Settings, Menu, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SessionsHeader() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show Sessions, Rankings, and Settings in sessions context
  const navItems = [
    { label: 'Sessions', href: '/sessions', icon: Calendar },
    { label: 'Rankings', href: '/rankings', icon: Trophy },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 max-w-6xl">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <span className="text-lg font-black text-primary">MSW</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-black uppercase tracking-tighter leading-none text-primary">MSW Badminton</h1>
            <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.25em] mt-1">Command Center</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 ml-6 border-l pl-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "h-11 w-11 transition-all",
                    isActive ? "shadow-md shadow-primary/20 scale-105" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                  title={item.label}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right side - Theme toggle only */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-primary transition-colors"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 md:h-5 md:w-5" /> : <Moon className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>

          {/* Mobile Hamburger Menu */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-card shadow-xl animate-in slide-in-from-right">
            <nav className="flex flex-col p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => handleNavClick(item.href)}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 h-12",
                        isActive ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-semibold">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
