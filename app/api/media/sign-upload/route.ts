import { NextResponse } from 'next/server';
import { getActiveAdminContext } from '@/lib/auth-guard';
import {
  UPLOAD_PURPOSES,
  signUpload,
  type UploadPurpose,
} from '@/lib/cloudinary-sign';

// POST { purpose } → signed Cloudinary upload params (PRD 10.3). The browser
// states only a PURPOSE; the server maps it to a fixed folder, checks the caller
// may use it, and signs. The browser never names the folder or delivery type.
export async function POST(request: Request) {
  let purpose: string | undefined;
  try {
    const body = await request.json();
    purpose = body?.purpose;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const config = purpose
    ? UPLOAD_PURPOSES[purpose as UploadPurpose]
    : undefined;
  if (!config) {
    return NextResponse.json({ error: 'Unknown purpose.' }, { status: 400 });
  }

  // Public-content purposes require an active admin session. (The future
  // anonymous admission-document purpose will branch here with rate limiting.)
  // A route handler must answer with JSON, so this uses the non-redirecting
  // probe and keeps the 401 (no session) vs 403 (session, not an active admin)
  // distinction.
  if (config.requiresAdmin) {
    const { user, isAdmin } = await getActiveAdminContext();
    if (!user) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
    }
    if (!isAdmin) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
  }

  const signed = signUpload(config);
  if (!signed) {
    return NextResponse.json(
      { error: 'Upload is not configured.' },
      { status: 500 },
    );
  }

  return NextResponse.json(signed);
}
