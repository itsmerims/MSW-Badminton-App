import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { ClubProvider } from '@/context/ClubContext';
import { ConditionalHeader } from '@/components/layout/ConditionalHeader';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MSW Badminton | Badminton Club',
  description: 'Badminton court queuing and matching for MSW Badminton.',
  icons: {
    icon: '/mswlogo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <ThemeProvider>
          <ClubProvider>
            <div className="flex flex-col min-h-screen w-full overflow-hidden">
              <ConditionalHeader />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
            <Toaster />
          </ClubProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
