"use client"

import { useEffect } from "react"
import { APP_CONFIG } from "@/lib/config"

export function AdSenseAutoAds() {
  useEffect(() => {
    // Initialize AdSense for both initial page load and SPA navigation
    const initializeAds = () => {
      if (typeof window === "undefined" || !APP_CONFIG.enableAds || !APP_CONFIG.adsensePublisherId) {
        return
      }
      
      try {
        // Initialize AdSense for SPA (Single Page Application)
        (window as any).adsbygoogle = (window as any).adsbygoogle || []
        
        // Push ads that are already on the page
        const adsElements = document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])')
        adsElements.forEach(() => {
          try {
            ;(window as any).adsbygoogle.push({})
          } catch (e) {
            console.warn("AdSense push failed:", e)
          }
        })
        
        // Initialize auto ads only once
        if (!(window as any).autoAdsInitialized && APP_CONFIG.enableAutoAds) {
          (window as any).adsbygoogle.push({
            google_ad_client: APP_CONFIG.adsensePublisherId,
            enable_page_level_ads: true,
            overlays: {
              bottom: true
            },
            auto_ad_client: APP_CONFIG.adsensePublisherId,
            page_level_ads: {
              enabled: true
            }
          })
          ;(window as any).autoAdsInitialized = true
        }
      } catch (error) {
        console.warn("AdSense auto ads initialization failed:", error)
      }
    }

    // Initialize on mount
    initializeAds()

    // Re-initialize on route changes (for SPA navigation)
    const handleRouteChange = () => {
      setTimeout(initializeAds, 100) // Small delay to ensure DOM is ready
    }

    // Listen for Next.js route changes
    if (typeof window !== "undefined") {
      window.addEventListener('popstate', handleRouteChange)
      
      // Also listen for pushState/replaceState (programmatic navigation)
      const originalPushState = history.pushState
      const originalReplaceState = history.replaceState
      
      history.pushState = function(...args) {
        originalPushState.apply(history, args)
        handleRouteChange()
      }
      
      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args)
        handleRouteChange()
      }
      
      return () => {
        window.removeEventListener('popstate', handleRouteChange)
        history.pushState = originalPushState
        history.replaceState = originalReplaceState
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}