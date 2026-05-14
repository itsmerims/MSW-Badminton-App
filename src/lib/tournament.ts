export interface TournamentMatch {
  id: string;
  team1: string[];
  team2: string[];
  winner: 'team1' | 'team2' | null;
  team1Score?: number;
  team2Score?: number;
  round: number;
  matchIndex: number;
  matchType: 'singles' | 'doubles';
}

export interface Tournament {
  id: string;
  name: string;
  type: 'bracket' | 'round-robin';
  matchType: 'singles' | 'doubles';
  players: string[];
  matches: TournamentMatch[];
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: number;
}

export interface BracketRound {
  round: number;
  matches: TournamentMatch[];
}

// Generate unique ID
const generateId = () => `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Generate tournament bracket for single elimination
export const generateBracket = (playerIds: string[], matchType: 'singles' | 'doubles' = 'singles'): TournamentMatch[] => {
  const matches: TournamentMatch[] = [];
  const numPlayers = playerIds.length;
  
  // For doubles, we need to pair players into teams
  let teams: string[][];
  if (matchType === 'doubles') {
    teams = [];
    for (let i = 0; i < playerIds.length; i += 2) {
      if (i + 1 < playerIds.length) {
        teams.push([playerIds[i], playerIds[i + 1]]);
      } else {
        teams.push([playerIds[i]]); // Odd player gets paired with a placeholder
      }
    }
  } else {
    teams = playerIds.map(id => [id]);
  }
  
  // Find next power of 2
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(teams.length)));
  const numByes = nextPowerOf2 - teams.length;
  
  // Create first round matches
  const firstRoundMatches: TournamentMatch[] = [];
  
  // Handle byes - top teams get byes
  const teamsWithByes = teams.slice(0, numByes);
  const teamsWithoutByes = teams.slice(numByes);
  
  // Pair up teams without byes
  for (let i = 0; i < teamsWithoutByes.length; i += 2) {
    if (i + 1 < teamsWithoutByes.length) {
      firstRoundMatches.push({
        id: generateId(),
        team1: teamsWithoutByes[i],
        team2: teamsWithoutByes[i + 1],
        winner: null,
        round: 1,
        matchIndex: matches.length,
        matchType,
      });
    }
  }
  
  matches.push(...firstRoundMatches);
  
  // Calculate total rounds
  const totalRounds = Math.log2(nextPowerOf2);
  
  // Generate subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round + 1) / 2;
    
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: generateId(),
        team1: [],
        team2: [],
        winner: null,
        round,
        matchIndex: matches.length,
        matchType,
      });
    }
  }
  
  return matches;
};

// Generate round-robin schedule
export const generateRoundRobin = (playerIds: string[], matchType: 'singles' | 'doubles' = 'singles'): TournamentMatch[] => {
  const matches: TournamentMatch[] = [];
  const numPlayers = playerIds.length;
  
  if (numPlayers < 2) return matches;
  
  // For doubles, we need to pair players into teams
  let teams: string[][];
  if (matchType === 'doubles') {
    teams = [];
    for (let i = 0; i < playerIds.length; i += 2) {
      if (i + 1 < playerIds.length) {
        teams.push([playerIds[i], playerIds[i + 1]]);
      } else {
        teams.push([playerIds[i]]); // Odd player gets paired with a placeholder
      }
    }
  } else {
    teams = playerIds.map(id => [id]);
  }
  
  // Round-robin algorithm
  const teamIds = teams.map((team, idx) => `team-${idx}`);
  if (teamIds.length % 2 !== 0) {
    teamIds.push('bye'); // Add dummy team for odd number of teams
  }
  
  const totalRounds = teamIds.length - 1;
  const half = teamIds.length / 2;
  
  for (let round = 1; round <= totalRounds; round++) {
    for (let i = 0; i < half; i++) {
      const team1Idx = parseInt(teamIds[i].replace('team-', ''));
      const team2Idx = parseInt(teamIds[teamIds.length - 1 - i].replace('team-', ''));
      
      if (teamIds[i] !== 'bye' && teamIds[teamIds.length - 1 - i] !== 'bye') {
        matches.push({
          id: generateId(),
          team1: teams[team1Idx],
          team2: teams[team2Idx],
          winner: null,
          round,
          matchIndex: matches.length,
          matchType,
        });
      }
    }
    
    // Rotate teams (keep first team fixed)
    const last = teamIds.pop();
    if (last) {
      teamIds.splice(1, 0, last);
    }
  }
  
  return matches;
};

// Get bracket rounds for display
export const getBracketRounds = (matches: TournamentMatch[]): BracketRound[] => {
  const roundsMap: Record<number, TournamentMatch[]> = {};
  
  matches.forEach(match => {
    if (!roundsMap[match.round]) {
      roundsMap[match.round] = [];
    }
    roundsMap[match.round].push(match);
  });
  
  return Object.entries(roundsMap)
    .map(([round, matchList]) => ({
      round: parseInt(round),
      matches: matchList,
    }))
    .sort((a, b) => a.round - b.round);
};

// Advance winner to next round
export const advanceWinner = (matches: TournamentMatch[], matchId: string, winner: 'team1' | 'team2'): TournamentMatch[] => {
  const updatedMatches = [...matches];
  const matchIndex = updatedMatches.findIndex(m => m.id === matchId);
  
  if (matchIndex === -1) return updatedMatches;
  
  const match = updatedMatches[matchIndex];
  match.winner = winner;
  
  // Find next round match
  const nextRound = match.round + 1;
  const nextMatchIndex = Math.floor(match.matchIndex / 2);
  
  const nextMatch = updatedMatches.find(m => m.round === nextRound && m.matchIndex === nextMatchIndex);
  
  if (nextMatch) {
    const winningTeam = winner === 'team1' ? match.team1 : match.team2;
    if (matchIndex % 2 === 0) {
      nextMatch.team1 = winningTeam;
    } else {
      nextMatch.team2 = winningTeam;
    }
  }
  
  return updatedMatches;
};

// Check if tournament is complete
export const isTournamentComplete = (matches: TournamentMatch[]): boolean => {
  const finalRound = Math.max(...matches.map(m => m.round));
  const finalMatches = matches.filter(m => m.round === finalRound);
  return finalMatches.every(m => m.winner !== null);
};

// Get tournament winner
export const getTournamentWinner = (matches: TournamentMatch[]): string[] | null => {
  if (!isTournamentComplete(matches)) return null;
  
  const finalRound = Math.max(...matches.map(m => m.round));
  const finalMatch = matches.find(m => m.round === finalRound);
  
  if (!finalMatch || !finalMatch.winner) return null;
  
  return finalMatch.winner === 'team1' ? finalMatch.team1 : finalMatch.team2;
};
