import type { Metadata } from 'next';
import { Bricolage_Grotesque, Hanken_Grotesk, Geist_Mono } from 'next/font/google';
import './globals.css';

// Self-hosted via next/font — no layout shift, no runtime request to Google.
// Each exposes a CSS variable that the @theme font tokens map to their role.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const body = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Modern College & School',
    template: '%s · Modern College & School',
  },
  description:
    'Modern College & School, Bhaktapur — a modern +2 and Bachelor’s institution. Education for peace and prosperity, since 1993.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
