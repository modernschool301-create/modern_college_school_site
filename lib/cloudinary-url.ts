// Builds PUBLIC Cloudinary delivery URLs for the homepage hero. Only the cloud
// name and public ID appear (both are public, present in every delivery URL) —
// no API key or secret is ever involved here. Called from a Server Component so
// the (non-public) CLOUDINARY_CLOUD_NAME env is read on the server; the
// resulting URL is safe to ship to the browser.

// The shared stand-in cover for entries with no image of their own. Lives here,
// not in a component, so every caller resolves the same asset — and a future
// re-upload is a one-line change. Callers pass it through their OWN aspect
// transform (ContentCard 4:3, the homepage teaser lead 16:9), so the filler
// always matches the shape of the slot it fills.
export const FILLER_IMAGE = 'modern/filler';

export type HeroMedia = {
  hasMedia: boolean;
  videoUrl: string;
  posterUrl: string;
};

// Public image delivery URL (logos, etc.) — optimized format/quality. Only the
// public cloud name + public ID appear; no secret involved. `extra` appends any
// additional Cloudinary transforms (e.g. `e_trim` to strip transparent padding
// baked into a logo PNG so the visible mark fills its box).
export function cloudinaryImage(
  cloudName: string,
  publicId: string,
  extra = '',
): string {
  if (!cloudName || !publicId) return '';
  const transforms = ['f_auto', 'q_auto', extra].filter(Boolean).join(',');
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;
}

// Public delivery URL for a RAW asset (Downloads, PRD 23). Deliberately carries
// NO transformation: raw assets are stored byte-for-byte and cannot be
// transformed, so there is no f_auto/q_auto to apply — adding a transformation
// segment to a raw URL does not produce a derived file, it produces a 404.
//
// The public ID of a raw asset INCLUDES its file extension (Cloudinary appends
// it for raw uploads, and raw delivery URLs have no extension of their own), so
// it is used verbatim. Browsers download rather than render a raw delivery by
// default, which is the behaviour a downloads list wants.
export function cloudinaryRawUrl(cloudName: string, publicId: string): string {
  if (!cloudName || !publicId) return '';
  return `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}`;
}

export function heroMedia(cloudName: string, publicId: string): HeroMedia {
  if (!cloudName || !publicId) {
    return { hasMedia: false, videoUrl: '', posterUrl: '' };
  }

  const base = `https://res.cloudinary.com/${cloudName}/video/upload`;

  return {
    hasMedia: true,
    // Optimized, audio stripped (it's muted anyway): quality/format auto,
    // codec auto, no audio channel. Delivered explicitly as .mp4 (H.264-family)
    // so it's a real, inline-playable <video> source on every browser — NOT the
    // so_0 .jpg still, which is only the poster below.
    videoUrl: `${base}/q_auto,f_auto,vc_auto,ac_none/${publicId}.mp4`,
    // Poster = frame zero of the SAME asset, delivered as an optimized jpg, so
    // the hero is never blank while the video loads.
    posterUrl: `${base}/so_0,q_auto,f_auto/${publicId}.jpg`,
  };
}
