import 'server-only';

import crypto from 'node:crypto';

// Signs a Cloudinary upload request server-side (PRD 10.3 / Decision 6). The API
// secret never leaves the server; the browser receives only a short-lived
// signature + the params it must echo. The SERVER decides the folder (and thus
// where/how the asset is stored) — the browser cannot influence it, because any
// change to a signed param invalidates the signature.

export type UploadPurpose = 'news-image' | 'achievement-image';

type PurposeConfig = {
  folder: string;
  requiresAdmin: boolean;
};

// Every public-content upload purpose requires an active admin (PRD 9.7). New
// modules add a line here — the folder is fixed server-side per purpose.
export const UPLOAD_PURPOSES: Record<UploadPurpose, PurposeConfig> = {
  'news-image': { folder: 'modern/news', requiresAdmin: true },
  'achievement-image': { folder: 'modern/achievements', requiresAdmin: true },
};

export type SignedUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export function signUpload(folder: string): SignedUpload | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000);

  // Cloudinary signs the alphabetically-sorted `k=v` params (excluding file,
  // cloud_name, resource_type, api_key), then appends the secret and SHA-1s it.
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');

  return { cloudName, apiKey, timestamp, folder, signature };
}
