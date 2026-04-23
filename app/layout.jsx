import './globals.css';

export const metadata = {
  title: 'CrisisLink — Emergency Response Platform',
  description: 'Real-time emergency detection, alerting, and cross-team coordination for hospitality venues.',
  keywords: 'emergency, crisis, hospitality, hotel, response, coordination',
};

export const viewport = {
  themeColor: '#E63946',
  width: 'device-width',
  initialScale: 1,
};


import OfflineBanner from '@/components/OfflineBanner';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>

      <body className="bg-navy text-white antialiased">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
