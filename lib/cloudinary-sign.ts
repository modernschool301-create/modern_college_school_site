import 'server-only';

import crypto from 'node:crypto';

// Signs a Cloudinary upload request server-side (PRD 10.3 / Decision 6). The API
// secret never leaves the server; the browser receives only a short-lived
// signature + the params it must echo. The SERVER decides the folder and the
// ingest size cap (and thus where/how the asset is stored) — the browser cannot
// influence either, because any change to a signed param invalidates the
// signature.

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

// The stored-original size cap, applied at INGEST as a signed incoming
// transformation. Delivery URLs already resize, but that does nothing for the
// ORIGINAL, which Cloudinary keeps at whatever resolution the camera produced —
// storage and derivation work the free-tier quota in PRD 31.2 monitors.
// `c_limit` is a bounding box: it only ever shrinks an image that exceeds it,
// never upscales a smaller one and never crops. So this is a quota measure, not
// a look decision — and it is a single shared default for every image purpose,
// deliberately not per-purpose configuration.
export const IMAGE_INGEST_TRANSFORMATION = 'c_limit,w_2000,h_2000';

export type SignedUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  transformation: string;
  signature: string;
};

export function signUpload(folder: string): SignedUpload | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const transformation = IMAGE_INGEST_TRANSFORMATION;

  // Cloudinary's signing rule (docs: "Authentication signatures" → generating an
  // upload signature): take EVERY parameter you send in the upload POST except
  // `file`, `cloud_name`, `resource_type` and `api_key` — `timestamp` included —
  // sort them ALPHABETICALLY BY NAME, join them as `name=value` with `&`, append
  // the API secret with no separator, then hash with SHA-1.
  //
  // Alphabetical order here is folder < timestamp < transformation ("timestamp"
  // sorts before "transformation" because 'i' < 'r' at the second character).
  // Values go in raw, NOT url-encoded — and the browser must echo this exact
  // `transformation` string back in its FormData or the signature won't match.
  const toSign =
    `folder=${folder}` +
    `&timestamp=${timestamp}` +
    `&transformation=${transformation}`;
  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');

  return { cloudName, apiKey, timestamp, folder, transformation, signature };
}
