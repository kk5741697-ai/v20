"use client"

import { useEffect } from "react"
import { APP_CONFIG } from "@/lib/config"

export function AdSenseAutoAds() {
  useEffect(() => {
    if (typeof window !== "undefined" && APP_CONFIG.enableAds && APP_CONFIG.adsensePublisherId) {
      try {
        // Initialize AdSense auto ads
        (window as any).adsbygoogle = (window as any).adsbygoogle || []
        
        // Push auto ads configuration
        if (!(window as any).autoAdsInitialized) {
          (window as any).adsbygoogle.push({
            google_ad_client: APP_CONFIG.adsensePublisherId,
            enable_page_level_ads: true,
            overlays: {
              bottom: true
            },
            auto_ad_client: APP_CONFIG.adsensePublisherId
          })
          ;(window as any).autoAdsInitialized = true
        }
      } catch (error) {
        console.warn("AdSense auto ads initialization failed:", error)
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}