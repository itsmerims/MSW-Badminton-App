'use client';

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  Firestore,
} from 'firebase/firestore';
import { PaymentMethod, Session } from '@/lib/types';

// ──────────────────────────────────────────────────
// Firestore data helpers
// ──────────────────────────────────────────────────

/**
 * Save a payment method document to Firestore.
 */
export async function savePaymentMethod(
  db: Firestore,
  method: PaymentMethod
): Promise<void> {
  const docRef = doc(db, 'payment_methods', method.id);
  await setDoc(docRef, method, { merge: true });
}

/**
 * Delete a payment method document from Firestore.
 */
export async function deletePaymentMethod(
  db: Firestore,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, 'payment_methods', id));
}

/**
 * Fetch all payment methods from Firestore.
 */
export async function getPaymentMethods(
  db: Firestore
): Promise<PaymentMethod[]> {
  const snapshot = await getDocs(collection(db, 'payment_methods'));
  return snapshot.docs.map((d) => ({ ...(d.data() as PaymentMethod), id: d.id }));
}

/**
 * Fetch all sessions from Firestore (replaces getSessionsFromSupabase).
 */
export async function getSessionsFromFirebase(
  db: Firestore
): Promise<Session[]> {
  const sessionsRef = collection(db, 'sessions');
  const snapshot = await getDocs(sessionsRef);
  return snapshot.docs.map((d) => ({ ...(d.data() as Omit<Session, 'id'>), id: d.id }));
}

/**
 * Save a fee QR code URL to Firestore (replaces the /api/fees Supabase route).
 */
export async function saveFeeQRCode(
  db: Firestore,
  feeId: string,
  qrCodeUrl: string
): Promise<void> {
  const docRef = doc(db, 'fee_qr_codes', feeId);
  await setDoc(docRef, { feeId, qrCodeUrl }, { merge: true });
}

/**
 * Get a fee QR code URL from Firestore.
 */
export async function getFeeQRCode(
  db: Firestore,
  feeId: string
): Promise<string | null> {
  const docRef = doc(db, 'fee_qr_codes', feeId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data()?.qrCodeUrl ?? null;
}
