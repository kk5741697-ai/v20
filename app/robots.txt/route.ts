import { NextResponse } from 'next/server'

export async function GET() {
  const robotsTxt = `
User-agent: *
Allow: /
Crawl-delay: 0.5

# Sitemaps
Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://pixoratools.com'}/sitemap.xml

# AdSense crawler
User-agent: Mediapartners-Google
Allow: /
Crawl-delay: 0

# Google AdSense
User-agent: Googlebot
Allow: /
Crawl-delay: 0.2

# Bing crawler
User-agent: Bingbot
Allow: /
Crawl-delay: 0.5

# Yahoo crawler  
User-agent: Slurp
Allow: /
Crawl-delay: 1

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/
Disallow: /private/
Disallow: /temp/
Disallow: /.well-known/

# Security - Block potentially harmful content
Disallow: /download/
Disallow: /files/
Disallow: /uploads/
Disallow: /tmp/
Disallow: *.exe
Disallow: *.zip$
Disallow: *.rar$
Disallow: *.dmg$
Disallow: *.pkg$
Disallow: *.deb$
Disallow: *.msi$

# Allow important pages
Allow: /pdf-tools/
Allow: /image-tools/
Allow: /qr-tools/
Allow: /text-tools/
Allow: /seo-tools/
Allow: /utilities/
Allow: /converters/
Allow: /about/
Allow: /contact/
Allow: /pricing/
Allow: /help/
Allow: /api-docs/
Allow: /billing/

# Tool pages
Allow: /pdf-merger
Allow: /pdf-splitter
Allow: /pdf-compressor
Allow: /image-resizer
Allow: /image-compressor
Allow: /image-converter
Allow: /image-cropper
Allow: /qr-code-generator
Allow: /json-formatter
Allow: /background-remover
Allow: /password-generator
Allow: /seo-meta-generator
`.trim()

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}