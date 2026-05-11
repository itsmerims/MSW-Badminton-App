import { NextResponse } from 'next/server';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

export async function POST(request: Request) {
  try {
    const { feeId, qrCodeUrl } = await request.json();

    if (!feeId || !qrCodeUrl) {
      return NextResponse.json({ error: 'Missing feeId or qrCodeUrl' }, { status: 400 });
    }

    const feeDocRef = doc(db, 'fees', feeId);
    const feeDoc = await getDoc(feeDocRef);

    if (!feeDoc.exists()) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }

    await updateDoc(feeDocRef, { qrCodeUrl });

    return NextResponse.json({ message: 'Fee updated successfully' });
  } catch (error) {
    console.error('Error updating fee:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
