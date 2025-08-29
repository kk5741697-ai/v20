"use client"

import { useState, useEffect } from "react"
import { MobileAdManager } from "@/components/ads/mobile-ad-manager"

interface ResponsiveToolWrapperProps {
  children: React.ReactNode
  toolName: string
  enableMobileAds?: boolean
  enableStickyAds?: boolean
}

export function ResponsiveToolWrapper({
  children,
  toolName,
  enableMobileAds = true,
  enableStickyAds = true
}: ResponsiveToolWrapperProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  useEffect(() => {
    // Add device-specific classes to body
    document.body.classList.remove('mobile-device', 'tablet-device', 'desktop-device')
    
    if (isMobile) {
      document.body.classList.add('mobile-device')
    } else if (isTablet) {
      document.body.classList.add('tablet-device')
    } else {
      document.body.classList.add('desktop-device')
    }

    return () => {
      document.body.classList.remove('mobile-device', 'tablet-device', 'desktop-device')
    }
  }, [isMobile, isTablet])

  return (
    <div className={`responsive-tool-wrapper ${isMobile ? 'mobile-layout' : isTablet ? 'tablet-layout' : 'desktop-layout'}`}>
      {children}
      
      {/* Mobile Ad Manager */}
      {enableMobileAds && isMobile && (
        <MobileAdManager 
          toolName={toolName}
          showBottomBanner={enableStickyAds}
          showSidebarAd={true}
        />
      )}
    </div>
  )
}