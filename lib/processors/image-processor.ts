// Optimized image processor with memory management and crash prevention
export interface ImageProcessingOptions {
  width?: number
  height?: number
  quality?: number
  outputFormat?: "jpeg" | "png" | "webp"
  maintainAspectRatio?: boolean
  backgroundColor?: string
  compressionLevel?: "low" | "medium" | "high" | "maximum"
  filters?: {
    brightness?: number
    contrast?: number
    saturation?: number
    blur?: number
    sepia?: boolean
    grayscale?: boolean
  }
  watermarkText?: string
  watermarkOpacity?: number
  position?: string
  textColor?: string
  fontSize?: number
  useImageWatermark?: boolean
  watermarkImageUrl?: string
  watermarkImage?: string
  flipDirection?: string
  customRotation?: number
  cropArea?: { x: number; y: number; width: number; height: number }
  cropMode?: "percentage" | "pixels"
}

export class ImageProcessor {
  private static readonly MAX_SAFE_PIXELS = 2048 * 2048 // 4MP max for stability
  private static readonly MAX_CANVAS_SIZE = 4096 // Max canvas dimension
  
  static async resizeImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, (canvas, ctx, img) => {
      const targetWidth = options.width || img.naturalWidth
      const targetHeight = options.height || img.naturalHeight
      
      // Calculate safe dimensions
      const { safeWidth, safeHeight } = this.calculateSafeDimensions(
        targetWidth, 
        targetHeight, 
        options.maintainAspectRatio,
        img.naturalWidth / img.naturalHeight
      )
      
      canvas.width = safeWidth
      canvas.height = safeHeight
      
      // Apply background if not PNG
      if (options.backgroundColor && options.outputFormat !== "png") {
        ctx.fillStyle = options.backgroundColor
        ctx.fillRect(0, 0, safeWidth, safeHeight)
      }
      
      // High quality resize
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, safeWidth, safeHeight)
    }, options)
  }

  static async compressImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, (canvas, ctx, img) => {
      // Calculate compression dimensions
      let { width, height } = this.getOptimalCompressionSize(
        img.naturalWidth, 
        img.naturalHeight, 
        options.compressionLevel || "medium"
      )
      
      canvas.width = width
      canvas.height = height
      
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "medium" // Balance quality vs performance
      ctx.drawImage(img, 0, 0, width, height)
    }, options)
  }

  static async convertFormat(file: File, format: "jpeg" | "png" | "webp", options: ImageProcessingOptions = {}): Promise<Blob> {
    return this.processImageSafely(file, (canvas, ctx, img) => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      
      // Add background for JPEG
      if (format === "jpeg") {
        ctx.fillStyle = options.backgroundColor || "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0)
    }, { ...options, outputFormat: format })
  }

  static async cropImage(file: File, cropArea: any, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, (canvas, ctx, img) => {
      const { x, y, width, height } = cropArea
      
      // Convert percentage to pixels
      const sourceX = (x / 100) * img.naturalWidth
      const sourceY = (y / 100) * img.naturalHeight
      const sourceWidth = (width / 100) * img.naturalWidth
      const sourceHeight = (height / 100) * img.naturalHeight
      
      // Ensure safe crop dimensions
      const { safeWidth, safeHeight } = this.calculateSafeDimensions(sourceWidth, sourceHeight)
      
      canvas.width = safeWidth
      canvas.height = safeHeight
      
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, safeWidth, safeHeight
      )
    }, options)
  }

  static async rotateImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, (canvas, ctx, img) => {
      const angle = (options.customRotation || 0) * Math.PI / 180
      
      // Calculate rotated dimensions
      const cos = Math.abs(Math.cos(angle))
      const sin = Math.abs(Math.sin(angle))
      const newWidth = img.naturalWidth * cos + img.naturalHeight * sin
      const newHeight = img.naturalWidth * sin + img.naturalHeight * cos
      
      const { safeWidth, safeHeight } = this.calculateSafeDimensions(newWidth, newHeight)
      
      canvas.width = safeWidth
      canvas.height = safeHeight
      
      // Apply rotation
      ctx.translate(safeWidth / 2, safeHeight / 2)
      ctx.rotate(angle)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    }, options)
  }

  static async applyFilters(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, (canvas, ctx, img) => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      
      // Build filter string
      const filters = options.filters || {}
      const filterArray = []
      
      if (filters.brightness !== undefined && filters.brightness !== 100) {
        filterArray.push(`brightness(${Math.max(0, Math.min(300, filters.brightness))}%)`)
      }
      if (filters.contrast !== undefined && filters.contrast !== 100) {
        filterArray.push(`contrast(${Math.max(0, Math.min(300, filters.contrast))}%)`)
      }
      if (filters.saturation !== undefined && filters.saturation !== 100) {
        filterArray.push(`saturate(${Math.max(0, Math.min(300, filters.saturation))}%)`)
      }
      if (filters.blur !== undefined && filters.blur > 0) {
        filterArray.push(`blur(${Math.max(0, Math.min(50, filters.blur))}px)`)
      }
      if (filters.sepia) {
        filterArray.push("sepia(100%)")
      }
      if (filters.grayscale) {
        filterArray.push("grayscale(100%)")
      }
      
      if (filterArray.length > 0) {
        ctx.filter = filterArray.join(" ")
      }
      
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0)
    }, options)
  }

  static async addWatermark(file: File, watermarkText: string, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, (canvas, ctx, img) => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0)
      
      // Add watermark
      if (watermarkText && !options.useImageWatermark) {
        ctx.save()
        ctx.globalAlpha = options.watermarkOpacity || 0.5
        
        const fontSize = options.fontSize || Math.min(canvas.width, canvas.height) * 0.05
        ctx.font = `bold ${fontSize}px Arial`
        ctx.fillStyle = options.textColor || "#ffffff"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        
        // Add shadow for better visibility
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)"
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        let x = canvas.width / 2
        let y = canvas.height / 2
        
        switch (options.position) {
          case "top-left":
            x = fontSize
            y = fontSize * 2
            ctx.textAlign = "left"
            break
          case "top-right":
            x = canvas.width - fontSize
            y = fontSize * 2
            ctx.textAlign = "right"
            break
          case "bottom-left":
            x = fontSize
            y = canvas.height - fontSize
            ctx.textAlign = "left"
            break
          case "bottom-right":
            x = canvas.width - fontSize
            y = canvas.height - fontSize
            ctx.textAlign = "right"
            break
        }
        
        ctx.fillText(watermarkText, x, y)
        ctx.restore()
      }
    }, options)
  }

  // Core safe processing function
  private static async processImageSafely(
    file: File,
    processor: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, img: HTMLImageElement) => void,
    options: ImageProcessingOptions
  ): Promise<Blob> {
    // Memory safety checks
    if (file.size > 25 * 1024 * 1024) { // 25MB limit
      throw new Error("Image too large. Please use an image smaller than 25MB.")
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { 
        alpha: true,
        willReadFrequently: false,
        desynchronized: true
      })
      
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          // Additional safety check for image dimensions
          if (img.naturalWidth * img.naturalHeight > this.MAX_SAFE_PIXELS) {
            const scale = Math.sqrt(this.MAX_SAFE_PIXELS / (img.naturalWidth * img.naturalHeight))
            const tempCanvas = document.createElement("canvas")
            const tempCtx = tempCanvas.getContext("2d")!
            
            tempCanvas.width = Math.floor(img.naturalWidth * scale)
            tempCanvas.height = Math.floor(img.naturalHeight * scale)
            
            tempCtx.imageSmoothingEnabled = true
            tempCtx.imageSmoothingQuality = "high"
            tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height)
            
            // Create new image from scaled canvas
            const scaledImg = new Image()
            scaledImg.onload = () => {
              processor(canvas, ctx, scaledImg)
              this.finalizeCanvas(canvas, options, resolve, reject)
            }
            scaledImg.src = tempCanvas.toDataURL()
            return
          }
          
          processor(canvas, ctx, img)
          this.finalizeCanvas(canvas, options, resolve, reject)
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file)
    })
  }

  private static calculateSafeDimensions(
    targetWidth: number, 
    targetHeight: number, 
    maintainAspectRatio = true,
    aspectRatio?: number
  ) {
    let safeWidth = Math.min(targetWidth, this.MAX_CANVAS_SIZE)
    let safeHeight = Math.min(targetHeight, this.MAX_CANVAS_SIZE)
    
    // Ensure we don't exceed pixel limit
    if (safeWidth * safeHeight > this.MAX_SAFE_PIXELS) {
      const scale = Math.sqrt(this.MAX_SAFE_PIXELS / (safeWidth * safeHeight))
      safeWidth = Math.floor(safeWidth * scale)
      safeHeight = Math.floor(safeHeight * scale)
    }
    
    // Maintain aspect ratio if requested
    if (maintainAspectRatio && aspectRatio) {
      if (safeWidth / safeHeight > aspectRatio) {
        safeWidth = Math.floor(safeHeight * aspectRatio)
      } else {
        safeHeight = Math.floor(safeWidth / aspectRatio)
      }
    }
    
    return { safeWidth: Math.max(1, safeWidth), safeHeight: Math.max(1, safeHeight) }
  }

  private static getOptimalCompressionSize(
    originalWidth: number, 
    originalHeight: number, 
    level: string
  ) {
    let scale = 1
    
    switch (level) {
      case "low":
        scale = 0.95
        break
      case "medium":
        scale = 0.8
        break
      case "high":
        scale = 0.6
        break
      case "maximum":
        scale = 0.4
        break
    }
    
    const width = Math.floor(originalWidth * scale)
    const height = Math.floor(originalHeight * scale)
    
    return this.calculateSafeDimensions(width, height, true, originalWidth / originalHeight)
  }

  private static finalizeCanvas(
    canvas: HTMLCanvasElement,
    options: ImageProcessingOptions,
    resolve: (blob: Blob) => void,
    reject: (error: Error) => void
  ): void {
    try {
      const quality = Math.max(0.1, Math.min(1.0, (options.quality || 90) / 100))
      const mimeType = `image/${options.outputFormat || "png"}`
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to create blob"))
          }
        },
        mimeType,
        quality
      )
    } catch (error) {
      reject(new Error("Failed to finalize image"))
    }
  }

  // Memory cleanup utility
  static cleanupMemory(): void {
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }
    
    // Clean up blob URLs
    const images = document.querySelectorAll('img[src^="blob:"]')
    images.forEach(img => {
      if (img instanceof HTMLImageElement) {
        URL.revokeObjectURL(img.src)
      }
    })
  }
}