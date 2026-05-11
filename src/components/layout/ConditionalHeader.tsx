'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

export function ConditionalHeader() {
  const pathname = usePathname();

  // Hide header on join and session routes
  const isJoinRoute = pathname?.startsWith('/join/');
  const isSessionListRoute = pathname === '/session';
  const isSessionRoute = pathname?.startsWith('/session/') && pathname !== '/session';

  // Show header on session-specific routes (dashboard, players, fees within session)
  // Hide on session list page
  if (isJoinRoute || isSessionListRoute) {
    return null;
  }

  return <Header />;
}
