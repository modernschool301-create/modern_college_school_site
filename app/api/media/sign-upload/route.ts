import { NextResponse } from 'next/server';

// TODO: Generate a signed Cloudinary upload signature.
// Must run bot detection + permission checks before signing.
export async function POST() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
