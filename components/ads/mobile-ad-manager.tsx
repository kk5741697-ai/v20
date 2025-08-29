"use client"

import { useState, useEffect } from "react"
import { AdBanner } from "./ad-banner"
import { APP_CONFIG } from "@/lib/config"

interface MobileAdManagerProps {
  toolName: string
  showBottomBanner?: boolean
  showSidebarAd?: boolean
}

export function MobileAdManager({ 
  toolName, 
  showBottomBanner = true, 
  showSidebarAd = true 
}: MobileAdManagerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Add mobile ad body class for spacing
    if (isMobile && showBottomBanner) {
      document.body.classList.add('has-mobile-ad')
    } else {
      document.body.classList.remove('has-mobile-ad')
    }

    return () => {
      document.body.classList.remove('has-mobile-ad')
    }
  }, [isMobile, showBottomBanner])

  if (!APP_CONFIG.enableAds || !isMobile) {
    return null
  }

  return (
    <>
      {/* Mobile Bottom Sticky Banner */}
      {showBottomBanner && isVisible && (
        <div className="mobile-sticky-ad">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <AdBanner 
                adSlot="mobile-bottom-banner"
                adFormat="fluid"
                className="w-full"
                mobileOptimized={true}
              />
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="ml-2 p-2 text-gray-400 hover:text-gray-600"
              aria-label="Close ad"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Mobile Interstitial Ad Trigger */}
      <div className="hidden">
        <AdBanner 
          adSlot="mobile-interstitial"
          adFormat="auto"
          className="w-full"
          mobileOptimized={true}
        />
      </div>
    </>
  )
}