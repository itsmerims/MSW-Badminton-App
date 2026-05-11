import { supabase } from './client';

const QR_CODE_BUCKET = 'msw-badminton';

/**
 * Uploads a file to a specified Supabase storage bucket.
 *
 * @param bucketName The name of the Supabase storage bucket.
 * @param path The path and filename for the uploaded file (e.g., 'qrcodes/fee123.png').
 * @param file The file object to upload.
 * @returns The public URL of the uploaded file.
 * @throws An error if the upload fails.
 */
export const uploadFileToSupabase = async (
  bucketName: string,
  path: string,
  file: File
) => {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      cacheControl: '3600', // Cache for 1 hour
      upsert: true, // Overwrite file if it already exists
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Retrieve the public URL of the uploaded file
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  if (!urlData) {
    throw new Error('Failed to get public URL for the uploaded file.');
  }

  return urlData.publicUrl;
};

/**
 * Uploads a QR code image to Supabase storage.
 *
 * @param paymentMethodId The ID of the payment method.
 * @param imageData Base64 encoded image data or File object.
 * @returns The public URL of the uploaded QR code.
 */
export const uploadQRCodeToSupabase = async (
  paymentMethodId: string,
  imageData: string | File
): Promise<string> => {
  let file: File;

  if (typeof imageData === 'string') {
    // Convert base64 to File
    const response = await fetch(imageData);
    const blob = await response.blob();
    file = new File([blob], `qr-${paymentMethodId}.png`, { type: 'image/png' });
  } else {
    file = imageData;
  }

  const path = `payment-methods/${paymentMethodId}.png`;
  return uploadFileToSupabase(QR_CODE_BUCKET, path, file);
};

/**
 * Deletes a QR code image from Supabase storage.
 *
 * @param paymentMethodId The ID of the payment method.
 */
export const deleteQRCodeFromSupabase = async (paymentMethodId: string): Promise<void> => {
  const path = `payment-methods/${paymentMethodId}.png`;
  const { error } = await supabase.storage
    .from(QR_CODE_BUCKET)
    .remove([path]);

  if (error) {
    console.error('Supabase delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};
