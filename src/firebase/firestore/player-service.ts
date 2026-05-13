'use client';

import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  Unsubscribe,
  Firestore,
  arrayUnion,
} from 'firebase/firestore';
import { Player, PlayerStatus } from '@/lib/types';

/**
 * Subscribe to real-time updates on the 'players' collection.
 * Prevents accidental UI data deletion by only calling onUpdate when docs exist.
 */
export function subscribeToPlayers(
  db: Firestore,
  onUpdate: (players: Player[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const playersRef = collection(db, 'players');
  return onSnapshot(
    playersRef,
    (snapshot) => {
      if (snapshot.empty) return; // Prevent wiping UI on empty snapshots
      const players: Player[] = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<Player, 'id'>),
        id: d.id,
      }));
      onUpdate(players);
    },
    (error) => {
      console.error('[subscribeToPlayers] Error:', error);
      onError?.(error);
    }
  );
}

/**
 * Import an existing player into a new session by appending the sessionId
 * to the player's `sessionIds` array and updating their current `sessionId`.
 */
export async function importPlayerToSession(
  db: Firestore,
  playerId: string,
  sessionId: string
): Promise<void> {
  const playerRef = doc(db, 'players', playerId);
  const snap = await getDoc(playerRef);
  if (!snap.exists()) {
    throw new Error(`Player ${playerId} not found.`);
  }
  await updateDoc(playerRef, {
    sessionId,
    sessionIds: arrayUnion(sessionId),
    status: 'available' as PlayerStatus,
    lastAvailableAt: Date.now(),
  });
}

/**
 * Update a player's status field.
 */
export async function updatePlayerStatus(
  db: Firestore,
  playerId: string,
  status: PlayerStatus
): Promise<void> {
  const playerRef = doc(db, 'players', playerId);
  await updateDoc(playerRef, { status });
}

/**
 * Batch update multiple players' statuses.
 */
export async function batchUpdatePlayerStatus(
  db: Firestore,
  playerIds: string[],
  status: PlayerStatus
): Promise<void> {
  const updates = playerIds.map((id) => {
    const playerRef = doc(db, 'players', id);
    return updateDoc(playerRef, { status });
  });
  await Promise.all(updates);
}

/**
 * Save a full player document to Firestore.
 */
export async function savePlayer(db: Firestore, player: Player): Promise<void> {
  const playerRef = doc(db, 'players', player.id);
  await setDoc(playerRef, player, { merge: true });
}

/**
 * Fetch all players from Firestore.
 */
export async function getPlayers(db: Firestore): Promise<Player[]> {
  const snapshot = await getDocs(collection(db, 'players'));
  return snapshot.docs.map(d => ({ ...(d.data() as Omit<Player, 'id'>), id: d.id }));
}
