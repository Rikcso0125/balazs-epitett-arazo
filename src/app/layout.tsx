import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenSky Pergola - Árazó',
  description:
    'OpenSky Pergola Kft. árazó rendszer: végigvezetett árazás és szerkeszthető PDF árajánlatok.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body>
        {children}
      </body>
    </html>
  );
}
