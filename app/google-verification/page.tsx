import { NextResponse } from 'next/server'

// Google Site Verification page
export default function GoogleVerificationPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Google Site Verification</h1>
        <p className="text-gray-600 mb-4">
          This page helps verify your site ownership for Google AdSense.
        </p>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-sm font-mono">
            Publisher ID: ca-pub-4755003409431265
          </p>
          <p className="text-sm font-mono mt-2">
            Site: https://pixoratools.com
          </p>
        </div>
      </div>
    </div>
  )
}