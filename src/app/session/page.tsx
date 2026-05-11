'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Users, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SessionPage() {
  const { sessions, createSession, getCurrentSession } = useClub();
  const { toast } = useToast();
  const router = useRouter();

  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const currentSession = getCurrentSession();

  const handleCreateSession = () => {
    if (!newSessionName.trim()) {
      toast({ title: 'Session name required', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    const session = createSession(newSessionName);
    setNewSessionName('');
    toast({ title: 'Session created successfully' });

    // Redirect to the new session
    if (session?.id) {
      router.push(`/session/${session.id}`);
    }
  };

  const ongoingSessions = sessions.filter(s => s.is_active);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">MSW Badminton</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Session Management</p>
        </div>

        {ongoingSessions.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-center">Active Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ongoingSessions.map((session) => (
                <Link key={session.id} href={`/session/${session.id}`}>
                  <Card className="border-2 cursor-pointer hover:border-primary transition-all h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-black uppercase tracking-tight">{session.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="font-black">{session.registeredPlayers?.length || 0} players</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <Card className="border-2 border-dashed border-primary/40 bg-primary/5">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black uppercase tracking-widest">Create New Session</h2>
              <p className="text-sm text-muted-foreground font-bold uppercase">Start a new badminton session</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Session Name</Label>
                <Input
                  placeholder="e.g. Saturday Morning Session"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="font-bold h-12"
                />
              </div>
              <Button
                onClick={handleCreateSession}
                disabled={isCreating || !newSessionName.trim()}
                className="w-full font-black uppercase h-12 text-base"
              >
                {isCreating ? 'Creating...' : 'Create Session'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
