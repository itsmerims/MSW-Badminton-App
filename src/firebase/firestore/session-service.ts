'use client';

import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  onSnapshot,
  query,
  where,
  Unsubscribe,
  Firestore,
  arrayUnion,
} from 'firebase/firestore';
import { Session, SessionStatus } from '@/lib/types';

/**
 * Subscribe to real-time updates on the 'sessions' collection.
 * Prevents accidental UI data deletion by only updating state when docs exist.
 */
export function subscribeToSessions(
  db: Firestore,
  onUpdate: (sessions: Session[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const sessionsRef = collection(db, 'sessions');
  return onSnapshot(
    sessionsRef,
    (snapshot) => {
      const sessions: Session[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as Omit<Session, 'id'>),
        id: doc.id,
      }));
      onUpdate(sessions);
    },
    (error) => {
      console.error('[subscribeToSessions] Error:', error);
      onError?.(error);
    }
  );
}

/**
 * End a session by setting its status to 'completed' (soft-delete).
 * The document is preserved for history/restoration.
 */
export async function endSession(db: Firestore, sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    status: 'completed' as SessionStatus,
  });
}

/**
 * Restore a previously completed session back to 'active'.
 */
export async function restoreSession(db: Firestore, sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) {
    throw new Error(`Session ${sessionId} not found.`);
  }
  const data = snap.data() as Session;
  if (data.status !== 'completed') {
    throw new Error(`Session ${sessionId} is not in 'completed' status. Current: ${data.status}`);
  }
  await updateDoc(sessionRef, {
    status: 'active' as SessionStatus,
  });
}

/**
 * Save the per-player fee to the session document.
 */
export async function saveSessionFee(
  db: Firestore,
  sessionId: string,
  perPlayerFee: number
): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, { perPlayerFee });
}

/**
 * Save the calculator data to the session document.
 */
export async function saveCalculatorData(
  db: Firestore,
  sessionId: string,
  data: Session['calculatorData']
): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, { calculatorData: data ?? null });
}

/**
 * Get the calculator data from the session document.
 */
export async function getCalculatorData(
  db: Firestore,
  sessionId: string
): Promise<Session['calculatorData'] | null> {
  const sessionRef = doc(db, 'sessions', sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return null;
  return (snap.data() as Session).calculatorData ?? null;
}

/**
 * Create a new session document in Firestore.
 */
export async function createSessionDoc(db: Firestore, session: Session): Promise<void> {
  const sessionRef = doc(db, 'sessions', session.id);
  await setDoc(sessionRef, session);
}
