'use client';

import React, { useState } from 'react';
import { uploadFileToSupabase } from '@/supabase/storage';

interface FeeManagerProps {
  feeId: string;
}

export const FeeManager: React.FC<FeeManagerProps> = ({ feeId }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    setUploading(true);
    setError(null);

    try {
      const filePath = `qrcodes/${feeId}/${file.name}`;
      const newQrCodeUrl = await uploadFileToSupabase('msw-badminton', filePath, file);

      // Update the fee document in Firestore
      await fetch('/api/fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feeId, qrCodeUrl: newQrCodeUrl }),
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
      {uploading && <p>Uploading QR Code...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};
