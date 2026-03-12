import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

export const viewport: Viewport = {
  themeColor: '#22c55e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'DataLink Parañaque | Land Data Processor',
  description: 'Modern, professional real property data cleaner and converter for Parañaque City.',
  manifest: '/manifest.json',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='6' fill='%2322c55e'/><path d='M12 5c-4.97 0-9 1.34-9 3s4.03 3 9 3 9-1.34 9-3-4.03-3-9-3zM3 8v11c0 1.66 4.03 3 9 3s9-1.34 9-3V8c0 1.66-4.03 3-9 3s-9-1.34-9-3z' fill='white'/></svg>",
    apple: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='6' fill='%2322c55e'/><path d='M12 5c-4.97 0-9 1.34-9 3s4.03 3 9 3 9-1.34 9-3-4.03-3-9-3zM3 8v11c0 1.66 4.03 3 9 3s9-1.34 9-3V8c0 1.66-4.03 3-9 3s-9-1.34-9-3z' fill='white'/></svg>",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DataLink PQ',
  },
  formatDetection: {
    telephone: false,
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
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-primary/20" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
