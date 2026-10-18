import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Egyedi Árazó, Sablon Varázsló & Blokkos PDF Generátor',
  description:
    'Pergolák, előtetők, napellenzők, üvegtetők és árnyékolók végigvezetett árazó és utólag is szerkeszthető PDF árajánlat-készítő rendszere.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
