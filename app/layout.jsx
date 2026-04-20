import './globals.css';

export const metadata = {
  title: 'CrisisLink — Emergency Response Platform',
  description: 'Real-time emergency detection, alerting, and cross-team coordination for hospitality venues.',
  keywords: 'emergency, crisis, hospitality, hotel, response, coordination',
  themeColor: '#E63946',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#E63946" />
        {/* Dark mode: apply class from localStorage before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('crisislink_theme');
                  if (stored === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else if (!stored) {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (!prefersDark) document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-navy text-white antialiased">
        {children}
      </body>
    </html>
  );
}
