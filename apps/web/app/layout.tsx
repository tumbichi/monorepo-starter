import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@repo/ui/globals.css';
import { Toaster } from '@repo/ui/components/sonner';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'web',
    template: '%s · web',
  },
  description: 'App generada desde monorepo-starter',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <main className="container py-10">{children}</main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
