import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
  if (config.requiresAdmin) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
    }
    const { data: isActiveAdmin } = await supabase.rpc(
      'current_user_is_active_admin',
    );
    if (!isActiveAdmin) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
  }

  const signed = signUpload(config.folder);
  if (!signed) {
    return NextResponse.json(
      { error: 'Upload is not configured.' },
      { status: 500 },
    );
  }

  return NextResponse.json(signed);
}
