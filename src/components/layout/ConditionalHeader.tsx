'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';

export function ConditionalHeader() {
  const pathname = usePathname();
  
  // Hide header on player-related routes
  const isPlayerRoute = pathname === '/player' || pathname?.startsWith('/join/');
  
  if (isPlayerRoute) {
    return null;
  }
  
  return <Header />;
}
