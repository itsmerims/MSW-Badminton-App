'use client';

import { useState, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshCcw, Trash2, QrCode, Upload, Loader2, Sun, Moon, Palette, Settings as SettingsIcon, Trophy, Zap, Share2, Calendar, Check, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const {
    players, paymentMethods, addPaymentMethod, deletePaymentMethod, resetDailyBoard,
    wipeAllData, defaultWinningScore, setDefaultWinningScore,
    autoAdvanceEnabled, setAutoAdvanceEnabled, currentSession, endSession,
    sessions, refreshSessionsFromSupabase
  } = useClub();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newMethodName, setNewMethodName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [copiedSessionLink, setCopiedSessionLink] = useState(false);
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);

  const processAndUpload = (file: File, callback: (data: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedData = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedData);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      processAndUpload(e.target.files[0], async (data) => {
        await addPaymentMethod(newMethodName || 'Unnamed QR', data);
        setNewMethodName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploading(false);
        toast({ title: "QR Method Added" });
      });
    }
  };

  const triggerFileUpload = () => {
    if (!newMethodName) {
      toast({ title: "Name required", description: "Enter a name before uploading.", variant: "destructive" });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleResetAction = () => {
    resetDailyBoard();
    toast({ title: "Daily Board Reset" });
  };

  const handleWipeAction = () => {
    if (typeof window !== 'undefined' && window.confirm("Delete EVERYTHING? This cannot be undone.")) {
      wipeAllData();
      toast({ title: "All data wiped" });
    }
  };

  const handleCopySessionLink = () => {
    if (!currentSession) return;
    const link = `${window.location.origin}/join/${currentSession.id}`;
    navigator.clipboard.writeText(link);
    setCopiedSessionLink(true);
    toast({ title: 'Link copied to clipboard' });
    setTimeout(() => setCopiedSessionLink(false), 2000);
  };

  const handleEndSession = () => {
    if (!currentSession) return;
    if (window.confirm('Are you sure you want to end this session? This will clear all players, matches, and courts.')) {
      endSession(currentSession.id);
      toast({ title: 'Session ended' });
      router.push('/session');
    }
  };

  const handleEnterSession = (sessionId: string) => {
    localStorage.setItem('tbc_current_session_id', sessionId);
    toast({ title: 'Session entered', description: 'You are now in this session' });
    router.push('/');
  };

  const handleRefreshSessions = async () => {
    setIsRefreshingSessions(true);
    await refreshSessionsFromSupabase();
    setIsRefreshingSessions(false);
    toast({ title: 'Sessions refreshed successfully' });
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-24 max-w-5xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">System configuration</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Palette className="h-4 w-4" /> Appearance
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Customize the theme.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Dark Mode</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Toggle visual style</p>
                  </div>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Gameplay Rules
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Define scoring & match behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Default Winning Score</Label>
                <Input
                  type="number"
                  value={defaultWinningScore}
                  onChange={(e) => setDefaultWinningScore(parseInt(e.target.value) || 21)}
                  className="font-black text-lg h-12"
                />
                <p className="text-[9px] text-muted-foreground uppercase font-bold">This score is automatically applied when marking a winner.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Zap className="h-5 w-5 fill-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase">Auto-Advance Matches</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Automatically move queue to next court</p>
                  </div>
                </div>
                <Switch
                  checked={autoAdvanceEnabled}
                  onCheckedChange={setAutoAdvanceEnabled}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Session
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleRefreshSessions}
                  disabled={isRefreshingSessions}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshingSessions ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Current active session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentSession ? (
                <>
                  <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase text-muted-foreground">Session Name</p>
                        <p className="text-sm font-black">{currentSession.name}</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase text-muted-foreground">Players</p>
                        <p className="text-sm font-black">{players.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={handleCopySessionLink}
                      className="w-full font-black uppercase text-[10px] tracking-widest h-10 gap-2"
                      variant="outline"
                    >
                      {copiedSessionLink ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" /> Copied!
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4" /> Share Link
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleEndSession}
                      className="w-full font-black uppercase text-[10px] tracking-widest h-10"
                      variant="destructive"
                    >
                      End Session
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-black uppercase opacity-40">No active session</p>
                  <p className="text-xs font-bold uppercase mt-1 opacity-30">Create a session to get started</p>
                  <Button
                    onClick={() => router.push('/sessions')}
                    className="mt-4 font-black uppercase text-[10px] tracking-widest h-10"
                    variant="outline"
                  >
                    Go to Sessions
                  </Button>
                </div>
              )}

              {/* All Sessions List */}
              {sessions.filter(s => s.is_active).length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-3">All Active Sessions</p>
                  <div className="space-y-2">
                    {sessions.filter(s => s.is_active).map(session => (
                      <div
                        key={session.id}
                        className={cn(
                          "p-3 rounded-lg border-2 cursor-pointer transition-all",
                          currentSession?.id === session.id
                            ? "bg-primary/10 border-primary"
                            : "bg-secondary/10 border-secondary/30 hover:border-primary/50"
                        )}
                        onClick={() => handleEnterSession(session.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-black uppercase">{session.name}</p>
                            <p className="text-[9px] text-muted-foreground font-bold">
                              {currentSession?.id === session.id ? players.length : session.registeredPlayers?.length || 0} players
                            </p>
                          </div>
                          {currentSession?.id === session.id && (
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <QrCode className="h-4 w-4" /> QR Payments
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Manage payment codes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-60">Account Name</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. GCash" 
                    value={newMethodName} 
                    onChange={e => setNewMethodName(e.target.value)}
                    className="font-bold text-xs"
                  />
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  <Button size="icon" onClick={triggerFileUpload} disabled={isUploading} className="shrink-0">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {paymentMethods.map(method => (
                    <div key={method.id} className="relative group border-2 rounded-xl p-2 bg-secondary/10 flex flex-col items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 hover:bg-destructive hover:text-white"
                        onClick={() => deletePaymentMethod(method.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="relative h-20 w-full border bg-white rounded-lg overflow-hidden mb-1 shadow-inner">
                        <Image src={method.imageUrl} alt={method.name} fill className="object-contain p-1" />
                      </div>
                      <span className="font-black text-[9px] uppercase truncate w-full text-center">{method.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>

      <Card className="border-2 shadow-sm bg-destructive/5 border-destructive/20">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:flex sm:gap-3 sm:space-y-0">
          <Button onClick={handleResetAction} variant="outline" className="w-full font-black uppercase text-[10px] border-destructive/20 text-destructive hover:bg-destructive/10">
            <RefreshCcw className="h-3 w-3 mr-2" /> Reset Daily Board
          </Button>
          <Button onClick={handleWipeAction} variant="destructive" className="w-full font-black uppercase text-[10px]">
            <Trash2 className="h-3 w-3 mr-2" /> Wipe All Club Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
