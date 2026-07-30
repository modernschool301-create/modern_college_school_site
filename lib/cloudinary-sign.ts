import 'server-only';

import crypto from 'node:crypto';

// Signs a Cloudinary upload request server-side (PRD 10.3 / Decision 6). The API
// secret never leaves the server; the browser receives only a short-lived
// signature + the params it must echo. The SERVER decides the folder and the
// ingest transformation (and thus where/how the asset is stored) — the browser
// cannot influence either, because any change to a signed param invalidates the
// signature.

export type UploadPurpose =
  | 'news-image'
  | 'achievement-image'
  | 'testimonial-photo';

type PurposeConfig = {
  folder: string;
  requiresAdmin: boolean;
  // The incoming transformation applied at INGEST, as a signed param. `null`
  // means NO transformation is sent at all (correct for raw/PDF purposes, where
  // an image transform is meaningless or would corrupt a byte-exact document) —
  // not an empty string. Image purposes use IMAGE_INGEST_TRANSFORMATION.
  ingestTransformation: string | null;
};

// The stored-original transformation for IMAGES, applied at INGEST as a signed
// incoming transformation. Delivery URLs already resize, but that does nothing
// for the ORIGINAL, which Cloudinary keeps at whatever resolution the camera
// produced — storage and derivation work the free-tier quota PRD 31.2 monitors.
// `c_limit` is a bounding box: it only ever shrinks an image that exceeds it,
// never upscales a smaller one and never crops. `f_auto` normalizes a heavy PNG
// to a modern format (WebP/AVIF) at ingest — a deliberate quota decision for the
// free tier, applied to IMAGES ONLY. This is the single shared default for every
// image purpose (deliberately not per-purpose), so future image purposes reuse
// this constant rather than redeclaring the string.
export const IMAGE_INGEST_TRANSFORMATION = 'c_limit,w_2000,h_2000,f_auto';

// Every public-content upload purpose requires an active admin (PRD 9.7). New
// modules add a line here — the folder and ingest transformation are fixed
// server-side per purpose. Image purposes reuse IMAGE_INGEST_TRANSFORMATION;
// raw/PDF purposes (Downloads, admission documents) will set it `null`.
export const UPLOAD_PURPOSES: Record<UploadPurpose, PurposeConfig> = {
  'news-image': {
    folder: 'modern/news',
    requiresAdmin: true,
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  'achievement-image': {
    folder: 'modern/achievements',
    requiresAdmin: true,
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  'testimonial-photo': {
    folder: 'modern/testimonials',
    requiresAdmin: true,
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
};

export type SignedUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  // Present only when the purpose carries an ingest transformation. When the
  // purpose's transformation is null this key is OMITTED entirely (never sent as
  // an empty string) so the signed string and the posted params match exactly.
  transformation?: string;
  signature: string;
};

export function signUpload(
  config: Pick<PurposeConfig, 'folder' | 'ingestTransformation'>,
): SignedUpload | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const { folder, ingestTransformation } = config;

  // Cloudinary's signing rule (docs: "Authentication signatures" → generating an
  // upload signature): take EVERY parameter you send in the upload POST except
  // `file`, `cloud_name`, `resource_type` and `api_key` — `timestamp` included —
  // sort them ALPHABETICALLY BY NAME, join them as `name=value` with `&`, append
  // the API secret with no separator, then hash with SHA-1.
  //
  // Alphabetical order is folder < timestamp < transformation ("timestamp" sorts
  // before "transformation" because 'i' < 'r' at the second character). Values go
  // in raw, NOT url-encoded. The signature must contain EXACTLY the params posted
  // — so when there is no transformation, the param is left out of both the
  // string-to-sign and the returned object, not sent empty. The browser echoes
  // back precisely these params (and only these) or the signature won't match.
  const parts = [`folder=${folder}`, `timestamp=${timestamp}`];
  if (ingestTransformation !== null) {
    parts.push(`transformation=${ingestTransformation}`);
  }
  const toSign = parts.join('&');
  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');

  const signed: SignedUpload = {
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
  };
  if (ingestTransformation !== null) {
    signed.transformation = ingestTransformation;
  }
  return signed;
}
