import { NextResponse } from 'next/server';
import { db } from '@/firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { feeId, qrCodeUrl } = await request.json();

    if (!feeId || !qrCodeUrl) {
      return NextResponse.json({ error: 'Missing feeId or qrCodeUrl' }, { status: 400 });
    }

    const docRef = doc(db, 'fee_qr_codes', feeId);
    await setDoc(docRef, { feeId, qrCodeUrl }, { merge: true });

    return NextResponse.json({ message: 'Fee QR code updated successfully' });
  } catch (error) {
    console.error('Error updating fee:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const feeId = searchParams.get('feeId');

    if (!feeId) {
      return NextResponse.json({ error: 'Missing feeId' }, { status: 400 });
    }

    const docRef = doc(db, 'fee_qr_codes', feeId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return NextResponse.json({ qrCodeUrl: null });
    }

    return NextResponse.json({ qrCodeUrl: snap.data()?.qrCodeUrl || null });
  } catch (error) {
    console.error('Error fetching fee:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
