# PixoraTools - Professional Online Tools Platform

A comprehensive web tools platform with 300+ professional utilities for PDF, image, QR code, text, and SEO operations.

## Features

- **PDF Tools**: Merge, split, compress, convert, and protect PDF files
- **Image Tools**: Resize, compress, convert, crop, rotate, and edit images
- **QR & Barcode Tools**: Generate and scan QR codes and barcodes
- **Text & Code Tools**: Format, validate, and convert text and code
- **SEO Tools**: Generate meta tags, sitemaps, and analyze SEO
- **Utilities**: Password generator, converters, calculators, and more

## Configuration

### Ads System

The ads system is **enabled by default** with proper AdSense integration:

#### AdSense Features:
- **SPA Compatibility**: Ads work with Next.js client-side navigation
- **Responsive Design**: Ads adapt to mobile and desktop layouts
- **Strategic Placement**: Ads in canvas areas, sidebars, and content sections
- **GDPR Compliant**: Proper consent management and privacy controls
- **Performance Optimized**: Lazy loading and non-blocking ad initialization

#### Ad Placements:
- Homepage feature section
- Tool canvas areas (overlay and bottom)
- Tool sidebars (desktop)
- Mobile bottom banners
- Upload areas (mobile)
- Footer sections

#### Configuration:
The AdSense publisher ID is set in `lib/config.ts`. Auto ads are disabled for better control over ad placement and user experience.

#### AdSense Setup Instructions:
1. **Publisher ID**: Already configured with `ca-pub-4755003409431265`
2. **Ad Slots**: Default slot IDs are set (you can customize these in each component)
3. **Approval Process**: Once you get AdSense approval, ads will automatically start showing
4. **No Additional Setup**: The ad code is already integrated - just wait for approval
5. **Custom Slots**: After approval, you can create specific ad units in AdSense dashboard and update slot IDs

#### Current Ad Slot Configuration:
- All ad slots use default ID `1234567890` (placeholder)
- After AdSense approval, you can:
  - Keep default slots (ads will show automatically)
  - Create custom ad units in AdSense dashboard
  - Update slot IDs in components for better tracking

#### Development vs Production:
- **Development**: Shows placeholder ad spaces with slot information
- **Production**: Will display actual AdSense ads after approval
- **Testing**: Use `data-adtest="on"` attribute for testing (already configured)
### Search Functionality

- Global search across all tools
- Keyboard shortcut: `Cmd/Ctrl + K`
- Real-time filtering and categorization
- Works on all domains and pages

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Domain Structure

- `pixoratools.com` - Main platform with all tools
- `pixorapdf.com` - PDF-focused tools
- `pixoraimg.com` - Image editing tools  
- `pixoraqrcode.com` - QR and barcode tools
- `pixoracode.com` - Code and development tools
- `pixoraseo.com` - SEO and marketing tools

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with custom styling
- **PDF Processing**: PDF-lib for client-side PDF manipulation
- **Image Processing**: Canvas API for client-side image editing
- **QR Codes**: qrcode library for generation
- **File Handling**: JSZip for bulk downloads

## License

MIT License - see LICENSE file for details