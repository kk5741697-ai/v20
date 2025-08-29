import { NextResponse } from 'next/server'

export async function GET() {
  return new NextResponse('google-site-verification: google6adf6312a96691f1.html', {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}