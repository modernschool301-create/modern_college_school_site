'use client';

// A submit button that asks for confirmation before the form posts. Reusable for
// every destructive admin action (delete, etc.).
export function ConfirmSubmitButton({
  children,
  confirmText = 'Are you sure?',
  className,
}: {
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
