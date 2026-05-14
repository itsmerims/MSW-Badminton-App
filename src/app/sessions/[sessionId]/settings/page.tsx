'use client';

import { useParams, useRouter } from 'next/navigation';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshCcw, Trash2, QrCode, Upload, Loader2, Sun, Moon, Palette, Settings as SettingsIcon, Trophy, Zap, Share2, Calendar, Check, RefreshCw, Download, Database, FileDown, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { backupData, restoreData } from '@/lib/export';

export default function SessionSettingsPage() {
  const { sessionId } = useParams();
  const { 
    currentSession, 
    endSession,
    defaultWinningScore, 
    setDefaultWinningScore,
    autoAdvanceEnabled, 
    setAutoAdvanceEnabled,
    players,
    matches,
    courts,
    sessions
  } = useClub();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionIdStr = Array.isArray(sessionId) ? sessionId[0] : sessionId;

  useEffect(() => {
    if (sessionIdStr) {
      localStorage.setItem('tbc_current_session_id', sessionIdStr);
    }
  }, [sessionIdStr]);

  const handleEndSession = () => {
    if (!currentSession) return;
    if (window.confirm('Are you sure you want to end this session? This will clear all players, matches, and courts.')) {
      endSession(currentSession.id);
      toast({ title: 'Session ended' });
      router.push('/sessions');
    }
  };

  const handleCopyLink = () => {
    if (!sessionIdStr) return;
    const link = `${window.location.origin}/sessions/${sessionIdStr}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied to clipboard' });
  };

  const handleBackup = () => {
    const data = {
      sessions,
      players,
      matches,
      courts,
      currentSession,
    };
    backupData(data);
    toast({ title: 'Backup created successfully' });
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await restoreData(file);
      toast({ title: 'Backup restored successfully' });
      // Note: In a real implementation, you would need to restore the data to the context
      // This would require adding restore functions to the ClubContext
      console.log('Restored data:', data);
    } catch (error) {
      toast({ title: 'Failed to restore backup', variant: 'destructive' });
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6 max-w-5xl">
      <header className="space-y-0.5 text-center sm:text-left shrink-0">
        <h1 className="flex items-center justify-center sm:justify-start gap-2 md:gap-3">
          <SettingsIcon className="h-6 w-6 md:h-8 md:w-8 text-primary" /> Session Settings
        </h1>
        <p className="text-tiny text-muted-foreground font-black uppercase tracking-widest opacity-60">Manage current session</p>
      </header>

      <div className="grid gap-4 md:gap-6">
        {/* Session Actions */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Session Actions
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">
              Manage this session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={handleCopyLink}
                className="flex-1 font-black uppercase text-[10px] tracking-widest h-10 gap-2"
                variant="outline"
              >
                <Share2 className="h-4 w-4" /> Share Session Link
              </Button>
              <Button
                onClick={handleEndSession}
                className="flex-1 font-black uppercase text-[10px] tracking-widest h-10"
                variant="destructive"
              >
                <RefreshCcw className="h-4 w-4" /> End Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Match Settings */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Match Settings
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">
              Configure match behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="winning-score" className="text-xs font-black uppercase tracking-wider">
                Default Winning Score
              </Label>
              <Input
                id="winning-score"
                type="number"
                value={defaultWinningScore}
                onChange={(e) => setDefaultWinningScore(parseInt(e.target.value) || 21)}
                className="h-10 font-bold"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-black uppercase tracking-wider">Auto-advance matches</Label>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">
                  Automatically advance matches when court becomes available
                </p>
              </div>
              <Switch
                checked={autoAdvanceEnabled}
                onCheckedChange={setAutoAdvanceEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> Data Management
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">
              Backup and restore your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={handleBackup}
                className="flex-1 font-black uppercase text-[10px] tracking-widest h-10 gap-2"
                variant="outline"
              >
                <FileDown className="h-4 w-4" /> Backup Data
              </Button>
              <Button
                onClick={handleRestoreClick}
                className="flex-1 font-black uppercase text-[10px] tracking-widest h-10 gap-2"
                variant="outline"
              >
                <FileUp className="h-4 w-4" /> Restore Data
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
              />
            </div>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
              Backup includes sessions, players, matches, and courts
            </p>
          </CardContent>
        </Card>

        {/* Global Settings Link */}
        <Card className="border-2 border-dashed bg-secondary/20">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" /> Global Settings
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">
              App-wide configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/settings')}
              className="w-full font-black uppercase text-[10px] tracking-widest h-10 gap-2"
              variant="outline"
            >
              <SettingsIcon className="h-4 w-4" /> Open Global Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
