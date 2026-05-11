import { NextResponse } from 'next/server';
import { supabase } from '@/supabase/client';

export async function POST(request: Request) {
  try {
    const { feeId, qrCodeUrl } = await request.json();

    if (!feeId || !qrCodeUrl) {
      return NextResponse.json({ error: 'Missing feeId or qrCodeUrl' }, { status: 400 });
    }

    // Store the QR code URL in Supabase storage or database
    // For now, we'll store it in a Supabase table
    const { error } = await supabase
      .from('fee_qr_codes')
      .upsert({ fee_id: feeId, qr_code_url: qrCodeUrl }, { onConflict: 'fee_id' });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to update QR code URL' }, { status: 500 });
    }

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

    const { data, error } = await supabase
      .from('fee_qr_codes')
      .select('qr_code_url')
      .eq('fee_id', feeId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch QR code URL' }, { status: 500 });
    }

    return NextResponse.json({ qrCodeUrl: data?.qr_code_url || null });
  } catch (error) {
    console.error('Error fetching fee:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
