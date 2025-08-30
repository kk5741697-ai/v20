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
}

// Enhanced AdSense optimization for web tools platform
export interface AdOptimizationConfig {
  enableLazyLoading: boolean
  enableViewabilityTracking: boolean
  enableA11yOptimization: boolean
  refreshInterval: number
  maxAdsPerPage: number
  enableBounceProtection: boolean
  minSessionTime: number
  enableFrequencyControl: boolean
}

export class AdOptimizer {
  private static config: AdOptimizationConfig = {
    enableLazyLoading: true,
    enableViewabilityTracking: true,
    enableA11yOptimization: true,
    refreshInterval: 45000, // 45 seconds
    maxAdsPerPage: 4, // Reduced for tools
    enableBounceProtection: true,
    minSessionTime: 30000, // 30 seconds minimum
    enableFrequencyControl: true
  }

  private static adCount = 0
  private static viewabilityObserver: IntersectionObserver | null = null
  private static sessionStartTime = Date.now()
  private static pageViews = 0
  private static toolUsage = 0

  static initialize(config?: Partial<AdOptimizationConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    if (typeof window === "undefined") return

    this.setupBounceProtection()
    this.setupViewabilityTracking()
    this.optimizeAdPlacement()
    this.setupAdRefresh()
    this.trackUserEngagement()
  }

  private static setupBounceProtection(): void {
    if (!this.config.enableBounceProtection) return

    // Track page views and tool usage
    this.pageViews++
    
    // Track tool usage
    const toolButtons = document.querySelectorAll('[data-tool-action]')
    toolButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.toolUsage++
        this.trackToolUsage()
      })
    })

    // Delay ad initialization for bouncy users
    const sessionTime = Date.now() - this.sessionStartTime
    if (sessionTime < this.config.minSessionTime && this.pageViews > 3) {
      // User is bouncing quickly, delay ads
      setTimeout(() => {
        this.initializeAdsWithDelay()
      }, this.config.minSessionTime - sessionTime)
      return
    }

    this.initializeAdsWithDelay()
  }

  private static initializeAdsWithDelay(): void {
    // Only show ads if user has engaged with tools
    if (this.toolUsage > 0 || this.pageViews > 2) {
      this.setupViewabilityTracking()
    }
  }

  private static trackUserEngagement(): void {
    let engagementScore = 0
    
    // Track scroll depth
    let maxScroll = 0
    window.addEventListener('scroll', () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      maxScroll = Math.max(maxScroll, scrollPercent)
      
      if (maxScroll > 50) {
        engagementScore += 1
      }
    })

    // Track time on page
    setTimeout(() => {
      engagementScore += 2
      this.updateAdStrategy(engagementScore)
    }, 30000) // 30 seconds

    // Track file uploads
    const fileInputs = document.querySelectorAll('input[type="file"]')
    fileInputs.forEach(input => {
      input.addEventListener('change', () => {
        engagementScore += 3
        this.updateAdStrategy(engagementScore)
      })
    })
  }

  private static updateAdStrategy(engagementScore: number): void {
    if (engagementScore >= 5) {
      // High engagement - show more ads
      this.config.maxAdsPerPage = 6
      this.config.refreshInterval = 30000
    } else if (engagementScore >= 3) {
      // Medium engagement - balanced approach
      this.config.maxAdsPerPage = 4
      this.config.refreshInterval = 45000
    } else {
      // Low engagement - fewer ads
      this.config.maxAdsPerPage = 2
      this.config.refreshInterval = 60000
    }
  }

  private static trackToolUsage(): void {
    // Track tool usage for better ad targeting
    if (typeof window !== "undefined" && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'tool_usage', {
        'tool_type': this.getCurrentToolContext(),
        'session_tools_used': this.toolUsage,
        'page_views': this.pageViews,
        'session_time': Date.now() - this.sessionStartTime
      })
    }
  }

  private static setupViewabilityTracking(): void {
    if (!this.config.enableViewabilityTracking || typeof window === "undefined") return

    // Only track if user has shown engagement
    if (this.toolUsage === 0 && this.pageViews < 2) {
      return
    }

    this.viewabilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const adElement = entry.target as HTMLElement
          const adSlot = adElement.getAttribute('data-ad-slot')
          
          if (entry.isIntersecting) {
            // Track ad impression with engagement context
            this.trackAdImpression(adSlot || 'unknown', entry.intersectionRatio)
            
            // Lazy load ad if not already loaded
            if (!adElement.getAttribute('data-ad-loaded')) {
              this.loadAd(adElement)
            }
          }
        })
      },
      {
        threshold: [0.3, 0.7, 1.0], // More granular tracking
        rootMargin: '100px' // Larger margin for better UX
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
        'tool_context': this.getCurrentToolContext(),
        'user_engagement': this.toolUsage,
        'session_time': Date.now() - this.sessionStartTime,
        'page_views': this.pageViews
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
    // Smart ad refresh based on user engagement
    let sessionTime = 0
    
    const refreshInterval = setInterval(() => {
      sessionTime += this.config.refreshInterval
      
      // Only refresh if user is engaged and has used tools
      if (sessionTime > 2 * 60 * 1000 && this.isUserActive() && this.toolUsage > 0) {
        this.refreshAds()
      }
    }, this.config.refreshInterval)

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(refreshInterval)
    })
  }

  private static isUserActive(): boolean {
    // Enhanced user activity detection
    const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0')
    const now = Date.now()
    const isActive = (now - lastActivity) < 120000 // Active within last 2 minutes
    
    // Also check if user is currently using a tool
    const isProcessing = document.querySelector('[data-processing="true"]') !== null
    
    return isActive || isProcessing
  }

  private static refreshAds(): void {
    // Only refresh if user engagement is high
    if (this.toolUsage < 2) return
    
    try {
      const ads = document.querySelectorAll('.adsbygoogle[data-adsbygoogle-status="done"]')
      
      // Refresh fewer ads for tools to avoid disruption
      const adsToRefresh = Array.from(ads).slice(0, 1)
      
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
  static getOptimalAdSlots(toolType: string, deviceType: string, userEngagement: number): string[] {
    // Reduce ads for low engagement users
    if (userEngagement < 2) {
      return deviceType === 'mobile' ? ['mobile-minimal'] : ['desktop-minimal']
    }
    
    const baseSlots = ['tool-header-banner']
    
    if (deviceType === 'mobile') {
      return [
        ...baseSlots,
        'mobile-canvas-content'
      ]
    } else {
      return [
        ...baseSlots,
        `${toolType}-canvas-content`
      ]
    }
  }

  // Handle rapid page changes (bounce protection)
  static handlePageChange(): void {
    this.pageViews++
    
    // If user is bouncing rapidly, reduce ad frequency
    const sessionTime = Date.now() - this.sessionStartTime
    const bounceRate = this.pageViews / (sessionTime / 1000) // pages per second
    
    if (bounceRate > 0.5) { // More than 1 page every 2 seconds
      // Disable ads temporarily for bouncy users
      const ads = document.querySelectorAll('.adsbygoogle')
      ads.forEach(ad => {
        (ad as HTMLElement).style.display = 'none'
      })
      
      // Re-enable after user settles
      setTimeout(() => {
        ads.forEach(ad => {
          (ad as HTMLElement).style.display = 'block'
        })
      }, 10000) // 10 seconds
    }
  }

  // A/B test ad formats for better performance
  static getOptimalAdFormat(position: string, deviceType: string): string {
    const formats = {
      mobile: {
        header: 'fluid',
        content: 'auto',
        bottom: 'auto'
      },
      desktop: {
        header: 'horizontal',
        content: 'rectangle',
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
  
  // Track tool interactions specifically
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-tool-action]') || target.closest('button')) {
      AdOptimizer.handlePageChange()
    }
  })
}