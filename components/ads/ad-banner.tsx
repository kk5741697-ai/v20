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
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

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
        data-adtest={process.env.NODE_ENV === "development" ? "on" : "off"}
      />
    </div>
  )
}