"use client"

import { APP_CONFIG } from "@/lib/config"

interface AdBannerProps {
  adSlot?: string
  adFormat?: "auto" | "rectangle" | "vertical" | "horizontal"
  fullWidthResponsive?: boolean
  className?: string
  style?: React.CSSProperties
}

export function AdBanner({
  adSlot = "default",
  adFormat = "auto",
  fullWidthResponsive = true,
  className = "",
  style = {}
}: AdBannerProps) {
  // Don't render if ads are disabled
  if (!APP_CONFIG.enableAds || !APP_CONFIG.adsensePublisherId) {
    return null
  }

  // Don't render in development
  if (process.env.NODE_ENV === "development") {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-8 text-center ${className}`}>
        <div className="text-blue-600 font-medium mb-2">Advertisement Space</div>
        <div className="text-blue-500 text-sm">AdSense Banner ({adSlot})</div>
        <div className="text-xs text-blue-400 mt-2">728x90 • Auto-responsive</div>
      </div>
    )
  }

  return (
    <div className={`ad-container ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          textAlign: "center",
          ...style
        }}
        data-ad-client={APP_CONFIG.adsensePublisherId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
      />
    </div>
  )
}