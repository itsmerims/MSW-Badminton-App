'use client';

import { useClub } from '@/context/ClubContext';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Users, Swords, Target, Sparkles, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSkillColor, SKILL_LEVELS_SHORT } from '@/lib/types';

export default function StatisticsPage() {
  const { sessionId } = useParams();
  const { matches, players, startMatch, courts } = useClub();

  // Calculate player statistics
  const playerStats = players.map(player => {
    const playerMatches = matches.filter(m => m.isCompleted && [...m.teamA, ...m.teamB].includes(player.id));
    const wins = playerMatches.filter(m => {
      if (m.winner === 'teamA' && m.teamA.includes(player.id)) return true;
      if (m.winner === 'teamB' && m.teamB.includes(player.id)) return true;
      return false;
    }).length;
    const winRate = playerMatches.length > 0 ? Math.round((wins / playerMatches.length) * 100) : 0;
    
    // Calculate partner history
    const partners: Record<string, number> = {};
    playerMatches.forEach(m => {
      const teammates = m.winner === 'teamA' 
        ? m.teamA.filter(id => id !== player.id)
        : m.teamB.filter(id => id !== player.id);
      teammates.forEach(teammateId => {
        partners[teammateId] = (partners[teammateId] || 0) + 1;
      });
    });

    return {
      ...player,
      totalMatches: playerMatches.length,
      wins,
      winRate,
      partners,
    };
  }).filter(p => p.totalMatches > 0);

  // Head-to-head history
  const getHeadToHead = (player1Id: string, player2Id: string) => {
    const matchesTogether = matches.filter(m => {
      const p1InA = m.teamA.includes(player1Id);
      const p1InB = m.teamB.includes(player1Id);
      const p2InA = m.teamA.includes(player2Id);
      const p2InB = m.teamB.includes(player2Id);
      
      // Check if they were opponents
      return (p1InA && p2InB) || (p1InB && p2InA);
    });

    const player1Wins = matchesTogether.filter(m => {
      if (m.winner === 'teamA' && m.teamA.includes(player1Id)) return true;
      if (m.winner === 'teamB' && m.teamB.includes(player1Id)) return true;
      return false;
    }).length;

    return {
      total: matchesTogether.length,
      player1Wins,
      player2Wins: matchesTogether.length - player1Wins,
    };
  };

  // Player pairing suggestions algorithm
  const getPairingSuggestions = () => {
    const availablePlayers = players.filter(p => p.status === 'available');
    if (availablePlayers.length < 4) return [];

    const suggestions = [];
    const usedPlayerIds = new Set<string>();

    for (let i = 0; i < availablePlayers.length - 3; i++) {
      if (usedPlayerIds.has(availablePlayers[i].id)) continue;

      for (let j = i + 1; j < availablePlayers.length - 2; j++) {
        if (usedPlayerIds.has(availablePlayers[j].id)) continue;

        for (let k = j + 1; k < availablePlayers.length - 1; k++) {
          if (usedPlayerIds.has(availablePlayers[k].id)) continue;

          for (let l = k + 1; l < availablePlayers.length; l++) {
            if (usedPlayerIds.has(availablePlayers[l].id)) continue;

            const teamA = [availablePlayers[i], availablePlayers[j]];
            const teamB = [availablePlayers[k], availablePlayers[l]];

            // Calculate skill balance
            const teamASkill = teamA.reduce((sum, p) => sum + p.skillLevel, 0) / 2;
            const teamBSkill = teamB.reduce((sum, p) => sum + p.skillLevel, 0) / 2;
            const skillDiff = Math.abs(teamASkill - teamBSkill);

            // Calculate partner chemistry (based on past partnerships)
            let chemistryScore = 0;
            teamA.forEach(p1 => {
              const stats = playerStats.find(s => s.id === p1.id);
              if (stats) {
                const partnerCount = stats.partners[teamA.find(p => p.id !== p1.id)?.id || ''] || 0;
                chemistryScore += partnerCount * 2;
              }
            });
            teamB.forEach(p1 => {
              const stats = playerStats.find(s => s.id === p1.id);
              if (stats) {
                const partnerCount = stats.partners[teamB.find(p => p.id !== p1.id)?.id || ''] || 0;
                chemistryScore += partnerCount * 2;
              }
            });

            // Calculate win rate potential
            const teamAWinRate = teamA.reduce((sum, p) => {
              const stats = playerStats.find(s => s.id === p.id);
              return sum + (stats?.winRate || 0);
            }, 0) / 2;
            const teamBWinRate = teamB.reduce((sum, p) => {
              const stats = playerStats.find(s => s.id === p.id);
              return sum + (stats?.winRate || 0);
            }, 0) / 2;

            // Overall score (lower skill diff is better, higher chemistry is better)
            const overallScore = (10 - skillDiff) + chemistryScore + (teamAWinRate + teamBWinRate) / 20;

            suggestions.push({
              teamA,
              teamB,
              skillDiff,
              chemistryScore,
              overallScore,
            });
          }
        }
      }
    }

    // Sort by overall score and return top suggestions
    return suggestions
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5);
  };

  const suggestions = getPairingSuggestions();

  const handleStartMatch = (suggestion: any) => {
    const availableCourt = courts.find(c => c.status === 'available');
    startMatch({
      teamA: suggestion.teamA.map(p => p.id),
      teamB: suggestion.teamB.map(p => p.id),
      courtId: availableCourt?.id,
    });
  };

  // Top players by win rate
  const topPlayers = [...playerStats].sort((a, b) => b.winRate - a.winRate).slice(0, 10);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-primary mb-2">Match Statistics</h1>
        <p className="text-muted-foreground">Player performance and match analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
            <Swords className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{matches.filter(m => m.isCompleted).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Players</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{playerStats.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {playerStats.length > 0 ? Math.round(playerStats.reduce((sum, p) => sum + p.winRate, 0) / playerStats.length) : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Win Rate</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{topPlayers[0]?.winRate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pairing Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Pairing Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Need at least 4 available players for suggestions</p>
            ) : (
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-secondary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary">#{index + 1}</Badge>
                        <span className="text-xs text-muted-foreground">Skill Diff: {suggestion.skillDiff.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">Chemistry: {suggestion.chemistryScore}</span>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleStartMatch(suggestion)}
                        className="h-7 text-xs font-black"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Start Match
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-black text-primary mb-2">TEAM A</div>
                        {suggestion.teamA.map(player => (
                          <div key={player.id} className="flex items-center gap-2 text-sm">
                            <span className="font-black truncate">{player.name}</span>
                            <Badge variant="outline" className={cn("text-[8px] h-4", getSkillColor(player.skillLevel))}>
                              {SKILL_LEVELS_SHORT[player.skillLevel]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="text-xs font-black text-primary mb-2">TEAM B</div>
                        {suggestion.teamB.map(player => (
                          <div key={player.id} className="flex items-center gap-2 text-sm">
                            <span className="font-black truncate">{player.name}</span>
                            <Badge variant="outline" className={cn("text-[8px] h-4", getSkillColor(player.skillLevel))}>
                              {SKILL_LEVELS_SHORT[player.skillLevel]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Head-to-Head */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" />
              Head-to-Head History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {players.slice(0, 10).map((player1, i) => (
                <div key={player1.id} className="space-y-2">
                  <div className="font-black text-sm">{player1.name}</div>
                  {players.slice(i + 1, i + 4).map(player2 => {
                    const h2h = getHeadToHead(player1.id, player2.id);
                    if (h2h.total === 0) return null;
                    return (
                      <div key={player2.id} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30">
                        <span className="text-muted-foreground">vs {player2.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn("font-black", h2h.player1Wins > h2h.player2Wins ? "text-primary" : "")}>{h2h.player1Wins}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className={cn("font-black", h2h.player2Wins > h2h.player1Wins ? "text-primary" : "")}>{h2h.player2Wins}</span>
                          <Badge variant="outline" className="ml-2 text-[8px] h-4">{h2h.total} matches</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Top Players by Win Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPlayers.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-sm", index === 0 ? "bg-primary text-white" : "bg-secondary")}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-black">{player.name}</div>
                    <Badge variant="outline" className={cn("text-[8px] h-4 mt-1", getSkillColor(player.skillLevel))}>
                      {SKILL_LEVELS_SHORT[player.skillLevel]}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-primary">{player.winRate}%</div>
                  <div className="text-xs text-muted-foreground">{player.wins}/{player.totalMatches} W</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
