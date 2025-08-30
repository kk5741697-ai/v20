// Import the ultimate upscaler
import { UltimateImageUpscaler, type UltimateUpscaleOptions, type UpscaleResult } from "./ultimate-upscaler"

// Legacy interface for backward compatibility
export interface AdvancedImageOptions {
  scaleFactor?: number
  algorithm?: "auto" | "lanczos" | "bicubic" | "super-resolution" | "waifu2x" | "esrgan"
  enhanceDetails?: boolean
  reduceNoise?: boolean
  sharpen?: number
  quality?: number
  maxDimensions?: { width: number; height: number }
  useWebWorker?: boolean
  memoryOptimized?: boolean
  progressCallback?: (progress: number) => void
  autoOptimize?: boolean
  preserveAspectRatio?: boolean
}

export class AdvancedImageProcessor {
  static async upscaleImageAdvanced(file: File, options: AdvancedImageOptions = {}): Promise<Blob> {
    // Convert legacy options to ultimate options
    const ultimateOptions: UltimateUpscaleOptions = {
      scaleFactor: options.scaleFactor || 2,
      maxOutputDimension: Math.min(options.maxDimensions?.width || 4096, options.maxDimensions?.height || 4096),
      primaryAlgorithm: options.algorithm === "super-resolution" ? "srcnn" : 
                       options.algorithm === "waifu2x" ? "waifu2x" :
                       options.algorithm === "esrgan" ? "esrgan" :
                       options.algorithm || "auto",
      secondaryAlgorithm: "lanczos",
      hybridMode: true,
      enableContentAnalysis: true,
      contentType: "auto",
      enhanceDetails: options.enhanceDetails !== false,
      reduceNoise: options.reduceNoise !== false,
      sharpenAmount: options.sharpen || 25,
      colorEnhancement: true,
      multiPass: true,
      memoryOptimized: options.memoryOptimized !== false,
      chunkProcessing: true,
      outputFormat: "png",
      quality: options.quality || 95,
      progressCallback: options.progressCallback ? 
        (progress, stage) => options.progressCallback!(progress) : undefined,
      debugMode: false
    }
    
    // Use the ultimate upscaler
    const result = await UltimateImageUpscaler.upscaleImage(file, ultimateOptions)
    
    return result.processedBlob
  }

  private static getEnhancedAutoSettings(file: File, options: AdvancedImageOptions): Partial<AdvancedImageOptions> {
    const autoSettings: Partial<AdvancedImageOptions> = {}
    
    // Enhanced algorithm selection based on file analysis
    if (!options.algorithm || options.algorithm === "auto") {
      // Improved auto-detection based on file characteristics
      const fileName = file.name.toLowerCase()
      const fileSize = file.size
      
      if (fileName.includes('anime') || fileName.includes('art') || fileName.includes('cartoon')) {
        autoSettings.algorithm = "waifu2x"
      } else if (file.type.includes('jpeg') || fileName.includes('photo') || fileName.includes('portrait')) {
        autoSettings.algorithm = "esrgan"
      } else if (fileSize < 2 * 1024 * 1024) { // < 2MB
        autoSettings.algorithm = "super-resolution"
      } else if (fileSize < 5 * 1024 * 1024) { // < 5MB
        autoSettings.algorithm = "lanczos"
      } else {
        autoSettings.algorithm = "bicubic"
      }
    }
    
    // Enhanced scale factor selection
    if (!options.scaleFactor) {
      if (file.size > 5 * 1024 * 1024) {
        autoSettings.scaleFactor = 1.25 // Very conservative for large files
      } else if (file.size > 2 * 1024 * 1024) {
        autoSettings.scaleFactor = 1.5 // Conservative for medium files
      } else if (file.size > 1 * 1024 * 1024) {
        autoSettings.scaleFactor = 2.0
      } else {
        autoSettings.scaleFactor = 2.5 // Aggressive for small files only
      }
    }
    
    // Enhanced feature settings
    autoSettings.enhanceDetails = true
    autoSettings.reduceNoise = file.size > 1 * 1024 * 1024
    autoSettings.sharpen = file.type.includes('jpeg') ? 30 : 20 // Reduced sharpening
    autoSettings.memoryOptimized = true
    autoSettings.autoOptimize = true
    autoSettings.preserveAspectRatio = true
    
    // Enhanced max dimensions based on algorithm with safety limits
    const algorithmLimits = {
      'waifu2x': { width: 2048, height: 2048 },
      'esrgan': { width: 1536, height: 1536 },
      'super-resolution': { width: 1536, height: 1536 },
      'lanczos': { width: 2048, height: 2048 },
      'bicubic': { width: 1536, height: 1536 }
    }
    
    const selectedAlgorithm = autoSettings.algorithm || 'lanczos'
    autoSettings.maxDimensions = algorithmLimits[selectedAlgorithm as keyof typeof algorithmLimits] || { width: 1536, height: 1536 }
    
    return autoSettings
  }

  private static calculateEnhancedDimensions(
    originalWidth: number,
    originalHeight: number,
    scaleFactor: number,
    maxDimensions?: { width: number; height: number }
  ) {
    const targetWidth = originalWidth * scaleFactor
    const targetHeight = originalHeight * scaleFactor
    
    const maxWidth = Math.min(maxDimensions?.width || this.MAX_CANVAS_SIZE, this.MAX_CANVAS_SIZE)
    const maxHeight = Math.min(maxDimensions?.height || this.MAX_CANVAS_SIZE, this.MAX_CANVAS_SIZE)
    
    let workingWidth = originalWidth
    let workingHeight = originalHeight
    let needsPreScale = false
    
    // Check if original image is too large for processing
    if (originalWidth * originalHeight > this.MAX_SAFE_PIXELS) {
      const scale = Math.sqrt(this.MAX_SAFE_PIXELS / (originalWidth * originalHeight))
      workingWidth = Math.floor(originalWidth * scale)
      workingHeight = Math.floor(originalHeight * scale)
      needsPreScale = true
    }
    
    // Check if target dimensions exceed limits
    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const scale = Math.min(maxWidth / targetWidth, maxHeight / targetHeight)
      workingWidth = Math.floor(originalWidth * scale)
      workingHeight = Math.floor(originalHeight * scale)
      needsPreScale = true
    }
    
    // Additional safety check for memory usage
    const estimatedMemory = workingWidth * workingHeight * scaleFactor * scaleFactor * 4 // 4 bytes per pixel
    if (estimatedMemory > 50 * 1024 * 1024) { // 50MB memory limit
      const memoryScale = Math.sqrt(50 * 1024 * 1024 / estimatedMemory)
      workingWidth = Math.floor(workingWidth * memoryScale)
      workingHeight = Math.floor(workingHeight * memoryScale)
      needsPreScale = true
    }
    
    return { workingWidth, workingHeight, needsPreScale }
  }

  private static async applyEnhancedUpscaling(
    sourceCanvas: HTMLCanvasElement,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    const algorithm = options.algorithm || "lanczos"
    const scaleFactor = Math.min(options.scaleFactor || 2, 4) // Increased limit to 4x
    
    switch (algorithm) {
      case "waifu2x":
        return this.waifu2xUpscale(sourceCanvas, scaleFactor, options)
      case "esrgan":
        return this.esrganUpscale(sourceCanvas, scaleFactor, options)
      case "super-resolution":
        return this.enhancedSuperResolutionUpscale(sourceCanvas, scaleFactor, options)
      case "lanczos":
        return this.enhancedLanczosUpscale(sourceCanvas, scaleFactor)
      case "bicubic":
        return this.enhancedBicubicUpscale(sourceCanvas, scaleFactor)
      default:
        return this.intelligentUpscale(sourceCanvas, scaleFactor, options)
    }
  }

  private static async waifu2xUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    // Waifu2x-inspired algorithm optimized for anime/art
    options.progressCallback?.(45)
    
    // Multi-pass upscaling with anime-specific enhancements
    let currentCanvas = sourceCanvas
    let currentScale = 1
    const targetScale = Math.min(scaleFactor, 4)
    
    while (currentScale < targetScale) {
      const stepScale = Math.min(2, targetScale / currentScale)
      
      // Apply specialized upscaling for anime/art
      currentCanvas = await this.animeOptimizedUpscale(currentCanvas, stepScale)
      currentScale *= stepScale
      
      options.progressCallback?.(45 + (currentScale / targetScale) * 25)
      
      // Apply anime-specific enhancements
      const ctx = currentCanvas.getContext("2d")!
      const imageData = ctx.getImageData(0, 0, currentCanvas.width, currentCanvas.height)
      
      // Enhance line art and reduce artifacts
      this.enhanceLineArt(imageData.data, currentCanvas.width, currentCanvas.height)
      
      // Reduce color banding common in anime
      this.reduceColorBanding(imageData.data, currentCanvas.width, currentCanvas.height)
      
      ctx.putImageData(imageData, 0, 0)
      
      // Allow browser to breathe
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    return currentCanvas
  }

  private static async esrganUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    // ESRGAN-inspired algorithm for photographic content
    options.progressCallback?.(45)
    
    // Enhanced multi-scale processing
    const scales = scaleFactor > 2 ? [1.5, scaleFactor / 1.5] : [scaleFactor]
    let currentCanvas = sourceCanvas
    
    for (let i = 0; i < scales.length; i++) {
      const scale = scales[i]
      
      // Apply photographic upscaling
      currentCanvas = await this.photographicUpscale(currentCanvas, scale)
      
      options.progressCallback?.(45 + ((i + 1) / scales.length) * 25)
      
      // Apply ESRGAN-style enhancements
      const ctx = currentCanvas.getContext("2d")!
      const imageData = ctx.getImageData(0, 0, currentCanvas.width, currentCanvas.height)
      
      // Enhance photographic details
      this.enhancePhotographicDetails(imageData.data, currentCanvas.width, currentCanvas.height)
      
      // Reduce compression artifacts
      this.reduceCompressionArtifacts(imageData.data, currentCanvas.width, currentCanvas.height)
      
      ctx.putImageData(imageData, 0, 0)
      
      await new Promise(resolve => setTimeout(resolve, 15))
    }
    
    return currentCanvas
  }

  private static async enhancedSuperResolutionUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    // Enhanced super-resolution with better quality
    options.progressCallback?.(45)
    
    // Analyze image content for optimal processing
    const ctx = sourceCanvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const analysis = this.analyzeImageForUpscaling(imageData)
    
    // Multi-pass upscaling with content-aware enhancements
    let currentCanvas = sourceCanvas
    let currentScale = 1
    const targetScale = Math.min(scaleFactor, 3)
    
    while (currentScale < targetScale) {
      const stepScale = Math.min(1.6, targetScale / currentScale)
      
      // Apply content-aware upscaling
      if (analysis.hasSharpEdges && analysis.textContent > 0.1) {
        currentCanvas = await this.enhancedLanczosUpscale(currentCanvas, stepScale)
      } else if (analysis.hasPhotographicContent) {
        currentCanvas = await this.photographicUpscale(currentCanvas, stepScale)
      } else {
        currentCanvas = await this.adaptiveUpscale(currentCanvas, stepScale, analysis)
      }
      
      currentScale *= stepScale
      options.progressCallback?.(45 + (currentScale / targetScale) * 25)
      
      // Apply progressive enhancement
      const newCtx = currentCanvas.getContext("2d")!
      const newImageData = newCtx.getImageData(0, 0, currentCanvas.width, currentCanvas.height)
      
      // Content-specific enhancements
      if (analysis.hasSharpEdges) {
        this.enhanceSharpEdges(newImageData.data, currentCanvas.width, currentCanvas.height)
      }
      
      if (analysis.hasPhotographicContent) {
        this.enhancePhotographicContent(newImageData.data, currentCanvas.width, currentCanvas.height)
      }
      
      // Apply noise reduction if enabled
      if (options.reduceNoise) {
        this.applyAdvancedNoiseReduction(newImageData.data, currentCanvas.width, currentCanvas.height)
      }
      
      newCtx.putImageData(newImageData, 0, 0)
      
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    return currentCanvas
  }

  private static async enhancedLanczosUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number
  ): Promise<HTMLCanvasElement> {
    const srcCtx = sourceCanvas.getContext("2d")!
    const srcImageData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const srcData = srcImageData.data
    
    const targetWidth = Math.min(Math.floor(sourceCanvas.width * scaleFactor), this.MAX_CANVAS_SIZE)
    const targetHeight = Math.min(Math.floor(sourceCanvas.height * scaleFactor), this.MAX_CANVAS_SIZE)
    
    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d")!
    resultCanvas.width = targetWidth
    resultCanvas.height = targetHeight
    
    const resultImageData = resultCtx.createImageData(targetWidth, targetHeight)
    const resultData = resultImageData.data
    
    // Enhanced Lanczos-4 kernel for better quality
    const lanczos = (x: number): number => {
      if (x === 0) return 1
      if (Math.abs(x) >= 4) return 0
      
      const piX = Math.PI * x
      return (4 * Math.sin(piX) * Math.sin(piX / 4)) / (piX * piX)
    }
    
    // Process with optimized chunking
    const chunkSize = 500
    
    for (let startY = 0; startY < targetHeight; startY += chunkSize) {
      const endY = Math.min(startY + chunkSize, targetHeight)
      
      for (let targetY = startY; targetY < endY; targetY++) {
        for (let targetX = 0; targetX < targetWidth; targetX++) {
          const srcX = targetX / scaleFactor
          const srcY = targetY / scaleFactor
          
          let r = 0, g = 0, b = 0, a = 0, weightSum = 0
          
          // Enhanced 8x8 neighborhood sampling
          for (let dy = -3; dy <= 4; dy++) {
            for (let dx = -3; dx <= 4; dx++) {
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
          
          const targetIndex = (targetY * targetWidth + targetX) * 4
          resultData[targetIndex] = Math.max(0, Math.min(255, r / weightSum))
          resultData[targetIndex + 1] = Math.max(0, Math.min(255, g / weightSum))
          resultData[targetIndex + 2] = Math.max(0, Math.min(255, b / weightSum))
          resultData[targetIndex + 3] = Math.max(0, Math.min(255, a / weightSum))
        }
      }
      
      // Allow browser to breathe
      await new Promise(resolve => setTimeout(resolve, 1))
    }
    
    resultCtx.putImageData(resultImageData, 0, 0)
    return resultCanvas
  }

  private static async enhancedBicubicUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number
  ): Promise<HTMLCanvasElement> {
    const targetWidth = Math.min(Math.floor(sourceCanvas.width * scaleFactor), this.MAX_CANVAS_SIZE)
    const targetHeight = Math.min(Math.floor(sourceCanvas.height * scaleFactor), this.MAX_CANVAS_SIZE)
    
    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d")!
    resultCanvas.width = targetWidth
    resultCanvas.height = targetHeight
    
    // Enhanced bicubic with better quality settings
    resultCtx.imageSmoothingEnabled = true
    resultCtx.imageSmoothingQuality = "high"
    
    // Multi-pass scaling for better quality
    if (scaleFactor > 2) {
      const intermediateScale = Math.sqrt(scaleFactor)
      const intermediateCanvas = document.createElement("canvas")
      const intermediateCtx = intermediateCanvas.getContext("2d")!
      
      intermediateCanvas.width = Math.floor(sourceCanvas.width * intermediateScale)
      intermediateCanvas.height = Math.floor(sourceCanvas.height * intermediateScale)
      
      intermediateCtx.imageSmoothingEnabled = true
      intermediateCtx.imageSmoothingQuality = "high"
      intermediateCtx.drawImage(sourceCanvas, 0, 0, intermediateCanvas.width, intermediateCanvas.height)
      
      resultCtx.drawImage(intermediateCanvas, 0, 0, targetWidth, targetHeight)
    } else {
      resultCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
    }
    
    // Apply enhanced sharpening
    const imageData = resultCtx.getImageData(0, 0, targetWidth, targetHeight)
    this.applyEnhancedUnsharpMask(imageData.data, targetWidth, targetHeight, 0.8, 1.5, 2)
    resultCtx.putImageData(imageData, 0, 0)
    
    return resultCanvas
  }

  private static async animeOptimizedUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number
  ): Promise<HTMLCanvasElement> {
    // Specialized upscaling for anime/art content
    const srcCtx = sourceCanvas.getContext("2d")!
    const srcImageData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    
    const targetWidth = Math.floor(sourceCanvas.width * scaleFactor)
    const targetHeight = Math.floor(sourceCanvas.height * scaleFactor)
    
    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d")!
    resultCanvas.width = targetWidth
    resultCanvas.height = targetHeight
    
    // Use nearest neighbor for sharp pixel art, then smooth
    resultCtx.imageSmoothingEnabled = false
    resultCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
    
    // Apply selective smoothing to avoid blurring line art
    const imageData = resultCtx.getImageData(0, 0, targetWidth, targetHeight)
    this.applySelectiveSmoothing(imageData.data, targetWidth, targetHeight)
    resultCtx.putImageData(imageData, 0, 0)
    
    return resultCanvas
  }

  private static async photographicUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number
  ): Promise<HTMLCanvasElement> {
    // Optimized for photographic content
    const targetWidth = Math.floor(sourceCanvas.width * scaleFactor)
    const targetHeight = Math.floor(sourceCanvas.height * scaleFactor)
    
    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d")!
    resultCanvas.width = targetWidth
    resultCanvas.height = targetHeight
    
    // Use high-quality browser scaling as base
    resultCtx.imageSmoothingEnabled = true
    resultCtx.imageSmoothingQuality = "high"
    resultCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
    
    // Apply photographic enhancements
    const imageData = resultCtx.getImageData(0, 0, targetWidth, targetHeight)
    
    // Enhance details without over-sharpening
    this.enhancePhotographicDetails(imageData.data, targetWidth, targetHeight)
    
    // Apply subtle noise reduction
    this.applyBilateralFilter(imageData.data, targetWidth, targetHeight, 2, 30, 30)
    
    resultCtx.putImageData(imageData, 0, 0)
    
    return resultCanvas
  }

  private static async adaptiveUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    analysis: any
  ): Promise<HTMLCanvasElement> {
    // Adaptive algorithm based on content analysis
    if (analysis.hasSharpEdges && analysis.textContent > 0.15) {
      return this.enhancedLanczosUpscale(sourceCanvas, scaleFactor)
    } else if (analysis.hasPhotographicContent && analysis.noiseLevel < 0.1) {
      return this.photographicUpscale(sourceCanvas, scaleFactor)
    } else {
      return this.enhancedBicubicUpscale(sourceCanvas, scaleFactor)
    }
  }

  private static async intelligentUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    // Intelligent algorithm selection based on real-time analysis
    const ctx = sourceCanvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const analysis = this.analyzeImageForUpscaling(imageData)
    
    options.progressCallback?.(45)
    
    // Select best algorithm based on analysis
    if (analysis.isPixelArt) {
      return this.animeOptimizedUpscale(sourceCanvas, scaleFactor)
    } else if (analysis.hasPhotographicContent && analysis.noiseLevel < 0.2) {
      return this.photographicUpscale(sourceCanvas, scaleFactor)
    } else if (analysis.hasSharpEdges) {
      return this.enhancedLanczosUpscale(sourceCanvas, scaleFactor)
    } else {
      return this.enhancedBicubicUpscale(sourceCanvas, scaleFactor)
    }
  }

  private static analyzeImageForUpscaling(imageData: ImageData): {
    hasSharpEdges: boolean
    textContent: number
    hasPhotographicContent: boolean
    noiseLevel: number
    isPixelArt: boolean
    colorComplexity: number
  } {
    const { data, width, height } = imageData
    let edgeCount = 0
    let highFrequencyCount = 0
    let colorVariation = 0
    let pixelArtIndicators = 0
    let uniqueColors = new Set<string>()
    let totalPixels = 0
    
    // Enhanced analysis with more metrics
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = (y * width + x) * 4
        totalPixels++
        
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        // Track unique colors for pixel art detection
        const colorKey = `${Math.floor(r/4)}-${Math.floor(g/4)}-${Math.floor(b/4)}`
        uniqueColors.add(colorKey)
        
        // Enhanced edge detection
        let maxGradient = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const gradient = Math.abs(data[idx] - data[nIdx]) +
                           Math.abs(data[idx + 1] - data[nIdx + 1]) +
                           Math.abs(data[idx + 2] - data[nIdx + 2])
            maxGradient = Math.max(maxGradient, gradient)
          }
        }
        
        if (maxGradient > 40) edgeCount++
        if (maxGradient > 120) highFrequencyCount++
        
        // Check for pixel art characteristics
        if (maxGradient === 0 || maxGradient > 200) pixelArtIndicators++
        
        // Color variation
        const variation = Math.max(r, g, b) - Math.min(r, g, b)
        colorVariation += variation
      }
    }
    
    const colorComplexity = uniqueColors.size / totalPixels
    
    return {
      hasSharpEdges: edgeCount / totalPixels > 0.12,
      textContent: highFrequencyCount / totalPixels,
      hasPhotographicContent: colorVariation / totalPixels > 25 && colorComplexity > 0.1,
      noiseLevel: highFrequencyCount / totalPixels,
      isPixelArt: colorComplexity < 0.05 && pixelArtIndicators / totalPixels > 0.3,
      colorComplexity
    }
  }

  private static enhanceLineArt(data: Uint8ClampedArray, width: number, height: number): void {
    // Enhance line art without blurring
    const enhanced = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4
        
        // Check if this is a line art edge
        let isLineArt = false
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
        
        // Strong edges indicate line art
        if (maxGradient > 150) {
          isLineArt = true
        }
        
        if (isLineArt) {
          // Enhance contrast for line art
          for (let c = 0; c < 3; c++) {
            const value = data[centerIdx + c]
            enhanced[centerIdx + c] = value < 128 ? Math.max(0, value - 20) : Math.min(255, value + 20)
          }
        }
      }
    }
    
    // Blend enhanced version
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(data[i + c] * 0.7 + enhanced[i + c] * 0.3)
      }
    }
  }

  private static reduceColorBanding(data: Uint8ClampedArray, width: number, height: number): void {
    // Reduce color banding common in anime/digital art
    const dithered = new Uint8ClampedArray(data)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          const value = data[idx + c]
          
          // Apply subtle dithering to reduce banding
          const noise = (Math.random() - 0.5) * 4
          dithered[idx + c] = Math.max(0, Math.min(255, value + noise))
        }
      }
    }
    
    // Blend with original
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(data[i + c] * 0.9 + dithered[i + c] * 0.1)
      }
    }
  }

  private static enhancePhotographicDetails(data: Uint8ClampedArray, width: number, height: number): void {
    // Enhance details in photographic content
    const enhanced = new Uint8ClampedArray(data)
    
    // Multi-scale detail enhancement
    const scales = [1, 2]
    
    scales.forEach(scale => {
      for (let y = scale; y < height - scale; y++) {
        for (let x = scale; x < width - scale; x++) {
          const centerIdx = (y * width + x) * 4
          
          for (let c = 0; c < 3; c++) {
            let sum = 0
            let center = data[centerIdx + c] * 9
            
            // Enhanced detail detection kernel
            for (let dy = -scale; dy <= scale; dy += scale) {
              for (let dx = -scale; dx <= scale; dx += scale) {
                const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
                sum += data[nIdx]
              }
            }
            
            const highPass = center - sum
            const enhancement = highPass * (0.15 / scale) // Scale-dependent enhancement
            enhanced[centerIdx + c] = Math.max(0, Math.min(255, data[centerIdx + c] + enhancement))
          }
        }
      }
    })
    
    // Blend enhanced version
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(data[i + c] * 0.8 + enhanced[i + c] * 0.2)
      }
    }
  }

  private static reduceCompressionArtifacts(data: Uint8ClampedArray, width: number, height: number): void {
    // Reduce JPEG compression artifacts
    const filtered = new Uint8ClampedArray(data)
    
    // Apply selective bilateral filtering
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let weightSum = 0
          let valueSum = 0
          const centerValue = data[centerIdx + c]
          
          // 5x5 neighborhood
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

  private static enhanceSharpEdges(data: Uint8ClampedArray, width: number, height: number): void {
    // Enhance sharp edges without creating artifacts
    const enhanced = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4
        
        // Calculate edge strength
        let edgeStrength = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const gradient = Math.abs(data[centerIdx] - data[nIdx]) +
                           Math.abs(data[centerIdx + 1] - data[nIdx + 1]) +
                           Math.abs(data[centerIdx + 2] - data[nIdx + 2])
            edgeStrength = Math.max(edgeStrength, gradient)
          }
        }
        
        // Enhance only strong edges
        if (edgeStrength > 60) {
          for (let c = 0; c < 3; c++) {
            const value = data[centerIdx + c]
            const enhancement = (value - 128) * 0.2
            enhanced[centerIdx + c] = Math.max(0, Math.min(255, value + enhancement))
          }
        }
      }
    }
    
    // Apply enhancement
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = enhanced[i + c]
      }
    }
  }

  private static enhancePhotographicContent(data: Uint8ClampedArray, width: number, height: number): void {
    // Enhance photographic content with natural look
    const enhanced = new Uint8ClampedArray(data)
    
    // Apply local contrast enhancement
    for (let y = 3; y < height - 3; y++) {
      for (let x = 3; x < width - 3; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let localSum = 0
          let localCount = 0
          
          // Calculate local average
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              localSum += data[nIdx]
              localCount++
            }
          }
          
          const localAvg = localSum / localCount
          const centerValue = data[centerIdx + c]
          
          // Apply local contrast enhancement
          const contrast = (centerValue - localAvg) * 0.3
          enhanced[centerIdx + c] = Math.max(0, Math.min(255, centerValue + contrast))
        }
      }
    }
    
    // Blend enhanced version
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(data[i + c] * 0.75 + enhanced[i + c] * 0.25)
      }
    }
  }

  private static applySelectiveSmoothing(data: Uint8ClampedArray, width: number, height: number): void {
    // Apply smoothing only to non-edge areas
    const smoothed = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4
        
        // Calculate edge strength
        let edgeStrength = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const gradient = Math.abs(data[centerIdx] - data[nIdx]) +
                           Math.abs(data[centerIdx + 1] - data[nIdx + 1]) +
                           Math.abs(data[centerIdx + 2] - data[nIdx + 2])
            edgeStrength = Math.max(edgeStrength, gradient)
          }
        }
        
        // Apply smoothing only to non-edge areas
        if (edgeStrength < 50) {
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
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = smoothed[i + c]
      }
    }
  }

  private static applyAdvancedNoiseReduction(data: Uint8ClampedArray, width: number, height: number): void {
    // Advanced noise reduction with edge preservation
    this.applyBilateralFilter(data, width, height, 3, 40, 40)
  }

  private static applyBilateralFilter(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number,
    sigmaSpace: number,
    sigmaColor: number
  ): void {
    const filtered = new Uint8ClampedArray(data)
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let weightSum = 0
          let valueSum = 0
          const centerValue = data[centerIdx + c]
          
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              const neighborValue = data[nIdx]
              
              const spatialWeight = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaSpace * sigmaSpace))
              const colorWeight = Math.exp(-Math.pow(centerValue - neighborValue, 2) / (2 * sigmaColor * sigmaColor))
              const weight = spatialWeight * colorWeight
              
              weightSum += weight
              valueSum += neighborValue * weight
            }
          }
          
          filtered[centerIdx + c] = Math.round(valueSum / weightSum)
        }
      }
    }
    
    // Copy filtered data back
    for (let i = 0; i < data.length; i++) {
      data[i] = filtered[i]
    }
  }

  private static applyEnhancedUnsharpMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    amount: number,
    threshold: number,
    radius: number
  ): void {
    const blurred = new Uint8ClampedArray(data)
    
    // Apply Gaussian blur with specified radius
    this.gaussianBlur(blurred, width, height, radius)
    
    // Apply enhanced unsharp mask
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const original = data[i + c]
        const blur = blurred[i + c]
        const diff = original - blur
        
        if (Math.abs(diff) > threshold) {
          const sharpened = original + diff * amount
          data[i + c] = Math.max(0, Math.min(255, sharpened))
        }
      }
    }
  }

  private static gaussianBlur(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    sigma: number
  ): void {
    const radius = Math.ceil(sigma * 3)
    const kernel = []
    let kernelSum = 0
    
    // Create kernel
    for (let i = -radius; i <= radius; i++) {
      const value = Math.exp(-(i * i) / (2 * sigma * sigma))
      kernel.push(value)
      kernelSum += value
    }
    
    // Normalize
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] /= kernelSum
    }
    
    const temp = new Uint8ClampedArray(data)
    
    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          
          for (let i = -radius; i <= radius; i++) {
            const nx = Math.max(0, Math.min(width - 1, x + i))
            const nIdx = (y * width + nx) * 4 + c
            sum += temp[nIdx] * kernel[i + radius]
          }
          
          data[idx + c] = Math.round(sum)
        }
      }
    }
    
    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          
          for (let i = -radius; i <= radius; i++) {
            const ny = Math.max(0, Math.min(height - 1, y + i))
            const nIdx = (ny * width + x) * 4 + c
            sum += data[nIdx] * kernel[i + radius]
          }
          
          temp[idx + c] = Math.round(sum)
        }
      }
    }
    
    // Copy back
    for (let i = 0; i < data.length; i++) {
      data[i] = temp[i]
    }
  }

  private static async applyEnhancedPostProcessing(
    canvas: HTMLCanvasElement,
    options: AdvancedImageOptions
  ): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Enhanced detail enhancement
    if (options.enhanceDetails !== false) {
      this.applyAdvancedDetailEnhancement(data, canvas.width, canvas.height)
    }
    
    // Enhanced noise reduction
    if (options.reduceNoise !== false) {
      this.applyAdvancedNoiseReduction(data, canvas.width, canvas.height)
    }
    
    // Enhanced sharpening with adaptive amount
    const sharpenAmount = options.sharpen || 25
    if (sharpenAmount > 0) {
      const adaptiveAmount = this.calculateAdaptiveSharpenAmount(data, canvas.width, canvas.height, sharpenAmount)
      this.applyEnhancedUnsharpMask(data, canvas.width, canvas.height, adaptiveAmount / 100, 1.5, 1.2)
    }
    
    // Apply color enhancement
    this.enhanceColors(data, canvas.width, canvas.height)
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static applyAdvancedDetailEnhancement(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const enhanced = new Uint8ClampedArray(data)
    
    // Multi-scale detail enhancement
    const scales = [1, 2, 3]
    
    scales.forEach((scale, scaleIndex) => {
      const weight = 1 / (scaleIndex + 1) // Decreasing weight for larger scales
      
      for (let y = scale; y < height - scale; y++) {
        for (let x = scale; x < width - scale; x++) {
          const centerIdx = (y * width + x) * 4
          
          for (let c = 0; c < 3; c++) {
            let sum = 0
            let center = data[centerIdx + c] * (scale * 2 + 1) ** 2
            
            // Variable kernel size based on scale
            for (let dy = -scale; dy <= scale; dy++) {
              for (let dx = -scale; dx <= scale; dx++) {
                const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
                sum += data[nIdx]
              }
            }
            
            const highPass = (center - sum) * weight * 0.15
            enhanced[centerIdx + c] = Math.max(0, Math.min(255, data[centerIdx + c] + highPass))
          }
        }
      }
    })
    
    // Blend enhanced version
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(data[i + c] * 0.75 + enhanced[i + c] * 0.25)
      }
    }
  }

  private static calculateAdaptiveSharpenAmount(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    baseAmount: number
  ): number {
    // Calculate adaptive sharpening based on image content
    let edgeCount = 0
    let totalPixels = 0
    
    for (let y = 1; y < height - 1; y += 3) {
      for (let x = 1; x < width - 1; x += 3) {
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
        
        if (maxGradient > 30) edgeCount++
        totalPixels++
      }
    }
    
    const edgeRatio = edgeCount / totalPixels
    
    // Reduce sharpening for images with many edges to avoid artifacts
    if (edgeRatio > 0.3) {
      return baseAmount * 0.7
    } else if (edgeRatio < 0.1) {
      return baseAmount * 1.3 // Increase for smooth images
    }
    
    return baseAmount
  }

  private static enhanceColors(data: Uint8ClampedArray, width: number, height: number): void {
    // Subtle color enhancement for upscaled images
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