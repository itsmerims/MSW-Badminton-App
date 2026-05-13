import { supabase } from './client';

const QR_CODE_BUCKET = 'msw-badminton';

/**
 * Checks if a bucket exists in Supabase storage.
 */
const checkBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('[checkBucketExists] Error listing buckets:', error);
      return false;
    }
    const exists = data?.some(bucket => bucket.name === bucketName) ?? false;
    console.log('[checkBucketExists] Bucket', bucketName, 'exists:', exists);
    return exists;
  } catch (error) {
    console.error('[checkBucketExists] Unexpected error:', error);
    return false;
  }
};

/**
 * Creates a bucket in Supabase storage if it doesn't exist.
 */
const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
  const exists = await checkBucketExists(bucketName);
  if (exists) return true;

  console.log('[ensureBucketExists] Creating bucket:', bucketName);
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: true,
  });

  if (error) {
    console.error('[ensureBucketExists] Failed to create bucket:', error);
    return false;
  }

  console.log('[ensureBucketExists] Bucket created successfully');
  return true;
};

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
  console.log('[uploadFileToSupabase] Uploading to bucket:', bucketName);
  console.log('[uploadFileToSupabase] Path:', path);
  console.log('[uploadFileToSupabase] File:', file.name, file.size, file.type);

  // Ensure bucket exists and is public
  const bucketReady = await ensureBucketExists(bucketName);
  if (!bucketReady) {
    const errorMsg = `Failed to ensure bucket '${bucketName}' exists. Please create it manually in your Supabase dashboard and make it public.`;
    console.error('[uploadFileToSupabase]', errorMsg);
    throw new Error(errorMsg);
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      cacheControl: '3600', // Cache for 1 hour
      upsert: true, // Overwrite file if it already exists
    });

  if (error) {
    console.error('[uploadFileToSupabase] Supabase upload error:', error);
    console.error('[uploadFileToSupabase] Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to upload file: ${error.message}. Check if bucket '${bucketName}' is public and RLS policies allow uploads.`);
  }

  console.log('[uploadFileToSupabase] Upload successful, data:', data);

  // Retrieve the public URL of the uploaded file
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  if (!urlData) {
    throw new Error('Failed to get public URL for the uploaded file.');
  }

  console.log('[uploadFileToSupabase] Public URL:', urlData.publicUrl);
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
  console.log('[uploadQRCodeToSupabase] Starting upload for:', paymentMethodId);

  let file: File;

  if (typeof imageData === 'string') {
    // Convert base64 to File
    console.log('[uploadQRCodeToSupabase] Converting base64 to File...');
    try {
      const response = await fetch(imageData);
      const blob = await response.blob();
      file = new File([blob], `qr-${paymentMethodId}.png`, { type: 'image/png' });
      console.log('[uploadQRCodeToSupabase] File created:', file.name, file.size, file.type);
    } catch (error) {
      console.error('[uploadQRCodeToSupabase] Failed to convert base64 to File:', error);
      throw new Error(`Failed to convert base64 to File: ${error}`);
    }
  } else {
    file = imageData;
    console.log('[uploadQRCodeToSupabase] Using provided file:', file.name, file.size, file.type);
  }

  const path = `payment_method/${paymentMethodId}.png`;
  console.log('[uploadQRCodeToSupabase] Uploading to bucket:', QR_CODE_BUCKET, 'path:', path);
  return uploadFileToSupabase(QR_CODE_BUCKET, path, file);
};

/**
 * Deletes a QR code image from Supabase storage.
 *
 * @param paymentMethodId The ID of the payment method.
 */
export const deleteQRCodeFromSupabase = async (paymentMethodId: string): Promise<void> => {
  const path = `payment_method/${paymentMethodId}.png`;
  const { error } = await supabase.storage
    .from(QR_CODE_BUCKET)
    .remove([path]);

  if (error) {
    console.error('Supabase delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Lists all QR code images from Supabase storage.
 *
 * @returns Array of payment method objects with id, name, and imageUrl.
 */
export const listQRCodesFromSupabase = async (): Promise<{ id: string; name: string; imageUrl: string }[]> => {
  console.log('[listQRCodesFromSupabase] Listing QR codes from bucket:', QR_CODE_BUCKET);

  const { data, error } = await supabase.storage
    .from(QR_CODE_BUCKET)
    .list('payment_method');

  if (error) {
    console.error('[listQRCodesFromSupabase] Error listing files:', error);
    throw new Error(`Failed to list QR codes: ${error.message}`);
  }

  console.log('[listQRCodesFromSupabase] Files found:', data?.length);

  if (!data || data.length === 0) {
    return [];
  }

  const paymentMethods = data.map(file => {
    // Extract payment method ID from filename (remove .png extension)
    const id = file.name.replace('.png', '');
    const { data: urlData } = supabase.storage
      .from(QR_CODE_BUCKET)
      .getPublicUrl(`payment_method/${file.name}`);

    return {
      id,
      name: id, // Use ID as name for now, can be enhanced later
      imageUrl: urlData.publicUrl
    };
  });

  console.log('[listQRCodesFromSupabase] Payment methods:', paymentMethods);
  return paymentMethods;
};

/**
 * Fetches all sessions from Supabase database.
 *
 * @returns Array of session objects.
 */
export const getSessionsFromSupabase = async (): Promise<any[]> => {
  console.log('[getSessionsFromSupabase] Fetching sessions from Supabase');

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getSessionsFromSupabase] Error fetching sessions:', error);
    throw new Error(`Failed to fetch sessions: ${error.message}`);
  }

  console.log('[getSessionsFromSupabase] Sessions fetched:', data?.length);
  return data || [];
};
