export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // TODO: admin sidebar/nav. Access is gated by middleware.ts.
  return <>{children}</>;
}
