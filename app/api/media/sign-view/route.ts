import { NextResponse } from 'next/server';

// TODO: Generate a signed Cloudinary delivery URL for private/authenticated media.
// Must run permission checks before signing.
export async function POST() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
