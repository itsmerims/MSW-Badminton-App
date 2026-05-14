'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getSkillColor, SKILL_LEVELS_SHORT } from '@/lib/types';
import { Swords, Clock, Trophy } from 'lucide-react';

export default function LiveScorePage() {
  const { sessionId } = useParams();
  const { matches, players, courts } = useClub();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeMatches = matches.filter(m => m.status === 'in-progress');
  const getPlayerName = (playerId: string) => players.find(p => p.id === playerId)?.name || 'Unknown';
  const getPlayerSkill = (playerId: string) => players.find(p => p.id === playerId)?.skillLevel || 3;
  const getCourtName = (courtId: string) => courts.find(c => c.id === courtId)?.name || 'Unknown';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-white uppercase tracking-wider mb-4">Live Scores</h1>
          <div className="flex items-center justify-center gap-8 text-white/60">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6" />
              <span className="text-2xl font-bold">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="text-2xl font-bold">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Active Matches */}
        {activeMatches.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur border-2 border-white/20">
            <CardContent className="p-16 text-center">
              <Swords className="h-24 w-24 mx-auto text-white/40 mb-6" />
              <h2 className="text-4xl font-black text-white/60 uppercase tracking-wider">
                No Active Matches
              </h2>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {activeMatches.map((match) => (
              <Card 
                key={match.id} 
                className="bg-white/10 backdrop-blur border-2 border-white/20 overflow-hidden"
              >
                <CardContent className="p-8">
                  {/* Court Name */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-primary/20 px-6 py-3 rounded-full">
                      <Swords className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-black text-primary uppercase">
                        {getCourtName(match.courtId || '')}
                      </span>
                    </div>
                  </div>

                  {/* Match Display */}
                  <div className="space-y-6">
                    {/* Team A */}
                    <div className={cn(
                      "p-6 rounded-2xl transition-all",
                      match.winner === 'teamA' ? 'bg-primary/30 border-2 border-primary' : 'bg-white/5'
                    )}>
                      <div className="space-y-3">
                        {match.teamA.map((playerId) => (
                          <div key={playerId} className="flex items-center justify-between">
                            <span className="text-3xl font-black text-white">
                              {getPlayerName(playerId)}
                            </span>
                            <span className={cn("text-lg font-black px-3 py-1 rounded-full", getSkillColor(getPlayerSkill(playerId)))}>
                              {SKILL_LEVELS_SHORT[getPlayerSkill(playerId)]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-4xl font-black text-white/40">VS</div>
                      {match.teamAScore !== undefined && match.teamBScore !== undefined && (
                        <div className="flex items-center gap-4 bg-white/10 px-8 py-4 rounded-xl">
                          <div className={cn(
                            "text-6xl font-black",
                            match.winner === 'teamA' ? 'text-primary' : 'text-white'
                          )}>
                            {match.teamAScore}
                          </div>
                          <div className="text-4xl font-black text-white/40">-</div>
                          <div className={cn(
                            "text-6xl font-black",
                            match.winner === 'teamB' ? 'text-primary' : 'text-white'
                          )}>
                            {match.teamBScore}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Team B */}
                    <div className={cn(
                      "p-6 rounded-2xl transition-all",
                      match.winner === 'teamB' ? 'bg-primary/30 border-2 border-primary' : 'bg-white/5'
                    )}>
                      <div className="space-y-3">
                        {match.teamB.map((playerId) => (
                          <div key={playerId} className="flex items-center justify-between">
                            <span className="text-3xl font-black text-white">
                              {getPlayerName(playerId)}
                            </span>
                            <span className={cn("text-lg font-black px-3 py-1 rounded-full", getSkillColor(getPlayerSkill(playerId)))}>
                              {SKILL_LEVELS_SHORT[getPlayerSkill(playerId)]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Match Duration */}
                  {match.startTime && (
                    <div className="mt-6 text-center">
                      <div className="inline-flex items-center gap-2 text-white/40">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-bold uppercase">
                          Duration: {Math.floor((Date.now() - new Date(match.startTime).getTime()) / 60000)} min
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Queue Info */}
        <div className="mt-12 text-center">
          <Card className="bg-white/5 backdrop-blur border border-white/10 inline-block">
            <CardContent className="p-6">
              <div className="flex items-center gap-8 text-white/60">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <span className="text-lg font-bold uppercase">
                    {activeMatches.length} Active Matches
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  <span className="text-lg font-bold uppercase">
                    {players.filter(p => p.status === 'playing').length} Players Playing
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
