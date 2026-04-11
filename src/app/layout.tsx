import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PwaProvider } from "@/components/providers/PwaProvider";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout");

  return {
    title: t("title"),
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    authors: [{ name: "aptto" }],
    icons: {
      icon: "/logo.svg",
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      siteName: "aptto",
      type: "website",
    },
    manifest: "/manifest.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <PwaProvider />
              {children}
            </AuthProvider>
            <Toaster position="top-right" />
            <Analytics />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
