import { NextResponse } from 'next/server'

export async function GET() {
  const robotsTxt = `
User-agent: *
Allow: /
Crawl-delay: 1

# Sitemaps
Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://pixoratools.com'}/sitemap.xml

# AdSense crawler
User-agent: Mediapartners-Google
Allow: /
Crawl-delay: 0

# Google AdSense
User-agent: Googlebot
Allow: /

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/
Disallow: /private/

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
`.trim()

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}