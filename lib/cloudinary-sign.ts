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
  | 'testimonial-photo'
  | 'gallery-photo'
  | 'programme-cover'
  | 'faculty-photo'
  | 'specialization-image'
  | 'specialization-faculty-photo'
  | 'leadership-photo'
  | 'popup-banner'
  | 'download-file';

// Cloudinary's storage class for the asset. It is NOT a signed parameter — it
// is a segment of the upload URL path (`/v1_1/<cloud>/<resource_type>/upload`),
// and the signing docs list `resource_type` among the four params that are never
// part of the string to sign (with `file`, `cloud_name`, `api_key`). It is
// nonetheless decided HERE, per purpose, and handed to the browser in the signed
// response — PRD 10.3: "the browser never names the folder, filename, or
// delivery type."
//
//   'image' — Cloudinary's default class. Images AND PDFs; the asset is format-
//             detected and may be transformed/normalised at ingest.
//   'raw'   — stored as-is, byte-for-byte, no format detection and no
//             transformations available. The only correct class for documents.
type ResourceType = 'image' | 'raw';

type PurposeConfig = {
  folder: string;
  requiresAdmin: boolean;
  resourceType: ResourceType;
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
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  'achievement-image': {
    folder: 'modern/achievements',
    requiresAdmin: true,
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  'testimonial-photo': {
    folder: 'modern/testimonials',
    requiresAdmin: true,
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  // Album covers AND album photographs share this one purpose: both are public
  // gallery images living in the same folder, and the cover is simply one of the
  // photographs promoted. A separate cover purpose would differ in nothing.
  'gallery-photo': {
    folder: 'modern/gallery',
    requiresAdmin: true,
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  // Programme cover images. Kept SEPARATE from faculty photographs below even
  // though both are public images with identical settings: they are different
  // kinds of asset with different lifecycles (a cover is replaced when the
  // programme is redesigned, a faculty portrait when the person changes), and
  // separate folders keep the Cloudinary console legible and make a future
  // per-folder cleanup or quota check possible.
  'programme-cover': {
    folder: 'modern/programmes',
    requiresAdmin: true,
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  // Faculty portraits, delivered as circular avatars on the programme detail
  // page. The face-aware crop is a DELIVERY transform, not an ingest one — the
  // stored original stays uncropped so the same photograph can be re-framed
  // later without a re-upload.
  'faculty-photo': {
    folder: 'modern/faculty',
    requiresAdmin: true,
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  // Specialization (sub-programme) card images. Its own folder for the same
  // reason programme covers and faculty portraits have theirs: a distinct kind
  // of asset with its own lifecycle, and a legible Cloudinary console.
  'specialization-image': {
    folder: 'modern/specializations',
    requiresAdmin: true,
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  // Faculty portraits on a SPECIALIZATION's roster. Same folder as
  // 'faculty-photo' on purpose — this is the same kind of asset (a teacher's
  // portrait, delivered as a circular avatar with the same face-aware crop) and
  // splitting the folder would scatter one set of people across two places in
  // the Cloudinary console. It is a separate PURPOSE rather than a reuse of
  // 'faculty-photo' so the two rosters stay independently rate-limitable and
  // auditable, which a shared purpose would foreclose.
  'specialization-faculty-photo': {
    folder: 'modern/faculty',
    requiresAdmin: true,
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  // Leadership portraits (Principal, Chairperson, …). Its own folder rather
  // than a reuse of 'faculty-photo': these are a handful of long-lived,
  // deliberately-commissioned portraits with a completely different lifecycle
  // from the teaching roster, and keeping them separate means a quota check or
  // an orphan sweep can see the leadership set at a glance. The 4:3 face-aware
  // crop is a DELIVERY transform on the homepage card, not an ingest one, so
  // the stored original stays uncropped and can be re-framed without a
  // re-upload.
  'leadership-photo': {
    folder: 'modern/leadership',
    requiresAdmin: true,
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  // The homepage announcement banner (Decision 12). A singleton in practice —
  // there is only ever one active pop-up — but each upload is a new asset, so
  // replaced banners accumulate in this folder until the orphan sweep
  // (PRD 10.3) collects them. Its own folder so that sweep, and any quota check,
  // can see the pop-up's history at a glance.
  'popup-banner': {
    folder: 'modern/popup',
    requiresAdmin: true,
    resourceType: 'image',
    ingestTransformation: IMAGE_INGEST_TRANSFORMATION,
  },
  // The first RAW purpose, and the first with no ingest transformation. A
  // results or routine PDF must come back out byte-identical, so: 'raw' (no
  // format detection, no derived versions) and `ingestTransformation: null` (no
  // c_limit/f_auto — meaningless on a document and rejected on a raw upload).
  //
  // NOT 'auto': Cloudinary's auto-detection classifies a PDF as 'image', which
  // is exactly the processing this purpose exists to avoid. Everything posted
  // here is raw — including the JPEG/PNG the field also accepts (PRD 10.3),
  // because a download is an attachment to be handed over unchanged, not a
  // picture to be rendered. Resource type is a property of the PURPOSE, never of
  // the file the browser happened to pick.
  'download-file': {
    folder: 'modern/downloads',
    requiresAdmin: true,
    resourceType: 'raw',
    ingestTransformation: null,
  },
};

export type SignedUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  // The upload URL path segment the browser must post to. Unsigned by
  // Cloudinary's rules, but chosen by the server, not the browser.
  resourceType: ResourceType;
  // Present only when the purpose carries an ingest transformation. When the
  // purpose's transformation is null this key is OMITTED entirely (never sent as
  // an empty string) so the signed string and the posted params match exactly.
  transformation?: string;
  signature: string;
};

export function signUpload(
  config: Pick<
    PurposeConfig,
    'folder' | 'ingestTransformation' | 'resourceType'
  >,
): SignedUpload | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const { folder, ingestTransformation, resourceType } = config;

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
    resourceType,
    signature,
  };
  if (ingestTransformation !== null) {
    signed.transformation = ingestTransformation;
  }
  return signed;
}
