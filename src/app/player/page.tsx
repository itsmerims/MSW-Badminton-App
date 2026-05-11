'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PlayerPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [sessionInput, setSessionInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoinSession = () => {
    if (!sessionInput.trim()) {
      toast({ title: 'Session ID or link required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    // Extract session ID from full link or use raw input
    let sessionId = sessionInput.trim();
    
    // If it's a full URL, extract the session ID
    if (sessionId.includes('/join/')) {
      const parts = sessionId.split('/join/');
      sessionId = parts[parts.length - 1];
    }

    // Remove any trailing slashes or query parameters
    sessionId = sessionId.split('/')[0].split('?')[0];

    // Redirect to join page
    router.push(`/join/${sessionId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-2">
        <CardHeader className="text-center pb-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Player Portal</CardTitle>
          <CardDescription className="text-xs font-bold uppercase">
            Enter session details to join
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Session ID or Link</Label>
              <Input 
                placeholder="e.g. abc123 or https://example.com/join/abc123"
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                className="font-bold h-12"
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinSession();
                }}
              />
            </div>

            <div className="p-4 bg-secondary/20 rounded-xl border-2 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <LinkIcon className="h-3 w-3" />
                Supported Formats
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="font-bold">• Raw Session ID: <span className="font-mono">abc123</span></li>
                <li className="font-bold">• Full Link: <span className="font-mono">/join/abc123</span></li>
              </ul>
            </div>
          </div>

          <Button 
            onClick={handleJoinSession}
            disabled={isSubmitting || !sessionInput.trim()}
            className="w-full font-black uppercase h-12 text-base gap-2"
          >
            {isSubmitting ? 'Joining...' : (
              <>
                Join Session
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground font-bold uppercase">
            Ask your queue master for the session link
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
