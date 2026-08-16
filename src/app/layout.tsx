import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  // TODO: replace with the production domain before deploying
  metadataBase: new URL('https://play-pass-and-go.vercel.app'),
  title: {
    default: 'Play, Pass & Go',
    template: '%s | Play, Pass & Go',
  },
  description:
    'Play, Pass & Go is a free local pass-and-play property trading game for desktop and tablet. Buy, rent, trade, and build your real-estate empire with 2–4 players on one device.',
  applicationName: 'Play, Pass & Go',
  keywords: [
    'pass and play',
    'property trading game',
    'board game',
    'local multiplayer',
    'dice game',
    'browser game',
    'free online board game',
  ],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Play, Pass & Go',
    title: 'Play, Pass & Go',
    description:
      'Free local pass-and-play property trading for desktop & tablet. Buy, rent, trade, and build an empire with 2–4 players on one device.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Play, Pass & Go',
    description:
      'Free local pass-and-play property trading for desktop & tablet. 2–4 players, one device.',
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
