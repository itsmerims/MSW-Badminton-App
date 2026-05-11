'use client';

import React from 'react';
import { useAuth } from '@/firebase';
import { FeeManager } from '@/components/admin/FeeManager';
import { useClub } from '@/context/ClubContext';

const AdminFeesPage = () => {
  const { user, isAdmin } = useAuth();
  const { clubId } = useClub();

  // TODO: In a real app, you would fetch the feeId based on the current club or session
  const feeId = `fee_${clubId}`;

  if (!isAdmin) {
    return <p>You do not have permission to access this page.</p>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Manage Fees</h1>
      <FeeManager feeId={feeId} />
    </div>
  );
};

export default AdminFeesPage;
