import './globals.css';
import { Outfit } from 'next/font/google';
import OfflineBanner from '@/components/OfflineBanner';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'CrisisLink \u2014 Emergency Response Platform',
  description: 'Real-time emergency detection, alerting, and cross-team coordination for hospitality venues.',
  keywords: 'emergency, crisis, hospitality, hotel, response, coordination',
};

export const viewport = {
  themeColor: '#E63946',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
 
      <body className={`${outfit.className} bg-[#05070F] text-white antialiased`} suppressHydrationWarning>
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
