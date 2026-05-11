'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { FeeManager } from '@/components/admin/FeeManager';
import { useClub } from '@/context/ClubContext';
import { useToast } from '@/hooks/use-toast';

const AdminFeesPage = () => {
  const { sessionId } = useParams();
  const router = useRouter();
  const { sessions } = useClub();
  const { user } = useAuth();
  const { clubId } = useClub();
  const { toast } = useToast();

  useEffect(() => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      toast({ title: 'Session not found', variant: 'destructive' });
      router.push('/session');
      return;
    }
    if (!session.is_active) {
      toast({ title: 'Session has ended', variant: 'destructive' });
      router.push('/session');
      return;
    }
    localStorage.setItem('tbc_current_session_id', sessionId as string);
  }, [sessionId, sessions, router, toast]);

  // TODO: In a real app, you would fetch the feeId based on the current club or session
  const feeId = `fee_${clubId}`;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Manage Fees</h1>
      <FeeManager feeId={feeId} />
    </div>
  );
};

export default AdminFeesPage;
