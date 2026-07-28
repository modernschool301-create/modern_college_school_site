import { createClient } from '@/lib/supabase/server';
import { setContactStatus } from './actions';

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  verification: 'verified' | 'unverified_review';
  created_at: string;
};

// Display timestamps in Nepal Standard Time (UTC+05:45), per CLAUDE.md.
const NPT = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kathmandu',
});

const STATUSES = ['new', 'read', 'archived'] as const;

export default async function AdminContactMessagesPage() {
  // Admin-only: the /admin layout already enforced the live active-admin check.
  // This SELECT is additionally gated by the contact_messages admin RLS policy.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contact_messages')
    .select('id, name, email, message, status, verification, created_at')
    .order('created_at', { ascending: false });

  const messages = (data ?? []) as ContactMessage[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Contact Messages</h1>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Could not load messages: {error.message}
        </p>
      )}

      {messages.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          No messages yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {messages.map((m) => (
            <li
              key={m.id}
              className="rounded-md border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-ink">{m.name}</span>
                <a
                  href={`mailto:${m.email}`}
                  className="text-ink-muted underline underline-offset-2 hover:text-ink"
                >
                  {m.email}
                </a>
                <span className="text-ink-faint">·</span>
                <span className="text-ink-muted">
                  {NPT.format(new Date(m.created_at))}
                </span>
                <span className="badge badge-neutral uppercase">
                  {m.status}
                </span>
                {m.verification === 'unverified_review' && (
                  <span className="badge badge-warning uppercase">
                    unverified · review
                  </span>
                )}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-ink">
                {m.message}
              </p>

              {/* Status change — admin UPDATE policy. No delete control exists. */}
              <form
                action={setContactStatus}
                className="mt-3 flex items-center gap-2"
              >
                <input type="hidden" name="id" value={m.id} />
                <label htmlFor={`status-${m.id}`} className="text-xs text-ink-muted">
                  Set status
                </label>
                <select
                  id={`status-${m.id}`}
                  name="status"
                  defaultValue={m.status}
                  className="px-2 py-1 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist"
                >
                  Update
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
