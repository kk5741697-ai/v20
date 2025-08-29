"use client"

import { useState, useEffect } from "react"
import { APP_CONFIG } from "@/lib/config"

interface AdBannerProps {
  adSlot?: string
  adFormat?: "auto" | "rectangle" | "vertical" | "horizontal"
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
  
  useEffect(() => {
    setIsClient(true)
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768)
    }
    
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 768)
      }
    }
    
    if (typeof window !== "undefined") {
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Don't render if ads are disabled
  if (!APP_CONFIG.enableAds || !APP_CONFIG.adsensePublisherId) {
    return null
  }

  // Don't render on server side
  if (!isClient) {
    return (
      <div className={`min-h-[90px] ${className}`} style={style}>
        {/* Placeholder for SSR */}
      </div>
    )
  }

  // Show placeholder in development
  if (process.env.NODE_ENV === "development") {
    return (
      <div className={`bg-gray-100 border border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm min-h-[90px] flex items-center justify-center ${sticky ? 'sticky-ad' : ''} ${mobileOptimized && isMobile ? 'mobile-sticky-ad' : ''} ${className}`}>
        <div className="text-gray-600 font-medium mb-1">Ad Space</div>
        <div className="text-xs text-gray-400">{adSlot}</div>
      </div>
    )
  }

  // Initialize ads after component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && APP_CONFIG.enableAds) {
      try {
        ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
        ;(window as any).adsbygoogle.push({})
      } catch (error) {
        console.warn("AdSense initialization failed:", error)
      }
    }
  }, [])

  // Enhanced mobile ad format
  const getMobileAdFormat = () => {
    if (!isMobile) return adFormat
    
    switch (adFormat) {
      case "horizontal":
        return "fluid"
      case "rectangle":
        return "auto"
      default:
        return "auto"
    }
  }

  const getAdStyle = () => {
    const baseStyle = {
      display: "block",
      textAlign: "center" as const,
      minHeight: isMobile ? "60px" : "90px",
      ...style
    }
    
    if (mobileOptimized && isMobile) {
      return {
        ...baseStyle,
        width: "100%",
        maxWidth: "100%"
      }
    }
    
    return baseStyle
  }

  return (
    <div className={`ad-container ${isMobile ? 'min-h-[60px]' : 'min-h-[90px]'} flex items-center justify-center ${sticky ? 'sticky-ad' : ''} ${mobileOptimized && isMobile ? 'mobile-sticky-ad' : ''} ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={getAdStyle()}
        data-ad-client={APP_CONFIG.adsensePublisherId}
        data-ad-slot={adSlot}
        data-ad-format={getMobileAdFormat()}
        data-full-width-responsive={fullWidthResponsive.toString()}
        data-adtest={process.env.NODE_ENV === "development" ? "on" : "off"}
        data-ad-channel={isMobile ? "mobile" : "desktop"}
      />
    </div>
  )
}