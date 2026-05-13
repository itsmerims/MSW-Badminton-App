'use client';

import { useParams, useRouter } from 'next/navigation';
import { useClub } from '@/context/ClubContext';
import { SessionMatchHistory } from '@/components/session/SessionMatchHistory';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function SessionMatchesPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { sessions, matches, players } = useClub();
  const { toast } = useToast();

  useEffect(() => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      toast({ title: 'Session not found', variant: 'destructive' });
      router.push('/session');
      return;
    }
    localStorage.setItem('tbc_current_session_id', sessionId as string);
  }, [sessionId, sessions, router, toast]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Match History</h1>
            <p className="text-sm text-muted-foreground font-bold mt-1">
              Matches played in this session
            </p>
          </div>
        </div>
        
        <SessionMatchHistory matches={matches} players={players} sessionId={sessionId as string} />
      </div>
    </div>
  );
}
