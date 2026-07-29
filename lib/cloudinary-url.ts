// Builds PUBLIC Cloudinary delivery URLs for the homepage hero. Only the cloud
// name and public ID appear (both are public, present in every delivery URL) —
// no API key or secret is ever involved here. Called from a Server Component so
// the (non-public) CLOUDINARY_CLOUD_NAME env is read on the server; the
// resulting URL is safe to ship to the browser.

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
