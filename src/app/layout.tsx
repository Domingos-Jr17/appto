import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PwaProvider } from "@/components/providers/PwaProvider";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "aptto - Copiloto Académico com IA",
  description: "Plataforma inteligente de apoio à escrita académica para estudantes moçambicanos. Estrutura trabalhos, escreve em português académico, normaliza referências ABNT.",
  keywords: ["aptto", "escrita académica", "IA", "Moçambique", "ABNT", "monografia", "trabalho académico"],
  authors: [{ name: "aptto" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "aptto - Copiloto Académico com IA",
    description: "O seu assistente inteligente para trabalhos académicos em Moçambique",
    siteName: "aptto",
    type: "website",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
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
        </ThemeProvider>
      </body>
    </html>
  );
}
