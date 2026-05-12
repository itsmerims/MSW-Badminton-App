'use client';

import { useState } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Play, Users, Clock, Calendar, Check, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function SessionsPage() {
  const { sessions, currentSession, createSession, endSession } = useClub();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  const ongoingSessions = sessions.filter(s => s.status === 'active');

  const handleCreateSession = () => {
    if (!newSessionName.trim()) {
      toast({ title: 'Session name required', variant: 'destructive' });
      return;
    }
    
    const session = createSession(newSessionName);
    setNewSessionName('');
    setIsCreateDialogOpen(false);
    toast({ title: 'Session created successfully' });
    
    // Show share button for new session
    setCopiedSessionId(session.id);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  const handleCopyLink = (sessionId: string) => {
    const link = `${window.location.origin}/join/${sessionId}`;
    navigator.clipboard.writeText(link);
    setCopiedSessionId(sessionId);
    toast({ title: 'Link copied to clipboard' });
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  const handleEndSession = (sessionId: string) => {
    if (window.confirm('Are you sure you want to end this session?')) {
      endSession(sessionId);
      toast({ title: 'Session ended' });
    }
  };

  const handleEnterSession = (sessionId: string) => {
    localStorage.setItem('tbc_current_session_id', sessionId);
    toast({ title: 'Session entered', description: 'You are now in this session' });
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 max-w-5xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" /> Sessions
        </h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Manage badminton sessions</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create New Session Card */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Card className="border-2 border-dashed border-primary/40 hover:border-primary transition-all cursor-pointer bg-primary/5 min-h-[200px] flex flex-col items-center justify-center">
              <CardContent className="flex flex-col items-center justify-center space-y-3 py-8">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black uppercase tracking-tight">New Session</h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Create a new session</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase">Create New Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Session Name</Label>
                <Input 
                  placeholder="e.g. Saturday Morning Session"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="font-bold"
                />
              </div>
              <Button onClick={handleCreateSession} className="w-full font-black uppercase h-12">
                Create Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Ongoing Sessions */}
        {ongoingSessions.map(session => (
          <Card
            key={session.id}
            className="border-2 bg-card min-h-[200px] flex flex-col cursor-pointer hover:border-primary transition-all"
            onClick={() => handleEnterSession(session.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-black uppercase tracking-tight truncate">{session.name}</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase mt-1">
                    {formatDate(session.createdAt)} • {formatTime(session.createdAt)}
                  </CardDescription>
                </div>
                {currentSession?.id === session.id && (
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse ml-2 mt-1" />
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="font-black">{session.registeredPlayers?.length || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-black">Active</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink(session.id);
                  }}
                  className="w-full font-black uppercase text-[10px] tracking-widest h-10 gap-2"
                  variant="outline"
                >
                  {copiedSessionId === session.id ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" /> Share Link
                    </>
                  )}
                </Button>

                {currentSession?.id === session.id && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEndSession(session.id);
                    }}
                    className="w-full font-black uppercase text-[10px] tracking-widest h-10"
                    variant="destructive"
                  >
                    End Session
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {ongoingSessions.length === 0 && (
          <Card className="col-span-3 border-2 border-dashed bg-muted/20 min-h-[200px] flex items-center justify-center">
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-sm font-black uppercase text-muted-foreground opacity-40">No ongoing sessions</p>
              <p className="text-xs text-muted-foreground font-bold uppercase mt-1 opacity-30">Create a new session to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
