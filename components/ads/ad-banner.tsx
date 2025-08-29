"use client"

import { useEffect, useRef, useState } from "react"
import { APP_CONFIG } from "@/lib/config"

interface AdBannerProps {
  adSlot?: string
  adFormat?: "auto" | "rectangle" | "vertical" | "horizontal" | "fluid"
  fullWidthResponsive?: boolean
  className?: string
  style?: React.CSSProperties
  mobileOptimized?: boolean
  sticky?: boolean
}

export function AdBanner({
  adSlot = "default",
  adFormat = "auto",
  fullWidthResponsive = true,
  className = "",
  style = {},
  mobileOptimized = false,
  sticky = false
}: AdBannerProps) {
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const adRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    setIsClient(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isClient && adRef.current && APP_CONFIG.enableAds && APP_CONFIG.adsensePublisherId) {
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || []
        ;(window as any).adsbygoogle.push({})
      } catch (error) {
        console.warn('AdSense initialization failed:', error)
      }
    }
  }, [isClient])

  // Don't render if ads are disabled
  if (!APP_CONFIG.enableAds || !APP_CONFIG.adsensePublisherId) {
    return null
  }

  if (!isClient) {
    return (
      <div className={`min-h-[90px] bg-gray-50 rounded-lg ${className}`} style={style}>
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Advertisement
        </div>
      </div>
    )
  }

  if (process.env.NODE_ENV === "development") {
    return (
      <div className={`bg-gray-100 border border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm min-h-[90px] flex items-center justify-center ${className}`}>
        <div>
          <div className="text-gray-600 font-medium mb-1">Ad Space</div>
          <div className="text-xs text-gray-400">{adSlot}</div>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={adRef}
      className={`ad-container ${isMobile ? 'min-h-[60px]' : 'min-h-[90px]'} flex items-center justify-center ${sticky ? 'sticky top-4' : ''} ${className}`} 
      style={style}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          textAlign: "center",
          minHeight: isMobile ? "60px" : "90px",
          width: "100%",
          ...style
        }}
        data-ad-client={APP_CONFIG.adsensePublisherId}
        data-ad-slot={adSlot}
        data-ad-format={mobileOptimized && isMobile ? "fluid" : adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
        data-ad-channel={isMobile ? "mobile" : "desktop"}
      />
    </div>
  )
}