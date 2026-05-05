'use client';

import { useSupabaseClub } from '@/context/SupabaseClubContext';
import { RoleSelector } from './RoleSelector';

export function RoleSelectorWrapper({ children }: { children: React.ReactNode }) {
  const { userRole, setUserRole } = useSupabaseClub();

  if (!userRole) {
    return <RoleSelector onRoleSelect={setUserRole} />;
  }

  return <>{children}</>;
}
