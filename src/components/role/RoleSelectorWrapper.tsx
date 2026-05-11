'use client';

import { useClub } from '@/context/ClubContext';
import { RoleSelector } from './RoleSelector';

export function RoleSelectorWrapper({ children }: { children: React.ReactNode }) {
  const { userRole, setUserRole } = useClub();

  if (!userRole) {
    return <RoleSelector onRoleSelect={setUserRole} />;
  }

  return <>{children}</>;
}
