import type React from "react"
import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { APP_CONFIG } from "@/lib/config"
import { SecurityBanner } from "@/components/security-banner"
import Script from "next/script"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "PixoraTools - Every tool you could want to edit images in bulk",
  description:
    "Your online photo editor is here and forever free! Compress, resize, crop, convert images and more with 300+ professional tools.",
  generator: "PixoraTools",
  keywords: "image tools, pdf tools, qr generator, online tools, photo editor, image converter, pdf merger, compress image, resize image, crop image, convert image, background remover, web tools, free tools",
  robots: "index, follow",
  openGraph: {
    title: "PixoraTools - Professional Online Tools Platform",
    description: "300+ professional web tools for PDF, image, QR, code, and SEO tasks. Fast, secure, and free.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PixoraTools - Professional Online Tools",
    description: "300+ professional web tools for PDF, image, QR, code, and SEO tasks.",
  },
  verification: {
    google: "google6adf6312a96691f1",
  },
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#3b82f6',
  }
}
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-4755003409431265" />
        <meta name="google-site-verification" content="google6adf6312a96691f1" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4755003409431265"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-CMZ40J80GE" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CMZ40J80GE');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${poppins.variable} antialiased`} suppressHydrationWarning>
        <SecurityBanner />
        {children}
        <Toaster />
        
        <Script id="adsense-init" strategy="afterInteractive">
          {`
            (function() {
              function initAdsense() {
                try {
                  (window.adsbygoogle = window.adsbygoogle || []).push({
                    google_ad_client: "ca-pub-4755003409431265",
                    enable_page_level_ads: true,
                    overlays: {
                      bottom: true
                    }
                  });
                } catch (e) {
                  console.warn('AdSense initialization failed:', e);
                }
              }
              
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initAdsense);
              } else {
                initAdsense();
              }
            })();
          `}
        </Script>
      </body>
    </html>
  )
}