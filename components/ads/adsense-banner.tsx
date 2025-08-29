"use client"

import { useEffect, useRef, useState } from "react"
import { APP_CONFIG } from "@/lib/config"

interface AdSenseBannerProps {
  adSlot: string
  adFormat?: "auto" | "rectangle" | "vertical" | "horizontal"
  fullWidthResponsive?: boolean
  className?: string
  style?: React.CSSProperties
}

export function AdSenseBanner({
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
  className = "",
  style = {}
}: AdSenseBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Initialize ad after component mounts and DOM is ready
    if (isClient && typeof window !== "undefined" && adRef.current && APP_CONFIG.enableAds) {
      try {
        // Ensure adsbygoogle array exists
        ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
        
        // Push ad for initialization
        ;(window as any).adsbygoogle.push({})
      } catch (error) {
        console.warn("AdSense ad initialization failed:", error)
      }
    }
  }, [isClient])

  // Don't render if ads are disabled
  if (!APP_CONFIG.enableAds || !APP_CONFIG.adsensePublisherId) {
    return null
  }

  // Don't render on server side
  if (!isClient) {
    return null
  }

  // Show placeholder in development
  if (process.env.NODE_ENV === "development") {
    return (
      <div className={`bg-gray-100 border border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm ${className}`}>
        <div className="text-gray-600 font-medium mb-1">AdSense Banner</div>
        <div className="text-xs text-gray-400">{adSlot}</div>
      </div>
    )
  }

  return (
    <div ref={adRef} className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          textAlign: "center",
          ...style
        }}
        data-ad-client="ca-pub-4755003409431265"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
        data-adtest={process.env.NODE_ENV === "development" ? "on" : "off"}
      />
    </div>
  )
}