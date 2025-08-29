import { NextResponse } from 'next/server'

export async function GET() {
  const adsTxt = `google.com, pub-4755003409431265, DIRECT, f08c47fec0942fa0

# Additional verification for AdSense
# This file verifies ownership of pixoratools.com for Google AdSense
# Publisher ID: ca-pub-4755003409431265
# Site URL: https://pixoratools.com

# Additional ad networks can be added here
# Format: domain, publisher_id, relationship, certification_authority_id`

  return new NextResponse(adsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}