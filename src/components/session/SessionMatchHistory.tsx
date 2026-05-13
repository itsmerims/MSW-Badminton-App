'use client';

import { Match, Player, SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SessionMatchHistoryProps {
  matches: Match[];
  players: Player[];
  sessionId: string;
}

export function SessionMatchHistory({ matches, players, sessionId }: SessionMatchHistoryProps) {
  // Filter matches for this session
  const sessionMatches = matches.filter(m => m.sessionId === sessionId);

  // Sort by timestamp descending (newest first)
  const sortedMatches = sessionMatches.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedMatches.length === 0) {
    return (
      <Card className="border-2 border-dashed bg-secondary/5">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-bold text-muted-foreground">No matches played yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Matches played in this session will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="border-b bg-card">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Match History
          <Badge variant="secondary" className="ml-auto">{sortedMatches.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-3">
            {sortedMatches.map((match) => {
              const teamAPlayers = match.teamASnapshots || match.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
              const teamBPlayers = match.teamBSnapshots || match.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
              
              const winner = match.winner;
              const teamAWon = winner === 'teamA';
              const teamBWon = winner === 'teamB';

              return (
                <Card key={match.id} className="border-2 bg-card overflow-hidden">
                  <div className="p-3 space-y-3">
                    {/* Match Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(match.timestamp), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2">
                        {match.startTime && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(match.startTime), 'HH:mm')}
                          </div>
                        )}
                        <Badge 
                          variant={match.status === 'completed' ? 'default' : match.status === 'cancelled' ? 'destructive' : 'secondary'}
                          className="text-[9px] font-black uppercase h-5 px-2"
                        >
                          {match.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Match Score */}
                    {(match.teamAScore !== undefined && match.teamBScore !== undefined) && (
                      <div className="flex items-center justify-center gap-4 py-2 bg-secondary/20 rounded-lg">
                        <div className={cn(
                          "text-2xl font-black",
                          teamAWon ? "text-primary" : "text-muted-foreground"
                        )}>
                          {match.teamAScore}
                        </div>
                        <div className="text-sm font-bold text-muted-foreground">-</div>
                        <div className={cn(
                          "text-2xl font-black",
                          teamBWon ? "text-primary" : "text-muted-foreground"
                        )}>
                          {match.teamBScore}
                        </div>
                      </div>
                    )}

                    {/* Teams */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Team A */}
                      <div className={cn(
                        "space-y-1.5 p-2 rounded-lg border-l-2",
                        teamAWon ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-secondary/10"
                      )}>
                        <p className="text-[10px] font-black uppercase text-muted-foreground/60">Team 1</p>
                        {teamAPlayers.map((player: any) => (
                          <div key={player.id} className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold truncate">{player.name}</span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-[8px] h-4 px-1 shrink-0", getSkillColor(player.skillLevel))}
                            >
                              {SKILL_LEVELS_SHORT[player.skillLevel]}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {/* Team B */}
                      <div className={cn(
                        "space-y-1.5 p-2 rounded-lg border-r-2",
                        teamBWon ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-secondary/10"
                      )}>
                        <p className="text-[10px] font-black uppercase text-muted-foreground/60 text-right">Team 2</p>
                        {teamBPlayers.map((player: any) => (
                          <div key={player.id} className="flex items-center justify-between gap-2">
                            <Badge 
                              variant="outline" 
                              className={cn("text-[8px] h-4 px-1 shrink-0", getSkillColor(player.skillLevel))}
                            >
                              {SKILL_LEVELS_SHORT[player.skillLevel]}
                            </Badge>
                            <span className="text-xs font-bold truncate text-right">{player.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Winner Badge */}
                    {winner && (
                      <div className="flex justify-center">
                        <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase px-3 py-1">
                          <Trophy className="h-3 w-3 mr-1" /> {winner === 'teamA' ? 'Team 1' : 'Team 2'} Wins
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
