// Enhanced Image Processor with improved stability and performance
export interface ImageProcessingOptions {
  width?: number
  height?: number
  quality?: number
  maintainAspectRatio?: boolean
  outputFormat?: "jpeg" | "png" | "webp"
  backgroundColor?: string
  compressionLevel?: "low" | "medium" | "high" | "maximum"
  flipDirection?: "horizontal" | "vertical" | "both"
  customRotation?: number
  watermarkOpacity?: number
  position?: string
  textColor?: string
  fontSize?: number
  useImageWatermark?: boolean
  watermarkImageUrl?: string
  watermarkImage?: string
  filters?: {
    brightness?: number
    contrast?: number
    saturation?: number
    blur?: number
    sepia?: boolean
    grayscale?: boolean
  }
}

export class ImageProcessor {
  private static readonly MAX_SAFE_PIXELS = 1536 * 1536 // 2.3MP for stability
  private static readonly MAX_CANVAS_SIZE = 2048
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

  static async resizeImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, async (canvas, ctx) => {
      const targetWidth = options.width || canvas.width
      const targetHeight = options.height || canvas.height
      
      // Calculate dimensions with aspect ratio
      let finalWidth = targetWidth
      let finalHeight = targetHeight
      
      if (options.maintainAspectRatio && options.width && options.height) {
        const aspectRatio = canvas.width / canvas.height
        if (targetWidth / targetHeight > aspectRatio) {
          finalWidth = targetHeight * aspectRatio
        } else {
          finalHeight = targetWidth / aspectRatio
        }
      }
      
      // Apply flip transformations
      if (options.flipDirection) {
        ctx.save()
        let scaleX = 1, scaleY = 1
        
        if (options.flipDirection === "horizontal" || options.flipDirection === "both") {
          scaleX = -1
        }
        if (options.flipDirection === "vertical" || options.flipDirection === "both") {
          scaleY = -1
        }
        
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.scale(scaleX, scaleY)
        ctx.translate(-canvas.width / 2, -canvas.height / 2)
      }
      
      // Create result canvas
      const resultCanvas = document.createElement("canvas")
      const resultCtx = resultCanvas.getContext("2d")!
      
      resultCanvas.width = Math.max(1, Math.floor(finalWidth))
      resultCanvas.height = Math.max(1, Math.floor(finalHeight))
      
      // Apply background color if needed
      if (options.backgroundColor && options.outputFormat !== "png") {
        resultCtx.fillStyle = options.backgroundColor
        resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height)
      }
      
      // High quality scaling
      resultCtx.imageSmoothingEnabled = true
      resultCtx.imageSmoothingQuality = "high"
      resultCtx.drawImage(canvas, 0, 0, resultCanvas.width, resultCanvas.height)
      
      if (options.flipDirection) {
        ctx.restore()
      }
      
      return resultCanvas
    }, options)
  }

  static async compressImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, async (canvas, ctx) => {
      // Apply compression by adjusting quality and format
      let quality = (options.quality || 80) / 100
      
      // Adjust quality based on compression level
      switch (options.compressionLevel) {
        case "low":
          quality *= 0.95
          break
        case "medium":
          quality *= 0.8
          break
        case "high":
          quality *= 0.6
          break
        case "maximum":
          quality *= 0.4
          break
      }
      
      return canvas
    }, { ...options, quality: Math.round(quality * 100) })
  }

  static async convertFormat(file: File, format: "jpeg" | "png" | "webp", options: ImageProcessingOptions = {}): Promise<Blob> {
    return this.processImageSafely(file, async (canvas, ctx) => {
      // Apply background for JPEG format
      if (format === "jpeg") {
        const bgCanvas = document.createElement("canvas")
        const bgCtx = bgCanvas.getContext("2d")!
        bgCanvas.width = canvas.width
        bgCanvas.height = canvas.height
        
        bgCtx.fillStyle = options.backgroundColor || "#ffffff"
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height)
        bgCtx.drawImage(canvas, 0, 0)
        
        return bgCanvas
      }
      
      return canvas
    }, { ...options, outputFormat: format })
  }

  static async rotateImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, async (canvas, ctx) => {
      const angle = (options.customRotation || 0) * Math.PI / 180
      
      // Calculate new canvas dimensions for rotation
      const cos = Math.abs(Math.cos(angle))
      const sin = Math.abs(Math.sin(angle))
      const newWidth = canvas.width * cos + canvas.height * sin
      const newHeight = canvas.width * sin + canvas.height * cos
      
      const resultCanvas = document.createElement("canvas")
      const resultCtx = resultCanvas.getContext("2d")!
      
      resultCanvas.width = Math.ceil(newWidth)
      resultCanvas.height = Math.ceil(newHeight)
      
      // Apply background
      if (options.backgroundColor) {
        resultCtx.fillStyle = options.backgroundColor
        resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height)
      }
      
      // Apply rotation
      resultCtx.translate(resultCanvas.width / 2, resultCanvas.height / 2)
      resultCtx.rotate(angle)
      resultCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)
      
      return resultCanvas
    }, options)
  }

  static async cropImage(file: File, cropArea: { x: number; y: number; width: number; height: number }, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, async (canvas, ctx) => {
      // Convert percentage to pixels
      const sourceX = (cropArea.x / 100) * canvas.width
      const sourceY = (cropArea.y / 100) * canvas.height
      const sourceWidth = (cropArea.width / 100) * canvas.width
      const sourceHeight = (cropArea.height / 100) * canvas.height
      
      const resultCanvas = document.createElement("canvas")
      const resultCtx = resultCanvas.getContext("2d")!
      
      resultCanvas.width = Math.max(1, Math.floor(sourceWidth))
      resultCanvas.height = Math.max(1, Math.floor(sourceHeight))
      
      // Apply background
      if (options.backgroundColor) {
        resultCtx.fillStyle = options.backgroundColor
        resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height)
      }
      
      // Draw cropped area
      resultCtx.imageSmoothingEnabled = true
      resultCtx.imageSmoothingQuality = "high"
      resultCtx.drawImage(
        canvas,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, resultCanvas.width, resultCanvas.height
      )
      
      return resultCanvas
    }, options)
  }

  static async addWatermark(file: File, watermarkText: string, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, async (canvas, ctx) => {
      const resultCanvas = document.createElement("canvas")
      const resultCtx = resultCanvas.getContext("2d")!
      
      resultCanvas.width = canvas.width
      resultCanvas.height = canvas.height
      
      // Draw original image
      resultCtx.drawImage(canvas, 0, 0)
      
      // Add watermark
      if (watermarkText && watermarkText.trim()) {
        resultCtx.save()
        resultCtx.globalAlpha = options.watermarkOpacity || 0.5
        
        const fontSize = options.fontSize || Math.min(canvas.width, canvas.height) * 0.05
        resultCtx.font = `bold ${fontSize}px Arial`
        resultCtx.fillStyle = options.textColor || "#ffffff"
        
        // Add shadow for better visibility
        resultCtx.shadowColor = "rgba(0, 0, 0, 0.8)"
        resultCtx.shadowBlur = 4
        resultCtx.shadowOffsetX = 2
        resultCtx.shadowOffsetY = 2
        
        let x: number, y: number
        
        switch (options.position) {
          case "top-left":
            x = fontSize
            y = fontSize * 2
            resultCtx.textAlign = "left"
            break
          case "top-right":
            x = canvas.width - fontSize
            y = fontSize * 2
            resultCtx.textAlign = "right"
            break
          case "bottom-left":
            x = fontSize
            y = canvas.height - fontSize
            resultCtx.textAlign = "left"
            break
          case "bottom-right":
            x = canvas.width - fontSize
            y = canvas.height - fontSize
            resultCtx.textAlign = "right"
            break
          case "diagonal":
            resultCtx.translate(canvas.width / 2, canvas.height / 2)
            resultCtx.rotate(-Math.PI / 4)
            x = 0
            y = 0
            resultCtx.textAlign = "center"
            break
          default: // center
            x = canvas.width / 2
            y = canvas.height / 2
            resultCtx.textAlign = "center"
            break
        }
        
        resultCtx.textBaseline = "middle"
        resultCtx.fillText(watermarkText, x, y)
        resultCtx.restore()
      }
      
      return resultCanvas
    }, options)
  }

  static async applyFilters(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return this.processImageSafely(file, async (canvas, ctx) => {
      if (!options.filters) return canvas
      
      const filters = options.filters
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
      
      // Apply filters
      if (filterArray.length > 0) {
        const resultCanvas = document.createElement("canvas")
        const resultCtx = resultCanvas.getContext("2d")!
        
        resultCanvas.width = canvas.width
        resultCanvas.height = canvas.height
        
        resultCtx.filter = filterArray.join(" ")
        resultCtx.drawImage(canvas, 0, 0)
        
        return resultCanvas
      }
      
      return canvas
    }, options)
  }

  static async removeBackground(file: File, options: any = {}): Promise<Blob> {
    return this.processImageSafely(file, async (canvas, ctx) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Enhanced background removal with better edge detection
      const sensitivity = options.sensitivity || 25
      const backgroundColors = this.sampleBackgroundColors(data, canvas.width, canvas.height)
      
      // Apply background removal
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Calculate distance to background colors
        let minDistance = Infinity
        backgroundColors.forEach(bgColor => {
          const distance = Math.sqrt(
            Math.pow(r - bgColor.r, 2) +
            Math.pow(g - bgColor.g, 2) +
            Math.pow(b - bgColor.b, 2)
          )
          minDistance = Math.min(minDistance, distance)
        })
        
        // Apply background removal with feathering
        if (minDistance < sensitivity * 3) {
          if (options.featherEdges !== false) {
            const alpha = Math.max(0, Math.min(255, (minDistance / (sensitivity * 3)) * 255))
            data[i + 3] = alpha
          } else {
            data[i + 3] = 0
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0)
      return canvas
    }, { ...options, outputFormat: "png" })
  }

  private static sampleBackgroundColors(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ r: number; g: number; b: number }> {
    const samples: Array<{ r: number; g: number; b: number }> = []
    
    // Sample from edges
    const samplePoints = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)]
    ]
    
    samplePoints.forEach(([x, y]) => {
      const idx = (y * width + x) * 4
      samples.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2]
      })
    })
    
    return samples
  }

  private static async processImageSafely(
    file: File,
    processor: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => Promise<HTMLCanvasElement>,
    options: ImageProcessingOptions
  ): Promise<Blob> {
    // Safety checks
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large (${Math.round(file.size / (1024 * 1024))}MB). Maximum 25MB allowed.`)
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = async () => {
        try {
          // Calculate safe dimensions
          let workingWidth = img.naturalWidth
          let workingHeight = img.naturalHeight
          
          // Check pixel count limit
          if (workingWidth * workingHeight > this.MAX_SAFE_PIXELS) {
            const scale = Math.sqrt(this.MAX_SAFE_PIXELS / (workingWidth * workingHeight))
            workingWidth = Math.floor(workingWidth * scale)
            workingHeight = Math.floor(workingHeight * scale)
          }
          
          // Check canvas size limits
          if (workingWidth > this.MAX_CANVAS_SIZE || workingHeight > this.MAX_CANVAS_SIZE) {
            const scale = Math.min(this.MAX_CANVAS_SIZE / workingWidth, this.MAX_CANVAS_SIZE / workingHeight)
            workingWidth = Math.floor(workingWidth * scale)
            workingHeight = Math.floor(workingHeight * scale)
          }
          
          // Create working canvas
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
          
          canvas.width = Math.max(1, workingWidth)
          canvas.height = Math.max(1, workingHeight)
          
          // Draw image with high quality
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          
          // Process image
          const resultCanvas = await processor(canvas, ctx)
          
          // Create output blob
          const quality = (options.quality || 90) / 100
          const mimeType = `image/${options.outputFormat || "png"}`
          
          resultCanvas.toBlob(
            (blob) => {
              if (blob) {
                // Cleanup
                this.cleanupCanvas(canvas)
                if (resultCanvas !== canvas) {
                  this.cleanupCanvas(resultCanvas)
                }
                resolve(blob)
              } else {
                reject(new Error("Failed to create blob"))
              }
            },
            mimeType,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error("Failed to load image"))
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file)
    })
  }

  private static cleanupCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    canvas.width = 1
    canvas.height = 1
  }

  // Memory management utilities
  static cleanupMemory(): void {
    // Clean up blob URLs
    const images = document.querySelectorAll('img[src^="blob:"]')
    images.forEach(img => {
      if (img instanceof HTMLImageElement) {
        URL.revokeObjectURL(img.src)
      }
    })
    
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }
  }
}