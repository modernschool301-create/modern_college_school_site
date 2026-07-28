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

export function heroMedia(cloudName: string, publicId: string): HeroMedia {
  if (!cloudName || !publicId) {
    return { hasMedia: false, videoUrl: '', posterUrl: '' };
  }

  const base = `https://res.cloudinary.com/${cloudName}/video/upload`;

  return {
    hasMedia: true,
    // Optimized, audio stripped (it's muted anyway): quality/format auto,
    // codec auto, no audio channel.
    videoUrl: `${base}/q_auto,f_auto,vc_auto,ac_none/${publicId}`,
    // Poster = frame zero of the SAME asset, delivered as an optimized jpg, so
    // the hero is never blank while the video loads.
    posterUrl: `${base}/so_0,q_auto,f_auto/${publicId}.jpg`,
  };
}
