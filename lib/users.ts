// Shared staff-account types (PRD 8.1, 30.1), reused by the Users page and the
// /account self-service page.
//
// The role vocabulary is backed by the public.user_role Postgres enum. 'owner'
// was added in 20260801145000; see 20260801150000 for why account management
// belongs to it alone and how it differs from the PRD's original flat model.

export const USER_ROLES = ['admin', 'owner'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Display labels live HERE, not in the database, so the stored value stays
// stable while the presentation can change without a migration.
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  owner: 'Owner',
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// The minimum password this system will set. Matches the reset-password flow's
// own floor so a temporary password can never be weaker than one the account
// holder would be allowed to choose for themselves.
export const MIN_PASSWORD_LENGTH = 8;

// Permissive email shape check — enough to catch a typo, never strict enough to
// reject a real address. Same posture as the public contact form.
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
