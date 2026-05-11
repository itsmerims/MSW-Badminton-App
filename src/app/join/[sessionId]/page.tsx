'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Bell, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOrCreateDeviceId, requestNotificationPermission, setNotificationPreference } from '@/lib/notifications';

export default function JoinSessionPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const { sessions, registerPlayerForSession, getCurrentSession, getSession } = useClub();
  const { toast } = useToast();
  const router = useRouter();
  
  const [playerName, setPlayerName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    const sessionId = params.sessionId as string;
    const sessionData = getSession(sessionId);

    if (!sessionData) {
      setError('Session not found or has ended');
    } else if (!sessionData.is_active) {
      setError('This session has ended');
    } else {
      setSession(sessionData);
    }

    // Get or create device ID
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    // Check if already registered
    const alreadyRegistered = sessionData?.registeredPlayers?.find((p: any) => p.deviceId === id);
    if (alreadyRegistered) {
      toast({ title: 'Already registered', description: 'You are already registered for this session' });
      router.push('/');
    }
  }, [params.sessionId, getSession, router, toast]);

  const handleRegister = async () => {
    if (!playerName.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Request notification permission if enabled
      if (notificationsEnabled) {
        const granted = await requestNotificationPermission();
        if (granted) {
          setNotificationPreference(true);
        }
      }

      // Register player for session
      const sessionId = params.sessionId as string;
      registerPlayerForSession(sessionId, deviceId, playerName);

      // Save registration to localStorage
      localStorage.setItem('tbc_player_name', playerName);
      localStorage.setItem('tbc_current_session_id', sessionId);

      toast({ 
        title: 'Registration successful!',
        description: `Device ID: ${deviceId}`
      });

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      toast({ title: 'Registration failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-2 border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-destructive">Session Not Found</h2>
                <p className="text-sm text-muted-foreground font-bold uppercase mt-2">{error}</p>
              </div>
              <Button onClick={() => router.push('/')} variant="outline">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-2">
        <CardHeader className="text-center pb-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Join Session</CardTitle>
          <CardDescription className="text-xs font-bold uppercase">
            {session?.name || 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Your Name</Label>
              <Input 
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="font-bold h-12"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center space-x-3 p-4 bg-secondary/20 rounded-xl border-2">
              <Checkbox 
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={(checked) => setNotificationsEnabled(checked as boolean)}
                disabled={isSubmitting}
                className="h-5 w-5"
              />
              <div className="flex-1">
                <Label htmlFor="notifications" className="font-black text-sm cursor-pointer flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Enable Turn Notifications
                </Label>
                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">
                  Get notified when it's your turn to play
                </p>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/20 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <User className="h-3 w-3" />
                Device ID
              </div>
              <p className="text-xs font-mono font-bold tracking-wider">{deviceId}</p>
            </div>
          </div>

          <Button 
            onClick={handleRegister}
            disabled={isSubmitting || !playerName.trim()}
            className="w-full font-black uppercase h-12 text-base"
          >
            {isSubmitting ? 'Registering...' : 'Join Session'}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground font-bold uppercase">
            By joining, you'll be added to the player roster
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
