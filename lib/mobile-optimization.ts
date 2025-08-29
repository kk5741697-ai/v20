// Mobile optimization utilities for better user experience and ad performance

export interface MobileOptimizationConfig {
  enableTouchOptimization: boolean
  enableMobileAds: boolean
  enableProgressiveLoading: boolean
  enableOfflineSupport: boolean
}

export class MobileOptimizer {
  private static config: MobileOptimizationConfig = {
    enableTouchOptimization: true,
    enableMobileAds: true,
    enableProgressiveLoading: true,
    enableOfflineSupport: false
  }

  static isMobile(): boolean {
    if (typeof window === "undefined") return false
    return window.innerWidth < 768
  }

  static isTablet(): boolean {
    if (typeof window === "undefined") return false
    return window.innerWidth >= 768 && window.innerWidth < 1024
  }

  static getDeviceType(): "mobile" | "tablet" | "desktop" {
    if (this.isMobile()) return "mobile"
    if (this.isTablet()) return "tablet"
    return "desktop"
  }

  // Optimize touch interactions for mobile devices
  static optimizeTouchInteractions(): void {
    if (!this.config.enableTouchOptimization || typeof window === "undefined") return

    // Prevent zoom on input focus (iOS)
    const inputs = document.querySelectorAll('input, textarea, select')
    inputs.forEach(input => {
      if (input instanceof HTMLElement) {
        input.style.fontSize = '16px'
      }
    })

    // Add touch-friendly classes
    const interactiveElements = document.querySelectorAll('button, a, [role="button"]')
    interactiveElements.forEach(element => {
      if (element instanceof HTMLElement) {
        element.classList.add('touch-friendly')
      }
    })

    // Optimize scroll behavior
    document.body.style.webkitOverflowScrolling = 'touch'
    document.body.style.overflowScrolling = 'touch'
  }

  // Progressive image loading for better performance
  static async loadImageProgressively(
    src: string, 
    placeholder?: string,
    onProgress?: (progress: number) => void
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      // Load placeholder first if provided
      if (placeholder) {
        const placeholderImg = new Image()
        placeholderImg.onload = () => {
          onProgress?.(25)
        }
        placeholderImg.src = placeholder
      }

      img.onload = () => {
        onProgress?.(100)
        resolve(img)
      }
      
      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }
      
      img.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 75 + 25 // 25-100%
          onProgress?.(progress)
        }
      }
      
      img.src = src
    })
  }

  // Optimize canvas for mobile performance
  static optimizeCanvasForMobile(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Optimize canvas settings for mobile
    if (this.isMobile()) {
      // Reduce canvas size for better performance on mobile
      const maxDimension = 1024
      if (canvas.width > maxDimension || canvas.height > maxDimension) {
        const scale = maxDimension / Math.max(canvas.width, canvas.height)
        canvas.width *= scale
        canvas.height *= scale
      }

      // Optimize rendering settings
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'medium' // Balance between quality and performance
    } else {
      ctx.imageSmoothingQuality = 'high'
    }
  }

  // Debounce function for performance optimization
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  // Throttle function for scroll and resize events
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  // Optimize file processing for mobile
  static getOptimalProcessingSettings(fileSize: number, deviceType: string) {
    const settings = {
      maxDimensions: { width: 2048, height: 2048 },
      quality: 85,
      progressive: true,
      chunkSize: 1024 * 1024 // 1MB chunks
    }

    if (deviceType === "mobile") {
      // Reduce settings for mobile devices
      settings.maxDimensions = { width: 1024, height: 1024 }
      settings.quality = 75
      settings.chunkSize = 512 * 1024 // 512KB chunks
      
      // Further reduce for large files on mobile
      if (fileSize > 10 * 1024 * 1024) { // 10MB+
        settings.maxDimensions = { width: 800, height: 800 }
        settings.quality = 65
      }
    }

    return settings
  }

  // Memory management for mobile devices
  static cleanupResources(): void {
    // Clean up blob URLs
    const blobUrls = document.querySelectorAll('img[src^="blob:"]')
    blobUrls.forEach(img => {
      if (img instanceof HTMLImageElement) {
        URL.revokeObjectURL(img.src)
      }
    })

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }
  }

  // Adaptive quality based on device and network
  static getAdaptiveQuality(): number {
    const deviceType = this.getDeviceType()
    let baseQuality = 90

    switch (deviceType) {
      case "mobile":
        baseQuality = 75
        break
      case "tablet":
        baseQuality = 85
        break
      default:
        baseQuality = 90
    }

    // Adjust based on network conditions if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        switch (connection.effectiveType) {
          case 'slow-2g':
          case '2g':
            baseQuality *= 0.6
            break
          case '3g':
            baseQuality *= 0.8
            break
          case '4g':
            baseQuality *= 0.95
            break
        }
      }
    }

    return Math.max(30, Math.min(95, Math.round(baseQuality)))
  }

  // Preload critical resources
  static preloadCriticalResources(): void {
    // Preload common image processing libraries
    const criticalResources = [
      '/js/image-worker.js',
      '/js/pdf-worker.js'
    ]

    criticalResources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource
      link.as = 'script'
      document.head.appendChild(link)
    })
  }

  // Service Worker registration for offline support
  static async registerServiceWorker(): Promise<void> {
    if (!this.config.enableOfflineSupport || typeof window === "undefined" || !('serviceWorker' in navigator)) {
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
    } catch (error) {
      console.warn('Service Worker registration failed:', error)
    }
  }

  // Initialize mobile optimizations
  static initialize(config?: Partial<MobileOptimizationConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    if (typeof window === "undefined") return

    // Apply optimizations after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.applyOptimizations()
      })
    } else {
      this.applyOptimizations()
    }
  }

  private static applyOptimizations(): void {
    this.optimizeTouchInteractions()
    this.preloadCriticalResources()
    
    if (this.config.enableOfflineSupport) {
      this.registerServiceWorker()
    }

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupResources()
    }, 5 * 60 * 1000) // Every 5 minutes
  }
}

// Auto-initialize on import
if (typeof window !== "undefined") {
  MobileOptimizer.initialize()
}