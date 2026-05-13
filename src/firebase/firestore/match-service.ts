'use client';

import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  runTransaction,
  Firestore,
  increment,
} from 'firebase/firestore';
import { Match, MatchStatus, Player } from '@/lib/types';
import { batchUpdatePlayerStatus } from './player-service';
import { stripUndefined } from '@/lib/utils';

/**
 * Complete a match atomically:
 * 1. Determine the winning team from scores.
 * 2. Use a Firestore transaction to increment `wins` for each winning player.
 * 3. Update all participating players' `gamesPlayed` and reset status to 'available'.
 * 4. Mark the match as completed.
 */
export async function completeMatch(
  db: Firestore,
  matchId: string,
  teamAScore: number,
  teamBScore: number
): Promise<{ winner: 'teamA' | 'teamB' | null }> {
  const matchRef = doc(db, 'matches', matchId);

  const result = await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    if (!matchSnap.exists()) {
      throw new Error(`Match ${matchId} not found.`);
    }

    const matchData = matchSnap.data() as Match;
    if (matchData.isCompleted) {
      throw new Error(`Match ${matchId} is already completed.`);
    }

    // Determine winner dynamically from scores
    let winner: 'teamA' | 'teamB' | null = null;
    if (teamAScore > teamBScore) {
      winner = 'teamA';
    } else if (teamBScore > teamAScore) {
      winner = 'teamB';
    }

    // Update the match document
    transaction.update(matchRef, {
      isCompleted: true,
      status: 'completed' as MatchStatus,
      teamAScore,
      teamBScore,
      winner,
      endTime: new Date().toISOString(),
    });

    // Determine winning player IDs
    const winningPlayerIds = winner === 'teamA'
      ? matchData.teamA
      : winner === 'teamB'
        ? matchData.teamB
        : [];

    // Atomically increment wins for winning players
    for (const playerId of winningPlayerIds) {
      const playerRef = doc(db, 'players', playerId);
      transaction.update(playerRef, {
        wins: increment(1),
      });
    }

    // Increment gamesPlayed for ALL participating players
    const allPlayerIds = [...matchData.teamA, ...matchData.teamB];
    for (const playerId of allPlayerIds) {
      const playerRef = doc(db, 'players', playerId);
      transaction.update(playerRef, {
        gamesPlayed: increment(1),
        status: 'available',
        lastAvailableAt: Date.now(),
      });
    }

    // Free the court if assigned
    if (matchData.courtId) {
      const courtRef = doc(db, 'courts', matchData.courtId);
      transaction.update(courtRef, {
        status: 'available',
        currentMatchId: null,
      });
    }

    return { winner };
  });

  return result;
}

/**
 * Save a match document to Firestore.
 * `undefined` fields are coerced to `null` to satisfy Firestore's type rules.
 */
export async function saveMatch(db: Firestore, match: Match): Promise<void> {
  const matchRef = doc(db, 'matches', match.id);
  await setDoc(matchRef, stripUndefined(match), { merge: true });
}
