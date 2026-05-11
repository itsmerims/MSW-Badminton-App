import { supabase } from './client';

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
