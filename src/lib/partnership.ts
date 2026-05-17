import { Match } from '@/lib/types';

export interface PartnershipInfo {
  player1Id: string;
  player2Id: string;
  gamesAgo: number;
  lastMatchId: string;
}

/**
 * Check if two players have been partners in recent matches
 * @param player1Id - First player's ID
 * @param player2Id - Second player's ID
 * @param matches - Array of completed matches to check
 * @param maxMatchesToCheck - How many recent matches to check (default: 10)
 * @returns PartnershipInfo if they were recent partners, null otherwise
 */
export const checkRepeatPartnership = (
  player1Id: string,
  player2Id: string,
  matches: Match[],
  maxMatchesToCheck: number = 10
): PartnershipInfo | null => {
  // Get completed matches, sorted by timestamp (most recent first)
  const completedMatches = matches
    .filter(m => m.isCompleted && m.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxMatchesToCheck);

  // Check if these two players were partners in any of the recent matches
  for (let i = 0; i < completedMatches.length; i++) {
    const match = completedMatches[i];
    
    // Check if they were partners in teamA
    const werePartnersInTeamA = 
      match.teamA.includes(player1Id) && match.teamA.includes(player2Id);
    
    // Check if they were partners in teamB
    const werePartnersInTeamB = 
      match.teamB.includes(player1Id) && match.teamB.includes(player2Id);
    
    if (werePartnersInTeamA || werePartnersInTeamB) {
      return {
        player1Id,
        player2Id,
        gamesAgo: i + 1, // i is 0-indexed, so games ago is i + 1
        lastMatchId: match.id,
      };
    }
  }

  return null;
};

/**
 * Find all repeat partnerships in a proposed match
 * @param teamA - Array of player IDs for team A
 * @param teamB - Array of player IDs for team B
 * @param matches - Array of completed matches to check
 * @param maxMatchesToCheck - How many recent matches to check (default: 10)
 * @returns Array of PartnershipInfo for all repeat partnerships found
 */
export const findAllRepeatPartnerships = (
  teamA: string[],
  teamB: string[],
  matches: Match[],
  maxMatchesToCheck: number = 10
): PartnershipInfo[] => {
  const partnerships: PartnershipInfo[] = [];
  
  // Check teamA partnerships (pairs within teamA)
  for (let i = 0; i < teamA.length; i++) {
    for (let j = i + 1; j < teamA.length; j++) {
      const partnership = checkRepeatPartnership(teamA[i], teamA[j], matches, maxMatchesToCheck);
      if (partnership) {
        partnerships.push(partnership);
      }
    }
  }
  
  // Check teamB partnerships (pairs within teamB)
  for (let i = 0; i < teamB.length; i++) {
    for (let j = i + 1; j < teamB.length; j++) {
      const partnership = checkRepeatPartnership(teamB[i], teamB[j], matches, maxMatchesToCheck);
      if (partnership) {
        partnerships.push(partnership);
      }
    }
  }
  
  return partnerships;
};

/**
 * Find eligible players for swap based on skill level
 * @param playerToReplace - The player ID to replace
 * @param skillLevel - The skill level to match
 * @param availablePlayers - Array of available player objects
 * @param currentMatchPlayers - Players currently in the match (to exclude)
 * @param skillTolerance - How much skill difference is acceptable (default: 1)
 * @returns Array of eligible players sorted by skill closeness
 */
export const findEligibleSwapPlayers = (
  playerToReplace: string,
  skillLevel: number,
  availablePlayers: Array<{ id: string; name: string; skillLevel: number; status: string }>,
  currentMatchPlayers: string[],
  skillTolerance: number = 1
): Array<{ id: string; name: string; skillLevel: number; skillDiff: number }> => {
  const eligible = availablePlayers
    .filter(p => 
      p.id !== playerToReplace &&
      !currentMatchPlayers.includes(p.id) &&
      p.status === 'available' &&
      Math.abs(p.skillLevel - skillLevel) <= skillTolerance
    )
    .map(p => ({
      id: p.id,
      name: p.name,
      skillLevel: p.skillLevel,
      skillDiff: Math.abs(p.skillLevel - skillLevel),
    }))
    .sort((a, b) => a.skillDiff - b.skillDiff); // Sort by skill closeness
  
  return eligible.slice(0, 5); // Return top 5 suggestions
};

/**
 * Get a human-readable message for repeat partnership
 * @param partnership - The partnership info
 * @returns Human-readable message
 */
export const getPartnershipMessage = (partnership: PartnershipInfo): string => {
  const gamesAgo = partnership.gamesAgo;
  if (gamesAgo === 1) {
    return 'Repeat Partnership (Played together 1 game ago)';
  }
  return `Repeat Partnership (Played together ${gamesAgo} games ago)`;
};
