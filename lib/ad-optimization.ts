// AdSense optimization utilities for better revenue and user experience

export interface AdOptimizationConfig {
  enableLazyLoading: boolean
  enableViewabilityTracking: boolean
  enableA11yOptimization: boolean
  refreshInterval: number
  maxAdsPerPage: number
}

export class AdOptimizer {
  private static config: AdOptimizationConfig = {
    enableLazyLoading: true,
    enableViewabilityTracking: true,
    enableA11yOptimization: true,
    refreshInterval: 30000, // 30 seconds
    maxAdsPerPage: 6
  }

  private static adCount = 0
  private static viewabilityObserver: IntersectionObserver | null = null

  static initialize(config?: Partial<AdOptimizationConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    if (typeof window === "undefined") return

    this.setupViewabilityTracking()
    this.optimizeAdPlacement()
    this.setupAdRefresh()
  }

  private static setupViewabilityTracking(): void {
    if (!this.config.enableViewabilityTracking || typeof window === "undefined") return

    this.viewabilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const adElement = entry.target as HTMLElement
          const adSlot = adElement.getAttribute('data-ad-slot')
          
          if (entry.isIntersecting) {
            // Track ad impression
            this.trackAdImpression(adSlot || 'unknown', entry.intersectionRatio)
            
            // Lazy load ad if not already loaded
            if (!adElement.getAttribute('data-ad-loaded')) {
              this.loadAd(adElement)
            }
          }
        })
      },
      {
        threshold: [0.5, 1.0],
        rootMargin: '50px'
      }
    )

    // Observe existing ads
    this.observeAds()
  }

  private static observeAds(): void {
    const ads = document.querySelectorAll('.adsbygoogle')
    ads.forEach(ad => {
      if (this.viewabilityObserver) {
        this.viewabilityObserver.observe(ad)
      }
    })
  }

  private static loadAd(adElement: HTMLElement): void {
    try {
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({})
        adElement.setAttribute('data-ad-loaded', 'true')
      }
    } catch (error) {
      console.warn('Failed to load ad:', error)
    }
  }

  private static trackAdImpression(adSlot: string, visibilityRatio: number): void {
    if (typeof window !== "undefined" && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'ad_impression', {
        'ad_slot': adSlot,
        'visibility_ratio': visibilityRatio,
        'device_type': window.innerWidth < 768 ? 'mobile' : 'desktop',
        'tool_context': this.getCurrentToolContext()
      })
    
    }
  }

  private static getCurrentToolContext(): string {
    const pathname = typeof window !== "undefined" ? window.location.pathname : ""
    
    if (pathname.includes('pdf')) return 'pdf-tools'
    if (pathname.includes('image')) return 'image-tools'
    if (pathname.includes('qr')) return 'qr-tools'
    if (pathname.includes('text') || pathname.includes('json') || pathname.includes('html')) return 'text-tools'
    if (pathname.includes('seo')) return 'seo-tools'
    
    return 'general'
  }

  private static optimizeAdPlacement(): void {
    // Ensure ads are properly spaced and don't interfere with content
    const ads = document.querySelectorAll('.adsbygoogle')
    
    ads.forEach((ad, index) => {
      const adElement = ad as HTMLElement
      
      // Add proper spacing
      adElement.style.margin = '20px 0'
      adElement.style.clear = 'both'
      
      // Optimize for mobile
      if (window.innerWidth < 768) {
        adElement.style.margin = '15px 0'
        adElement.setAttribute('data-ad-format', 'fluid')
        adElement.setAttribute('data-full-width-responsive', 'true')
      }
      
      // Add loading placeholder
      if (!adElement.querySelector('.ad-placeholder')) {
        const placeholder = document.createElement('div')
        placeholder.className = 'ad-placeholder'
        placeholder.style.cssText = `
          background: #f3f4f6;
          border: 1px dashed #d1d5db;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          min-height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
        `
        placeholder.textContent = 'Advertisement'
        adElement.appendChild(placeholder)
        
        // Remove placeholder when ad loads
        const observer = new MutationObserver(() => {
          if (adElement.getAttribute('data-adsbygoogle-status') === 'done') {
            placeholder.remove()
            observer.disconnect()
          }
        })
        observer.observe(adElement, { attributes: true })
      }
    })
  }

  private static setupAdRefresh(): void {
    // Refresh ads periodically for better revenue (only for long sessions)
    let sessionTime = 0
    const refreshInterval = setInterval(() => {
      sessionTime += this.config.refreshInterval
      
      // Only refresh after 5 minutes and if user is active
      if (sessionTime > 5 * 60 * 1000 && this.isUserActive()) {
        this.refreshAds()
      }
    }, this.config.refreshInterval)

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(refreshInterval)
    })
  }

  private static isUserActive(): boolean {
    // Check if user has interacted recently
    const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0')
    const now = Date.now()
    return (now - lastActivity) < 60000 // Active within last minute
  }

  private static refreshAds(): void {
    try {
      const ads = document.querySelectorAll('.adsbygoogle[data-adsbygoogle-status="done"]')
      
      // Only refresh a subset of ads to avoid overwhelming
      const adsToRefresh = Array.from(ads).slice(0, 2)
      
      adsToRefresh.forEach(ad => {
        const adElement = ad as HTMLElement
        adElement.removeAttribute('data-adsbygoogle-status')
        
        if (typeof window !== "undefined" && (window as any).adsbygoogle) {
          (window as any).adsbygoogle.push({})
        }
      })
    } catch (error) {
      console.warn('Ad refresh failed:', error)
    }
  }

  // Get optimal ad slots for current page
  static getOptimalAdSlots(toolType: string, deviceType: string): string[] {
    const baseSlots = ['tool-header-banner']
    
    if (deviceType === 'mobile') {
      return [
        ...baseSlots,
        'mobile-canvas-content',
        'mobile-sidebar-banner',
        'mobile-bottom-banner'
      ]
    } else {
      return [
        ...baseSlots,
        `${toolType}-canvas-content`,
        `${toolType}-sidebar`,
        'tool-bottom-banner'
      ]
    }
  }

  // A/B test ad formats for better performance
  static getOptimalAdFormat(position: string, deviceType: string): string {
    const formats = {
      mobile: {
        header: 'fluid',
        content: 'auto',
        sidebar: 'auto',
        bottom: 'fluid'
      },
      desktop: {
        header: 'horizontal',
        content: 'rectangle',
        sidebar: 'vertical',
        bottom: 'horizontal'
      }
    }

    const deviceFormats = formats[deviceType as keyof typeof formats] || formats.desktop
    return deviceFormats[position as keyof typeof deviceFormats] || 'auto'
  }
}

// Track user activity for ad optimization
if (typeof window !== "undefined") {
  ['click', 'scroll', 'keypress', 'touchstart'].forEach(event => {
    window.addEventListener(event, () => {
      localStorage.setItem('lastActivity', Date.now().toString())
    }, { passive: true })
  })
}