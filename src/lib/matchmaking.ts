import { Player, Court } from './types';

export interface MatchResult {
  matchCreated: boolean;
  courtId?: string;
  courtName?: string;
  teamA?: string[];
  teamB?: string[];
  error?: string;
  analysis?: string;
  balanceScore?: number;
}

/**
 * Optimized Matchmaking Engine
 * 1. Expands selection pool to top 8-12 players
 * 2. Considers skill balance in selection
 * 3. Reduces partner penalties to 20 points (tie-breaker)
 * 4. Only penalizes partnerships from last 2 games
 * 5. Prioritizes skill gap minimization over partnership
 * 6. Provides balance score feedback
 */
export function generateDeterministicMatch(
  availablePlayers: Player[],
  availableCourts: Court[]
): MatchResult {
  if (availablePlayers.length < 4) {
    return { matchCreated: false, error: "Insufficient players available. Need at least 4." };
  }

  // Phase A: Expanded Selection Pool (top 8-12 players)
  const poolSize = Math.min(availablePlayers.length, 12);
  const selectedPool = [...availablePlayers]
    .sort((a, b) => {
      // Priority 1: Fewer games played
      if ((a.gamesPlayed || 0) !== (b.gamesPlayed || 0)) {
        return (a.gamesPlayed || 0) - (b.gamesPlayed || 0);
      }
      // Priority 2: Longest wait time (earliest timestamp)
      return (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0);
    })
    .slice(0, poolSize);

  // Phase B: Find best 4-player combination from pool
  if (selectedPool.length < 4) {
    return { matchCreated: false, error: "Not enough players in selection pool." };
  }

  // Generate all combinations of 4 players from the pool
  const fourPlayerCombinations = generateCombinations(selectedPool, 4);

  // Score each 4-player combination
  const scoredCombinations = fourPlayerCombinations.map(players => {
    // Generate all possible 2v2 pairings for these 4 players
    const pairings = generatePairings(players);

    // Score each pairing
    const scoredPairings = pairings.map(pairing => {
      const skillA = pairing.teamA.reduce((sum, p) => sum + p.skillLevel, 0);
      const skillB = pairing.teamB.reduce((sum, p) => sum + p.skillLevel, 0);
      const skillGap = Math.abs(skillA - skillB);

      // Reduced partner penalty (20 points for last game, 10 for 2nd last game)
      let penalty = 0;

      const checkPenalty = (pa: Player, pb: Player) => {
        let p = 0;
        // Only check last 2 games
        if (pa.partnerHistory?.[0] === pb.id) p += 20;
        if (pa.partnerHistory?.[1] === pb.id) p += 10;
        return p;
      };

      penalty += checkPenalty(pairing.teamA[0], pairing.teamA[1]);
      penalty += checkPenalty(pairing.teamB[0], pairing.teamB[1]);

      return {
        ...pairing,
        score: skillGap,
        penalty,
        skillGap
      };
    });

    // Find best pairing for this 4-player combination
    const bestPairing = scoredPairings.sort((a, b) => {
      // Primary: Minimize skill gap
      if (a.skillGap !== b.skillGap) {
        return a.skillGap - b.skillGap;
      }
      // Secondary: Minimize partner penalty (tie-breaker)
      return a.penalty - b.penalty;
    })[0];

    return {
      players,
      bestPairing,
      overallScore: bestPairing.skillGap + bestPairing.penalty
    };
  });

  // Select best 4-player combination
  const bestCombination = scoredCombinations.sort((a, b) => a.overallScore - b.overallScore)[0];
  const court = availableCourts.length > 0 ? availableCourts[0] : undefined;

  // Calculate balance score (0-100% based on skill gap)
  // Max reasonable skill gap is 14 (7-0 = 7 per team, difference of 14)
  const maxSkillGap = 14;
  const balanceScore = Math.max(0, Math.min(100, Math.round(((maxSkillGap - bestCombination.bestPairing.skillGap) / maxSkillGap) * 100)));

  return {
    matchCreated: true,
    courtId: court?.id,
    courtName: court?.name,
    teamA: bestCombination.bestPairing.teamA.map(p => p.id),
    teamB: bestCombination.bestPairing.teamB.map(p => p.id),
    balanceScore,
    analysis: bestCombination.bestPairing.penalty > 0
      ? `${balanceScore}% Balanced (${bestCombination.bestPairing.skillGap}pt gap, recent partners avoided)`
      : `${balanceScore}% Balanced (${bestCombination.bestPairing.skillGap}pt gap)`
  };
}

// Helper: Generate all combinations of k elements from array
function generateCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];

  const [first, ...rest] = arr;
  const combsWithFirst = generateCombinations(rest, k - 1).map(comb => [first, ...comb]);
  const combsWithoutFirst = generateCombinations(rest, k);

  return [...combsWithFirst, ...combsWithoutFirst];
}

// Helper: Generate all 2v2 pairings for 4 players
function generatePairings(players: Player[]): { teamA: Player[], teamB: Player[] }[] {
  if (players.length !== 4) return [];

  const [p1, p2, p3, p4] = players;

  return [
    { teamA: [p1, p2], teamB: [p3, p4] },
    { teamA: [p1, p3], teamB: [p2, p4] },
    { teamA: [p1, p4], teamB: [p2, p3] },
  ];
}
