/* UI OVERHAUL: Load Lora (serif headings) and Inter (body text)
 * from Google Fonts to match Parsley Health's elegant typography. */
import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../contexts/auth.context';
import { QueryProvider } from '../providers/query.provider';
import { Toaster } from '../components/ui/sonner';

// Body font — clean, highly legible sans-serif
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Heading font — elegant serif for trust and authority
const lora = Lora({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'MedConnect — Telemedicine Platform',
  description:
    'Connect with doctors anytime, anywhere. Root-cause healthcare made accessible through modern telemedicine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* UI OVERHAUL: Apply both font CSS variables to the body */}
      <body className={`${inter.variable} ${lora.variable} ${inter.className}`}>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
