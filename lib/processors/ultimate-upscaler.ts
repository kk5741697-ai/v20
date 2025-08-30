// Ultimate Image Upscaler with advanced algorithms and crash prevention
export interface UltimateUpscaleOptions {
  scaleFactor?: number
  maxOutputDimension?: number
  primaryAlgorithm?: "auto" | "lanczos" | "bicubic" | "srcnn" | "waifu2x" | "esrgan"
  secondaryAlgorithm?: "lanczos" | "bicubic" | "nearest"
  hybridMode?: boolean
  enableContentAnalysis?: boolean
  contentType?: "auto" | "photo" | "art" | "text" | "mixed"
  enhanceDetails?: boolean
  reduceNoise?: boolean
  sharpenAmount?: number
  colorEnhancement?: boolean
  contrastBoost?: number
  multiPass?: boolean
  memoryOptimized?: boolean
  chunkProcessing?: boolean
  outputFormat?: "png" | "jpeg" | "webp"
  quality?: number
  progressCallback?: (progress: number, stage: string) => void
  debugMode?: boolean
}

export interface UpscaleResult {
  processedBlob: Blob
  actualScaleFactor: number
  algorithmsUsed: string[]
  processingTime: number
  finalDimensions: { width: number; height: number }
  qualityMetrics: {
    sharpness: number
    noise: number
    artifacts: number
  }
}

export class UltimateImageUpscaler {
  private static readonly MAX_SAFE_PIXELS = 1024 * 1024 // 1MP for stability
  private static readonly MAX_CANVAS_SIZE = 1536 // Reduced for stability
  private static readonly CHUNK_SIZE = 256
  private static readonly MAX_MEMORY_MB = 100

  static async upscaleImage(
    imageFile: File,
    options: UltimateUpscaleOptions = {}
  ): Promise<UpscaleResult> {
    const startTime = Date.now()

    try {
      // Enhanced safety checks
      if (imageFile.size > 25 * 1024 * 1024) {
        throw new Error(`File too large (${Math.round(imageFile.size / (1024 * 1024))}MB). Maximum 25MB allowed.`)
      }

      options.progressCallback?.(5, "Loading image")
      
      // Load image with strict safety limits
      const { canvas, ctx, originalDimensions } = await this.loadImageSafely(imageFile, options)
      
      options.progressCallback?.(15, "Analyzing image content")
      
      // Analyze image for optimal processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const analysis = await this.analyzeImageContent(imageData, options)
      
      options.progressCallback?.(25, "Preparing upscaling")
      
      // Calculate safe target dimensions
      const targetDimensions = this.calculateSafeTargetDimensions(
        canvas.width, 
        canvas.height, 
        options.scaleFactor || 2,
        options.maxOutputDimension || this.MAX_CANVAS_SIZE
      )
      
      options.progressCallback?.(35, "Upscaling image")
      
      // Apply upscaling with memory management
      const upscaledCanvas = await this.applyUpscalingWithMemoryManagement(
        canvas, 
        targetDimensions, 
        analysis, 
        options
      )
      
      options.progressCallback?.(80, "Applying enhancements")
      
      // Apply post-processing enhancements
      await this.applyPostProcessingEnhancements(upscaledCanvas, analysis, options)
      
      options.progressCallback?.(95, "Creating output")
      
      // Create output blob
      const processedBlob = await this.createOutputBlob(upscaledCanvas, options)
      
      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(upscaledCanvas)
      
      options.progressCallback?.(100, "Complete")
      
      // Cleanup
      this.cleanupMemory([canvas, upscaledCanvas])
      
      return {
        processedBlob,
        actualScaleFactor: targetDimensions.width / originalDimensions.width,
        algorithmsUsed: analysis.recommendedAlgorithms,
        processingTime: Date.now() - startTime,
        finalDimensions: { width: upscaledCanvas.width, height: upscaledCanvas.height },
        qualityMetrics
      }
    } catch (error) {
      options.progressCallback?.(0, "Error occurred")
      console.error("Image upscaling failed:", error)
      throw new Error(error instanceof Error ? error.message : "Image upscaling failed")
    }
  }

  private static async loadImageSafely(
    file: File,
    options: UltimateUpscaleOptions
  ): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; originalDimensions: { width: number; height: number } }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          const originalDimensions = { width: img.naturalWidth, height: img.naturalHeight }
          
          // Strict dimension limits for stability
          if (originalDimensions.width * originalDimensions.height > this.MAX_SAFE_PIXELS) {
            const scale = Math.sqrt(this.MAX_SAFE_PIXELS / (originalDimensions.width * originalDimensions.height))
            originalDimensions.width = Math.floor(originalDimensions.width * scale)
            originalDimensions.height = Math.floor(originalDimensions.height * scale)
          }
          
          // Additional safety checks
          if (originalDimensions.width > this.MAX_CANVAS_SIZE || originalDimensions.height > this.MAX_CANVAS_SIZE) {
            const scale = Math.min(
              this.MAX_CANVAS_SIZE / originalDimensions.width,
              this.MAX_CANVAS_SIZE / originalDimensions.height
            )
            originalDimensions.width = Math.floor(originalDimensions.width * scale)
            originalDimensions.height = Math.floor(originalDimensions.height * scale)
          }
          
          // Create canvas with safe dimensions
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
          
          canvas.width = Math.max(1, originalDimensions.width)
          canvas.height = Math.max(1, originalDimensions.height)
          
          // High quality rendering
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          
          resolve({ canvas, ctx, originalDimensions })
        } catch (error) {
          reject(new Error("Failed to process image: " + (error instanceof Error ? error.message : "Unknown error")))
        }
      }
      
      img.onerror = () => reject(new Error("Failed to load image"))
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file)
    })
  }

  private static async analyzeImageContent(
    imageData: ImageData,
    options: UltimateUpscaleOptions
  ): Promise<any> {
    const { data, width, height } = imageData
    
    let edgeCount = 0
    let textIndicators = 0
    let photoIndicators = 0
    let artIndicators = 0
    let totalSamples = 0
    
    const colorFrequency = new Map<string, number>()
    
    // Sample every 4th pixel for performance
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        totalSamples++
        
        // Detect edges
        if (this.isEdgePixel(data, x, y, width, height)) {
          edgeCount++
        }
        
        // Detect text characteristics
        if (this.isTextPixel(data, x, y, width, height)) {
          textIndicators++
        }
        
        // Detect photographic content
        if (this.isPhotoPixel(r, g, b)) {
          photoIndicators++
        }
        
        // Detect art/anime content
        if (this.isArtPixel(r, g, b)) {
          artIndicators++
        }
        
        // Track color frequency
        const colorKey = `${Math.floor(r/16)}-${Math.floor(g/16)}-${Math.floor(b/16)}`
        colorFrequency.set(colorKey, (colorFrequency.get(colorKey) || 0) + 1)
      }
    }
    
    const edgeRatio = edgeCount / totalSamples
    const textRatio = textIndicators / totalSamples
    const photoRatio = photoIndicators / totalSamples
    const artRatio = artIndicators / totalSamples
    
    // Determine content type and recommended algorithms
    let contentType = "mixed"
    let recommendedAlgorithms = ["lanczos"]
    
    if (textRatio > 0.3) {
      contentType = "text"
      recommendedAlgorithms = ["lanczos", "nearest"]
    } else if (artRatio > 0.4) {
      contentType = "art"
      recommendedAlgorithms = ["waifu2x", "lanczos"]
    } else if (photoRatio > 0.5) {
      contentType = "photo"
      recommendedAlgorithms = ["esrgan", "bicubic"]
    }
    
    return {
      contentType,
      edgeRatio,
      textRatio,
      photoRatio,
      artRatio,
      colorComplexity: colorFrequency.size / totalSamples,
      recommendedAlgorithms
    }
  }

  private static isEdgePixel(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) return false
    
    const centerIdx = (y * width + x) * 4
    let maxGradient = 0
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const nIdx = ((y + dy) * width + (x + dx)) * 4
        const gradient = Math.abs(data[centerIdx] - data[nIdx]) +
                        Math.abs(data[centerIdx + 1] - data[nIdx + 1]) +
                        Math.abs(data[centerIdx + 2] - data[nIdx + 2])
        maxGradient = Math.max(maxGradient, gradient)
      }
    }
    
    return maxGradient > 40
  }

  private static isTextPixel(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) return false
    
    const centerIdx = (y * width + x) * 4
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    // Text typically has high contrast with background
    let highContrastNeighbors = 0
    
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const nIdx = ((y + dy) * width + (x + dx)) * 4
        const neighborBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
        
        if (Math.abs(centerBrightness - neighborBrightness) > 100) {
          highContrastNeighbors++
        }
      }
    }
    
    return highContrastNeighbors > 8
  }

  private static isPhotoPixel(r: number, g: number, b: number): boolean {
    const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
    const brightness = (r + g + b) / 3
    
    // Photographic content has varied colors and moderate saturation
    return saturation > 0.1 && saturation < 0.8 && brightness > 20 && brightness < 235
  }

  private static isArtPixel(r: number, g: number, b: number): boolean {
    const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
    
    // Art/anime often has high saturation or very low saturation
    return saturation > 0.7 || saturation < 0.05
  }

  private static calculateSafeTargetDimensions(
    originalWidth: number,
    originalHeight: number,
    scaleFactor: number,
    maxDimension: number
  ): { width: number; height: number } {
    let targetWidth = Math.floor(originalWidth * scaleFactor)
    let targetHeight = Math.floor(originalHeight * scaleFactor)
    
    // Apply max dimension limits
    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight)
      targetWidth = Math.floor(targetWidth * scale)
      targetHeight = Math.floor(targetHeight * scale)
    }
    
    // Check pixel count limit
    if (targetWidth * targetHeight > this.MAX_SAFE_PIXELS) {
      const scale = Math.sqrt(this.MAX_SAFE_PIXELS / (targetWidth * targetHeight))
      targetWidth = Math.floor(targetWidth * scale)
      targetHeight = Math.floor(targetHeight * scale)
    }
    
    return { width: Math.max(1, targetWidth), height: Math.max(1, targetHeight) }
  }

  private static async applyUpscalingWithMemoryManagement(
    sourceCanvas: HTMLCanvasElement,
    targetDimensions: { width: number; height: number },
    analysis: any,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    const algorithm = options.primaryAlgorithm || analysis.recommendedAlgorithms[0] || "lanczos"
    
    // Create target canvas
    const targetCanvas = document.createElement("canvas")
    const targetCtx = targetCanvas.getContext("2d", {
      alpha: true,
      willReadFrequently: false,
      desynchronized: true
    })
    
    if (!targetCtx) {
      throw new Error("Canvas not supported")
    }
    
    targetCanvas.width = targetDimensions.width
    targetCanvas.height = targetDimensions.height
    
    // Apply upscaling based on algorithm
    switch (algorithm) {
      case "lanczos":
        await this.applyLanczosUpscaling(sourceCanvas, targetCanvas, options)
        break
      case "bicubic":
        await this.applyBicubicUpscaling(sourceCanvas, targetCanvas, options)
        break
      case "srcnn":
        await this.applySRCNNUpscaling(sourceCanvas, targetCanvas, options)
        break
      case "waifu2x":
        await this.applyWaifu2xUpscaling(sourceCanvas, targetCanvas, options)
        break
      case "esrgan":
        await this.applyESRGANUpscaling(sourceCanvas, targetCanvas, options)
        break
      default:
        await this.applyAutoUpscaling(sourceCanvas, targetCanvas, analysis, options)
    }
    
    return targetCanvas
  }

  private static async applyLanczosUpscaling(
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    const srcCtx = sourceCanvas.getContext("2d")!
    const targetCtx = targetCanvas.getContext("2d")!
    
    const srcImageData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const srcData = srcImageData.data
    
    const targetImageData = targetCtx.createImageData(targetCanvas.width, targetCanvas.height)
    const targetData = targetImageData.data
    
    const scaleX = sourceCanvas.width / targetCanvas.width
    const scaleY = sourceCanvas.height / targetCanvas.height
    
    // Lanczos-3 kernel for better quality
    const lanczos = (x: number): number => {
      if (x === 0) return 1
      if (Math.abs(x) >= 3) return 0
      
      const piX = Math.PI * x
      return (3 * Math.sin(piX) * Math.sin(piX / 3)) / (piX * piX)
    }
    
    // Process with chunking for memory management
    const chunkSize = options.chunkProcessing ? this.CHUNK_SIZE : targetCanvas.height
    
    for (let startY = 0; startY < targetCanvas.height; startY += chunkSize) {
      const endY = Math.min(startY + chunkSize, targetCanvas.height)
      
      for (let targetY = startY; targetY < endY; targetY++) {
        for (let targetX = 0; targetX < targetCanvas.width; targetX++) {
          const srcX = targetX * scaleX
          const srcY = targetY * scaleY
          
          let r = 0, g = 0, b = 0, a = 0, weightSum = 0
          
          // 6x6 neighborhood for Lanczos-3
          for (let dy = -2; dy <= 3; dy++) {
            for (let dx = -2; dx <= 3; dx++) {
              const sampleX = Math.floor(srcX) + dx
              const sampleY = Math.floor(srcY) + dy
              
              if (sampleX >= 0 && sampleX < sourceCanvas.width && 
                  sampleY >= 0 && sampleY < sourceCanvas.height) {
                
                const weight = lanczos(srcX - sampleX) * lanczos(srcY - sampleY)
                const srcIndex = (sampleY * sourceCanvas.width + sampleX) * 4
                
                r += srcData[srcIndex] * weight
                g += srcData[srcIndex + 1] * weight
                b += srcData[srcIndex + 2] * weight
                a += srcData[srcIndex + 3] * weight
                weightSum += weight
              }
            }
          }
          
          const targetIndex = (targetY * targetCanvas.width + targetX) * 4
          targetData[targetIndex] = Math.max(0, Math.min(255, r / weightSum))
          targetData[targetIndex + 1] = Math.max(0, Math.min(255, g / weightSum))
          targetData[targetIndex + 2] = Math.max(0, Math.min(255, b / weightSum))
          targetData[targetIndex + 3] = Math.max(0, Math.min(255, a / weightSum))
        }
        
        // Update progress
        const progress = 35 + ((targetY - startY + 1) / (endY - startY)) * 35
        options.progressCallback?.(progress, "Applying Lanczos upscaling")
      }
      
      // Allow browser to breathe
      await new Promise(resolve => setTimeout(resolve, 1))
    }
    
    targetCtx.putImageData(targetImageData, 0, 0)
  }

  private static async applyBicubicUpscaling(
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    const targetCtx = targetCanvas.getContext("2d")!
    
    // Use browser's high-quality scaling as base
    targetCtx.imageSmoothingEnabled = true
    targetCtx.imageSmoothingQuality = "high"
    targetCtx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
    
    // Apply enhancement
    const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
    await this.enhanceUpscaledImage(imageData, options)
    targetCtx.putImageData(imageData, 0, 0)
  }

  private static async applySRCNNUpscaling(
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    // SRCNN-inspired upscaling for general content
    const targetCtx = targetCanvas.getContext("2d")!
    
    // Multi-pass upscaling
    const scaleFactor = targetCanvas.width / sourceCanvas.width
    
    if (scaleFactor > 2) {
      // Multi-step upscaling for better quality
      const intermediateScale = Math.sqrt(scaleFactor)
      const intermediateCanvas = document.createElement("canvas")
      const intermediateCtx = intermediateCanvas.getContext("2d")!
      
      intermediateCanvas.width = Math.floor(sourceCanvas.width * intermediateScale)
      intermediateCanvas.height = Math.floor(sourceCanvas.height * intermediateScale)
      
      // First pass
      intermediateCtx.imageSmoothingEnabled = true
      intermediateCtx.imageSmoothingQuality = "high"
      intermediateCtx.drawImage(sourceCanvas, 0, 0, intermediateCanvas.width, intermediateCanvas.height)
      
      // Second pass
      targetCtx.imageSmoothingEnabled = true
      targetCtx.imageSmoothingQuality = "high"
      targetCtx.drawImage(intermediateCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
    } else {
      targetCtx.imageSmoothingEnabled = true
      targetCtx.imageSmoothingQuality = "high"
      targetCtx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
    }
    
    // Apply SRCNN-style enhancements
    const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
    await this.applySRCNNEnhancements(imageData, options)
    targetCtx.putImageData(imageData, 0, 0)
  }

  private static async applyWaifu2xUpscaling(
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    // Waifu2x-inspired upscaling for anime/art
    const targetCtx = targetCanvas.getContext("2d")!
    
    // Use nearest neighbor for pixel art preservation
    targetCtx.imageSmoothingEnabled = false
    targetCtx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
    
    // Apply selective smoothing
    const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
    await this.applyWaifu2xEnhancements(imageData, options)
    targetCtx.putImageData(imageData, 0, 0)
  }

  private static async applyESRGANUpscaling(
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    // ESRGAN-inspired upscaling for photos
    const targetCtx = targetCanvas.getContext("2d")!
    
    // High-quality scaling
    targetCtx.imageSmoothingEnabled = true
    targetCtx.imageSmoothingQuality = "high"
    targetCtx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
    
    // Apply photographic enhancements
    const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
    await this.applyESRGANEnhancements(imageData, options)
    targetCtx.putImageData(imageData, 0, 0)
  }

  private static async applyAutoUpscaling(
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    analysis: any,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    // Auto-select best algorithm based on analysis
    if (analysis.textRatio > 0.3) {
      await this.applyLanczosUpscaling(sourceCanvas, targetCanvas, options)
    } else if (analysis.artRatio > 0.4) {
      await this.applyWaifu2xUpscaling(sourceCanvas, targetCanvas, options)
    } else if (analysis.photoRatio > 0.5) {
      await this.applyESRGANUpscaling(sourceCanvas, targetCanvas, options)
    } else {
      await this.applySRCNNUpscaling(sourceCanvas, targetCanvas, options)
    }
  }

  private static async enhanceUpscaledImage(
    imageData: ImageData,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    const { data, width, height } = imageData
    
    // Apply detail enhancement
    if (options.enhanceDetails !== false) {
      await this.applyDetailEnhancement(data, width, height)
    }
    
    // Apply noise reduction
    if (options.reduceNoise !== false) {
      await this.applyNoiseReduction(data, width, height)
    }
    
    // Apply sharpening
    if (options.sharpenAmount && options.sharpenAmount > 0) {
      await this.applySharpening(data, width, height, options.sharpenAmount)
    }
  }

  private static async applySRCNNEnhancements(
    imageData: ImageData,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    const { data, width, height } = imageData
    
    // SRCNN-style detail enhancement
    const enhanced = new Uint8ClampedArray(data)
    
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let center = data[centerIdx + c] * 25
          
          // 5x5 kernel
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              sum += data[nIdx]
            }
          }
          
          const highPass = (center - sum) * 0.1
          enhanced[centerIdx + c] = Math.max(0, Math.min(255, data[centerIdx + c] + highPass))
        }
      }
    }
    
    // Apply enhancement
    for (let i = 0; i < data.length; i++) {
      data[i] = enhanced[i]
    }
  }

  private static async applyWaifu2xEnhancements(
    imageData: ImageData,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    const { data, width, height } = imageData
    
    // Selective smoothing for anime/art
    const smoothed = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4
        
        // Check if this is an edge pixel
        let isEdge = false
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const gradient = Math.abs(data[centerIdx] - data[nIdx]) +
                           Math.abs(data[centerIdx + 1] - data[nIdx + 1]) +
                           Math.abs(data[centerIdx + 2] - data[nIdx + 2])
            
            if (gradient > 60) {
              isEdge = true
              break
            }
          }
        }
        
        // Apply smoothing only to non-edge areas
        if (!isEdge) {
          for (let c = 0; c < 3; c++) {
            let sum = 0
            let count = 0
            
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
                sum += data[nIdx]
                count++
              }
            }
            
            smoothed[centerIdx + c] = Math.round(sum / count)
          }
        }
      }
    }
    
    // Apply smoothed version
    for (let i = 0; i < data.length; i++) {
      data[i] = smoothed[i]
    }
  }

  private static async applyESRGANEnhancements(
    imageData: ImageData,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    const { data, width, height } = imageData
    
    // ESRGAN-style photographic enhancement
    await this.applyDetailEnhancement(data, width, height)
    await this.applyNoiseReduction(data, width, height)
    
    // Color enhancement for photos
    if (options.colorEnhancement) {
      this.enhanceColors(data, width, height)
    }
  }

  private static async applyPostProcessingEnhancements(
    canvas: HTMLCanvasElement,
    analysis: any,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Apply final enhancements
    if (options.enhanceDetails !== false) {
      await this.applyDetailEnhancement(imageData.data, canvas.width, canvas.height)
    }
    
    if (options.reduceNoise !== false) {
      await this.applyNoiseReduction(imageData.data, canvas.width, canvas.height)
    }
    
    if (options.sharpenAmount && options.sharpenAmount > 0) {
      await this.applySharpening(imageData.data, canvas.width, canvas.height, options.sharpenAmount)
    }
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static async applyDetailEnhancement(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<void> {
    const enhanced = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let center = data[centerIdx + c] * 9
          
          // 3x3 kernel for detail enhancement
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              sum += data[nIdx]
            }
          }
          
          const highPass = (center - sum) * 0.15
          enhanced[centerIdx + c] = Math.max(0, Math.min(255, data[centerIdx + c] + highPass))
        }
      }
    }
    
    // Blend enhanced version
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(data[i + c] * 0.8 + enhanced[i + c] * 0.2)
      }
    }
  }

  private static async applyNoiseReduction(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<void> {
    const filtered = new Uint8ClampedArray(data)
    
    // Bilateral filter for noise reduction
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let weightSum = 0
          let valueSum = 0
          const centerValue = data[centerIdx + c]
          
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              const neighborValue = data[nIdx]
              
              const spatialWeight = Math.exp(-(dx * dx + dy * dy) / 8)
              const colorWeight = Math.exp(-Math.pow(centerValue - neighborValue, 2) / 800)
              const weight = spatialWeight * colorWeight
              
              weightSum += weight
              valueSum += neighborValue * weight
            }
          }
          
          filtered[centerIdx + c] = Math.round(valueSum / weightSum)
        }
      }
    }
    
    // Blend filtered version
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(data[i + c] * 0.7 + filtered[i + c] * 0.3)
      }
    }
  }

  private static async applySharpening(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    amount: number
  ): Promise<void> {
    const sharpened = new Uint8ClampedArray(data)
    const factor = amount / 100
    
    // Unsharp mask
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let center = data[centerIdx + c] * 9
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              sum += data[nIdx]
            }
          }
          
          const highPass = (center - sum) * factor * 0.1
          sharpened[centerIdx + c] = Math.max(0, Math.min(255, data[centerIdx + c] + highPass))
        }
      }
    }
    
    // Apply sharpened version
    for (let i = 0; i < data.length; i++) {
      data[i] = sharpened[i]
    }
  }

  private static enhanceColors(data: Uint8ClampedArray, width: number, height: number): void {
    // Subtle color enhancement
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      
      // Apply subtle saturation boost
      const saturationBoost = 1.05
      const gray = luminance
      
      data[i] = Math.max(0, Math.min(255, gray + (r - gray) * saturationBoost))
      data[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * saturationBoost))
      data[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * saturationBoost))
    }
  }

  private static calculateQualityMetrics(canvas: HTMLCanvasElement): {
    sharpness: number
    noise: number
    artifacts: number
  } {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    let sharpnessSum = 0
    let noiseSum = 0
    let artifactSum = 0
    let sampleCount = 0
    
    // Sample every 8th pixel for performance
    for (let y = 4; y < canvas.height - 4; y += 8) {
      for (let x = 4; x < canvas.width - 4; x += 8) {
        const centerIdx = (y * canvas.width + x) * 4
        
        // Calculate sharpness (edge strength)
        let maxGradient = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * canvas.width + (x + dx)) * 4
            const gradient = Math.abs(data[centerIdx] - data[nIdx]) +
                           Math.abs(data[centerIdx + 1] - data[nIdx + 1]) +
                           Math.abs(data[centerIdx + 2] - data[nIdx + 2])
            maxGradient = Math.max(maxGradient, gradient)
          }
        }
        sharpnessSum += maxGradient
        
        // Calculate noise (high frequency variation)
        let variation = 0
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nIdx = ((y + dy) * canvas.width + (x + dx)) * 4
            const brightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
            const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
            variation += Math.abs(brightness - centerBrightness)
          }
        }
        noiseSum += variation / 25
        
        sampleCount++
      }
    }
    
    return {
      sharpness: Math.min(100, (sharpnessSum / sampleCount) / 2),
      noise: Math.min(100, (noiseSum / sampleCount) / 5),
      artifacts: Math.max(0, 100 - (sharpnessSum / sampleCount) / 3)
    }
  }

  private static async createOutputBlob(
    canvas: HTMLCanvasElement,
    options: UltimateUpscaleOptions
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const quality = (options.quality || 95) / 100
      const mimeType = `image/${options.outputFormat || "png"}`
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to create output blob"))
          }
        },
        mimeType,
        quality
      )
    })
  }

  private static cleanupMemory(canvases: HTMLCanvasElement[]): void {
    canvases.forEach(canvas => {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      canvas.width = 1
      canvas.height = 1
    })
    
    // Force garbage collection
    setTimeout(() => {
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc()
      }
    }, 100)
  }
}