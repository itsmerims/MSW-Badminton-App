'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Plus, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { Tournament, TournamentMatch, generateBracket, generateRoundRobin, getBracketRounds, advanceWinner, isTournamentComplete, getTournamentWinner } from '@/lib/tournament';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function TournamentPage() {
  const { sessionId } = useParams();
  const { players } = useClub();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentType, setTournamentType] = useState<'bracket' | 'round-robin'>('bracket');
  const [matchType, setMatchType] = useState<'singles' | 'doubles'>('singles');

  const handleCreateTournament = () => {
    const playerIds = players.map(p => p.id);
    const matches = tournamentType === 'bracket' 
      ? generateBracket(playerIds, matchType)
      : generateRoundRobin(playerIds, matchType);

    setTournament({
      id: `tournament-${Date.now()}`,
      name: `${tournamentType === 'bracket' ? 'Bracket' : 'Round Robin'} Tournament (${matchType})`,
      type: tournamentType,
      matchType,
      players: playerIds,
      matches,
      status: 'draft',
      createdAt: Date.now(),
    });
  };

  const handleStartMatch = (matchId: string) => {
    if (!tournament) return;
    const updatedMatches = tournament.matches.map(m => 
      m.id === matchId ? { ...m } : m
    );
    setTournament({ ...tournament, matches: updatedMatches, status: 'in-progress' });
  };

  const handleSetWinner = (matchId: string, winner: 'team1' | 'team2') => {
    if (!tournament) return;
    const updatedMatches = advanceWinner(tournament.matches, matchId, winner);
    const isComplete = isTournamentComplete(updatedMatches);
    setTournament({ 
      ...tournament, 
      matches: updatedMatches, 
      status: isComplete ? 'completed' : 'in-progress' 
    });
  };

  const getPlayerName = (playerIds: string[]) => {
    return playerIds.map(id => players.find(p => p.id === id)?.name || 'Unknown').join(', ');
  };

  const rounds = tournament ? getBracketRounds(tournament.matches) : [];
  const winner = tournament ? getTournamentWinner(tournament.matches) : null;
  
  // Calculate current round
  const currentRound = tournament && tournament.matches.length > 0 
    ? Math.max(...tournament.matches.filter(m => m.winner !== null).map(m => m.round))
    : 0;
  
  // Check if current round is complete
  const currentRoundMatches = tournament?.matches.filter(m => m.round === currentRound) || [];
  const isRoundComplete = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.winner !== null);
  
  const handleCompleteRound = () => {
    if (!tournament) return;
    // Scroll to next round
    const nextRound = currentRound + 1;
    const nextRoundElement = document.getElementById(`round-${nextRound}`);
    if (nextRoundElement) {
      nextRoundElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    toast({ title: 'Round completed - winners advanced to next round' });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <header className="space-y-2 mb-6">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" /> Tournament
        </h1>
        <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">
          Create and manage tournaments
        </p>
      </header>

      {!tournament ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase tracking-tight">
              Create New Tournament
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider">Tournament Type</label>
              <div className="flex gap-3">
                <Button
                  variant={tournamentType === 'bracket' ? 'default' : 'outline'}
                  onClick={() => setTournamentType('bracket')}
                  className="flex-1 h-12 font-black uppercase text-sm"
                >
                  Single Elimination Bracket
                </Button>
                <Button
                  variant={tournamentType === 'round-robin' ? 'default' : 'outline'}
                  onClick={() => setTournamentType('round-robin')}
                  className="flex-1 h-12 font-black uppercase text-sm"
                >
                  Round Robin
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider">Match Type</label>
              <div className="flex gap-3">
                <Button
                  variant={matchType === 'singles' ? 'default' : 'outline'}
                  onClick={() => setMatchType('singles')}
                  className="flex-1 h-12 font-black uppercase text-sm"
                >
                  Singles (1v1)
                </Button>
                <Button
                  variant={matchType === 'doubles' ? 'default' : 'outline'}
                  onClick={() => setMatchType('doubles')}
                  className="flex-1 h-12 font-black uppercase text-sm"
                >
                  Doubles (2v2)
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider">Participants</label>
              <div className="p-4 bg-secondary/20 rounded-lg border-2">
                <p className="text-2xl font-black">{players.length}</p>
                <p className="text-xs text-muted-foreground font-bold uppercase">Players Available</p>
                {matchType === 'doubles' && (
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">
                    {Math.floor(players.length / 2)} teams (need even number for doubles)
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleCreateTournament}
              disabled={players.length < 2 || (matchType === 'doubles' && players.length < 4)}
              className="w-full h-12 font-black uppercase text-sm gap-2"
            >
              <Plus className="h-4 w-4" /> Create Tournament
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Tournament Header */}
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase">{tournament.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] font-black uppercase h-5">
                    {tournament.type === 'bracket' ? 'Bracket' : 'Round Robin'}
                  </Badge>
                  <Badge 
                    variant={tournament.status === 'completed' ? 'default' : 'secondary'} 
                    className="text-[10px] font-black uppercase h-5"
                  >
                    {tournament.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {tournament.type === 'bracket' && tournament.status !== 'completed' && isRoundComplete && (
                  <Button
                    onClick={handleCompleteRound}
                    className="font-black uppercase text-xs gap-2"
                    variant="default"
                  >
                    <CheckCircle className="h-4 w-4" /> Complete Round
                  </Button>
                )}
                {winner && (
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-black uppercase">Winner: {getPlayerName(winner)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bracket Display */}
          {tournament.type === 'bracket' && (
            <div className="flex gap-6 overflow-x-auto pb-4">
              {rounds.map((roundData) => (
                <div key={roundData.round} id={`round-${roundData.round}`} className="flex-shrink-0 space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {roundData.round === rounds.length ? 'Final' : roundData.round === rounds.length - 1 ? 'Semifinals' : `Round ${roundData.round}`}
                    </h3>
                  </div>
                  {roundData.matches.map((match) => (
                    <Card 
                      key={match.id} 
                      className={cn(
                        "w-48 border-2 transition-all",
                        match.winner ? 'bg-primary/5' : 'bg-card'
                      )}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="space-y-1">
                          <div 
                            className={cn(
                              "text-xs font-black p-2 rounded flex items-center justify-between",
                              match.winner === 'team1' ? 'bg-primary text-white' : 'bg-secondary/30'
                            )}
                          >
                            <span className="truncate flex-1">{getPlayerName(match.team1)}</span>
                            {match.winner === 'team1' && <CheckCircle className="h-3 w-3 flex-shrink-0" />}
                          </div>
                          <div 
                            className={cn(
                              "text-xs font-black p-2 rounded flex items-center justify-between",
                              match.winner === 'team2' ? 'bg-primary text-white' : 'bg-secondary/30'
                            )}
                          >
                            <span className="truncate flex-1">{getPlayerName(match.team2)}</span>
                            {match.winner === 'team2' && <CheckCircle className="h-3 w-3 flex-shrink-0" />}
                          </div>
                        </div>
                        {!match.winner && match.team1.length > 0 && match.team2.length > 0 && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetWinner(match.id, 'team1')}
                              className="flex-1 h-7 text-[10px] font-black uppercase"
                            >
                              T1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetWinner(match.id, 'team2')}
                              className="flex-1 h-7 text-[10px] font-black uppercase"
                            >
                              T2
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Round Robin Display */}
          {tournament.type === 'round-robin' && (
            <div className="space-y-4">
              {rounds.map((roundData) => (
                <Card key={roundData.round}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">
                      Round {roundData.round}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {roundData.matches.map((match) => (
                      <div 
                        key={match.id} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border-2",
                          match.winner ? 'bg-primary/5' : 'bg-secondary/30'
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span 
                            className={cn(
                              "text-xs font-black flex-1",
                              match.winner === 'team1' ? 'text-primary' : ''
                            )}
                          >
                            {getPlayerName(match.team1)}
                          </span>
                          <span className="text-xs font-black text-muted-foreground">vs</span>
                          <span 
                            className={cn(
                              "text-xs font-black flex-1 text-right",
                              match.winner === 'team2' ? 'text-primary' : ''
                            )}
                          >
                            {getPlayerName(match.team2)}
                          </span>
                        </div>
                        {!match.winner && (
                          <div className="flex gap-1 ml-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetWinner(match.id, 'team1')}
                              className="h-7 text-[10px] font-black uppercase"
                            >
                              T1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetWinner(match.id, 'team2')}
                              className="h-7 text-[10px] font-black uppercase"
                            >
                              T2
                            </Button>
                          </div>
                        )}
                        {match.winner && (
                          <Badge className="ml-3 text-[10px] font-black uppercase h-5">
                            {match.winner === 'team1' ? 'T1' : 'T2'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
