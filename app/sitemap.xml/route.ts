import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pixoratools.com'
  
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/about', priority: '0.8', changefreq: 'monthly' },
    { url: '/contact', priority: '0.8', changefreq: 'monthly' },
    { url: '/privacy', priority: '0.6', changefreq: 'yearly' },
    { url: '/terms', priority: '0.6', changefreq: 'yearly' },
    { url: '/pricing', priority: '0.9', changefreq: 'weekly' },
    { url: '/help', priority: '0.8', changefreq: 'weekly' },
    { url: '/api-docs', priority: '0.7', changefreq: 'monthly' },
    { url: '/billing', priority: '0.5', changefreq: 'monthly' }
  ]

  const categoryPages = [
    { url: '/pdf-tools', priority: '0.9', changefreq: 'weekly' },
    { url: '/image-tools', priority: '0.9', changefreq: 'weekly' }, 
    { url: '/qr-tools', priority: '0.9', changefreq: 'weekly' },
    { url: '/text-tools', priority: '0.9', changefreq: 'weekly' },
    { url: '/seo-tools', priority: '0.9', changefreq: 'weekly' },
    { url: '/utilities', priority: '0.8', changefreq: 'weekly' },
    { url: '/converters', priority: '0.8', changefreq: 'weekly' }
  ]

  const toolPages = [
    // PDF Tools
    { url: '/pdf-merger', priority: '0.8', changefreq: 'weekly' },
    { url: '/pdf-splitter', priority: '0.8', changefreq: 'weekly' }, 
    { url: '/pdf-compressor', priority: '0.8', changefreq: 'weekly' },
    { url: '/pdf-to-image', priority: '0.7', changefreq: 'weekly' },
    { url: '/pdf-to-word', priority: '0.7', changefreq: 'weekly' },
    { url: '/pdf-password-protector', priority: '0.7', changefreq: 'weekly' },
    { url: '/pdf-unlock', priority: '0.7', changefreq: 'weekly' },
    { url: '/pdf-watermark', priority: '0.7', changefreq: 'weekly' },
    { url: '/pdf-organizer', priority: '0.7', changefreq: 'weekly' },
    
    // Image Tools
    { url: '/image-to-pdf', priority: '0.8', changefreq: 'weekly' },
    { url: '/image-resizer', priority: '0.9', changefreq: 'weekly' },
    { url: '/image-compressor', priority: '0.9', changefreq: 'weekly' },
    { url: '/image-converter', priority: '0.8', changefreq: 'weekly' },
    { url: '/image-cropper', priority: '0.8', changefreq: 'weekly' },
    { url: '/image-rotator', priority: '0.7', changefreq: 'weekly' },
    { url: '/background-remover', priority: '0.9', changefreq: 'weekly' },
    { url: '/image-flipper', priority: '0.7', changefreq: 'weekly' },
    { url: '/image-filters', priority: '0.8', changefreq: 'weekly' },
    { url: '/image-upscaler', priority: '0.8', changefreq: 'weekly' },
    { url: '/image-watermark', priority: '0.7', changefreq: 'weekly' },
    
    // QR Tools
    { url: '/qr-code-generator', priority: '0.9', changefreq: 'weekly' },
    { url: '/qr-scanner', priority: '0.8', changefreq: 'weekly' },
    { url: '/barcode-generator', priority: '0.8', changefreq: 'weekly' },
    { url: '/bulk-qr-generator', priority: '0.7', changefreq: 'weekly' },
    { url: '/wifi-qr-generator', priority: '0.8', changefreq: 'weekly' },
    { url: '/vcard-qr-generator', priority: '0.8', changefreq: 'weekly' },
    
    // Text Tools
    { url: '/json-formatter', priority: '0.9', changefreq: 'weekly' },
    { url: '/base64-encoder', priority: '0.8', changefreq: 'weekly' },
    { url: '/url-encoder', priority: '0.8', changefreq: 'weekly' },
    { url: '/text-case-converter', priority: '0.7', changefreq: 'weekly' },
    { url: '/hash-generator', priority: '0.7', changefreq: 'weekly' },
    { url: '/xml-formatter', priority: '0.7', changefreq: 'weekly' },
    { url: '/html-formatter', priority: '0.7', changefreq: 'weekly' },
    { url: '/css-minifier', priority: '0.7', changefreq: 'weekly' },
    { url: '/js-minifier', priority: '0.7', changefreq: 'weekly' },
    
    // SEO Tools
    { url: '/seo-meta-generator', priority: '0.8', changefreq: 'weekly' },
    { url: '/sitemap-generator', priority: '0.8', changefreq: 'weekly' },
    
    // Utilities
    { url: '/password-generator', priority: '0.8', changefreq: 'weekly' },
    { url: '/lorem-ipsum-generator', priority: '0.7', changefreq: 'weekly' },
    { url: '/uuid-generator', priority: '0.7', changefreq: 'weekly' },
    { url: '/random-number-generator', priority: '0.7', changefreq: 'weekly' },
    { url: '/text-diff-checker', priority: '0.7', changefreq: 'weekly' },
    { url: '/word-counter', priority: '0.7', changefreq: 'weekly' },
    { url: '/unit-converter', priority: '0.8', changefreq: 'weekly' },
    { url: '/currency-converter', priority: '0.8', changefreq: 'weekly' }, 
    { url: '/color-converter', priority: '0.7', changefreq: 'weekly' }
  ]

  const allPages = [...staticPages, ...categoryPages, ...toolPages]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}