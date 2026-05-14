'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import { SessionsHeader } from './SessionsHeader';
import { useClub } from '@/context/ClubContext';

export function ConditionalHeader() {
  const pathname = usePathname();

  // Hide header on join route only
  const isJoinRoute = pathname?.startsWith('/join/');
  
  // Use SessionsHeader on sessions list page or on global pages (not session-specific)
  const isSessionsListPage = pathname === '/sessions';
  const isSessionDetailPage = pathname?.startsWith('/sessions/') && pathname !== '/sessions';
  const isGlobalPage = ['/rankings', '/players', '/settings'].includes(pathname || '');
  const shouldUseSessionsHeader = isSessionsListPage || (isGlobalPage && !isSessionDetailPage);

  if (isJoinRoute) {
    return null;
  }

  if (shouldUseSessionsHeader) {
    return <SessionsHeader />;
  }

  return <Header />;
}
