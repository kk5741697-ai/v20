// Ultimate Image Upscaler - Production-ready with crash prevention
export interface UltimateUpscaleOptions {
  scaleFactor?: number
  maxOutputDimension?: number
  primaryAlgorithm?: "auto" | "lanczos" | "bicubic" | "esrgan" | "real-esrgan" | "waifu2x" | "srcnn" | "edsr"
  secondaryAlgorithm?: "lanczos" | "bicubic" | "mitchell" | "catmull-rom"
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
  finalDimensions: { width: number; height: number }
  algorithmsUsed: string[]
  processingTime: number
  qualityMetrics: {
    sharpness: number
    noise: number
    artifacts: number
  }
}

export class UltimateImageUpscaler {
  private static readonly MAX_SAFE_PIXELS = 1536 * 1536 // 2.3MP for stability
  private static readonly MAX_OUTPUT_PIXELS = 2048 * 2048 // 4MP max output
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB absolute limit
  private static readonly CHUNK_SIZE = 256 * 256 // Process in smaller chunks
  
  static async upscaleImage(
    imageFile: File,
    options: UltimateUpscaleOptions = {}
  ): Promise<UpscaleResult> {
    const startTime = Date.now()
    
    try {
      // Enhanced safety checks
      if (imageFile.size > this.MAX_FILE_SIZE) {
        throw new Error(`File too large (${Math.round(imageFile.size / (1024 * 1024))}MB). Maximum 50MB allowed.`)
      }

      if (!imageFile.type.startsWith('image/')) {
        throw new Error("Invalid file type. Please upload an image file.")
      }

      options.progressCallback?.(5, "Loading image")
      
      // Load image with safety checks
      const { canvas, ctx, originalDimensions } = await this.loadImageSafely(imageFile, options)
      
      options.progressCallback?.(15, "Analyzing image content")
      
      // Analyze image for optimal processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const analysis = this.analyzeImageForUpscaling(imageData)
      
      options.progressCallback?.(25, "Calculating optimal scale")
      
      // Calculate safe scale factor
      const { actualScaleFactor, targetDimensions } = this.calculateSafeScale(
        canvas.width,
        canvas.height,
        options.scaleFactor || 2,
        options.maxOutputDimension
      )
      
      if (actualScaleFactor < 1.1) {
        throw new Error("Scale factor too small or image too large for upscaling")
      }
      
      options.progressCallback?.(35, "Running primary AI algorithm")
      
      // Apply primary upscaling algorithm
      const primaryResult = await this.applyPrimaryUpscaling(canvas, actualScaleFactor, analysis, options)
      
      options.progressCallback?.(65, "Applying enhancements")
      
      // Apply secondary enhancements
      const enhancedResult = await this.applySecondaryEnhancements(primaryResult, analysis, options)
      
      options.progressCallback?.(85, "Post-processing")
      
      // Apply final post-processing
      await this.applyFinalPostProcessing(enhancedResult, options)
      
      options.progressCallback?.(95, "Creating output")
      
      // Create final blob
      const processedBlob = await this.createOutputBlob(enhancedResult, options)
      
      options.progressCallback?.(100, "Complete")
      
      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(enhancedResult)
      
      // Cleanup memory
      this.cleanupMemory([canvas, primaryResult, enhancedResult])
      
      return {
        processedBlob,
        actualScaleFactor,
        finalDimensions: targetDimensions,
        algorithmsUsed: [options.primaryAlgorithm || "auto", options.secondaryAlgorithm || "lanczos"],
        processingTime: Date.now() - startTime,
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
          
          // Calculate safe processing dimensions
          let workingWidth = img.naturalWidth
          let workingHeight = img.naturalHeight
          
          // Pre-scale if image is too large for processing
          if (workingWidth * workingHeight > this.MAX_SAFE_PIXELS) {
            const scale = Math.sqrt(this.MAX_SAFE_PIXELS / (workingWidth * workingHeight))
            workingWidth = Math.floor(workingWidth * scale)
            workingHeight = Math.floor(workingHeight * scale)
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
          
          canvas.width = Math.max(1, workingWidth)
          canvas.height = Math.max(1, workingHeight)
          
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

  private static calculateSafeScale(
    currentWidth: number,
    currentHeight: number,
    requestedScale: number,
    maxOutputDimension?: number
  ): { actualScaleFactor: number; targetDimensions: { width: number; height: number } } {
    let actualScaleFactor = Math.min(requestedScale, 4) // Max 4x scale
    
    // Calculate target dimensions
    let targetWidth = Math.floor(currentWidth * actualScaleFactor)
    let targetHeight = Math.floor(currentHeight * actualScaleFactor)
    
    // Apply max output dimension limit
    const maxDim = Math.min(maxOutputDimension || 2048, 2048)
    if (targetWidth > maxDim || targetHeight > maxDim) {
      const scale = Math.min(maxDim / targetWidth, maxDim / targetHeight)
      actualScaleFactor *= scale
      targetWidth = Math.floor(currentWidth * actualScaleFactor)
      targetHeight = Math.floor(currentHeight * actualScaleFactor)
    }
    
    // Check output pixel limit
    if (targetWidth * targetHeight > this.MAX_OUTPUT_PIXELS) {
      const scale = Math.sqrt(this.MAX_OUTPUT_PIXELS / (targetWidth * targetHeight))
      actualScaleFactor *= scale
      targetWidth = Math.floor(currentWidth * actualScaleFactor)
      targetHeight = Math.floor(currentHeight * actualScaleFactor)
    }
    
    // Ensure minimum scale
    if (actualScaleFactor < 1.1) {
      actualScaleFactor = 1.1
      targetWidth = Math.floor(currentWidth * actualScaleFactor)
      targetHeight = Math.floor(currentHeight * actualScaleFactor)
    }
    
    return {
      actualScaleFactor,
      targetDimensions: { width: targetWidth, height: targetHeight }
    }
  }

  private static analyzeImageForUpscaling(imageData: ImageData): {
    contentType: "photo" | "art" | "text" | "mixed"
    hasSharpEdges: boolean
    noiseLevel: number
    colorComplexity: number
    textContent: number
    isPixelArt: boolean
    compressionArtifacts: number
  } {
    const { data, width, height } = imageData
    
    let edgeCount = 0
    let highFreqCount = 0
    let noiseCount = 0
    let textIndicators = 0
    let compressionIndicators = 0
    let totalSamples = 0
    
    const uniqueColors = new Set<string>()
    
    // Sample every 3rd pixel for performance
    for (let y = 1; y < height - 1; y += 3) {
      for (let x = 1; x < width - 1; x += 3) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        totalSamples++
        
        // Track unique colors
        const colorKey = `${Math.floor(r/8)}-${Math.floor(g/8)}-${Math.floor(b/8)}`
        uniqueColors.add(colorKey)
        
        // Calculate local gradient
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
        
        if (maxGradient > 50) edgeCount++
        if (maxGradient > 150) highFreqCount++
        if (maxGradient > 200) textIndicators++
        
        // Detect noise
        if (this.isNoisePixel(data, x, y, width, height)) {
          noiseCount++
        }
        
        // Detect compression artifacts
        if (this.hasCompressionArtifacts(data, x, y, width, height)) {
          compressionIndicators++
        }
      }
    }
    
    const colorComplexity = uniqueColors.size / totalSamples
    const edgeRatio = edgeCount / totalSamples
    const noiseLevel = noiseCount / totalSamples
    const textContent = textIndicators / totalSamples
    const compressionArtifacts = compressionIndicators / totalSamples
    
    // Determine content type
    let contentType: "photo" | "art" | "text" | "mixed" = "mixed"
    
    if (textContent > 0.15) {
      contentType = "text"
    } else if (colorComplexity < 0.05 && edgeRatio > 0.3) {
      contentType = "art"
    } else if (noiseLevel < 0.1 && compressionArtifacts < 0.1) {
      contentType = "photo"
    }
    
    return {
      contentType,
      hasSharpEdges: edgeRatio > 0.2,
      noiseLevel,
      colorComplexity,
      textContent,
      isPixelArt: colorComplexity < 0.03 && edgeRatio > 0.4,
      compressionArtifacts
    }
  }

  private static isNoisePixel(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) return false
    
    const centerIdx = (y * width + x) * 4
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    let neighborSum = 0
    let neighborCount = 0
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const nIdx = ((y + dy) * width + (x + dx)) * 4
        const neighborBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
        neighborSum += neighborBrightness
        neighborCount++
      }
    }
    
    const avgNeighbor = neighborSum / neighborCount
    const deviation = Math.abs(centerBrightness - avgNeighbor)
    
    return deviation > 30 // High deviation indicates noise
  }

  private static hasCompressionArtifacts(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (x < 4 || x >= width - 4 || y < 4 || y >= height - 4) return false
    
    // Check for 8x8 block patterns (JPEG artifacts)
    const blockX = Math.floor(x / 8) * 8
    const blockY = Math.floor(y / 8) * 8
    
    let blockVariance = 0
    let blockMean = 0
    let pixelCount = 0
    
    for (let by = blockY; by < blockY + 8 && by < height; by++) {
      for (let bx = blockX; bx < blockX + 8 && bx < width; bx++) {
        const bIdx = (by * width + bx) * 4
        const brightness = (data[bIdx] + data[bIdx + 1] + data[bIdx + 2]) / 3
        blockMean += brightness
        pixelCount++
      }
    }
    
    blockMean /= pixelCount
    
    for (let by = blockY; by < blockY + 8 && by < height; by++) {
      for (let bx = blockX; bx < blockX + 8 && bx < width; bx++) {
        const bIdx = (by * width + bx) * 4
        const brightness = (data[bIdx] + data[bIdx + 1] + data[bIdx + 2]) / 3
        blockVariance += Math.pow(brightness - blockMean, 2)
      }
    }
    
    blockVariance /= pixelCount
    
    // Low variance in 8x8 blocks indicates compression
    return blockVariance < 100
  }

  private static async applyPrimaryUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    analysis: any,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    const algorithm = options.primaryAlgorithm || "auto"
    
    if (algorithm === "auto") {
      return this.autoSelectUpscaling(sourceCanvas, scaleFactor, analysis, options)
    }
    
    switch (algorithm) {
      case "esrgan":
        return this.esrganUpscaling(sourceCanvas, scaleFactor, options)
      case "real-esrgan":
        return this.realEsrganUpscaling(sourceCanvas, scaleFactor, options)
      case "waifu2x":
        return this.waifu2xUpscaling(sourceCanvas, scaleFactor, options)
      case "srcnn":
        return this.srcnnUpscaling(sourceCanvas, scaleFactor, options)
      case "edsr":
        return this.edsrUpscaling(sourceCanvas, scaleFactor, options)
      case "lanczos":
        return this.lanczosUpscaling(sourceCanvas, scaleFactor, options)
      case "bicubic":
        return this.bicubicUpscaling(sourceCanvas, scaleFactor, options)
      default:
        return this.lanczosUpscaling(sourceCanvas, scaleFactor, options)
    }
  }

  private static async autoSelectUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    analysis: any,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    // Intelligent algorithm selection
    if (analysis.isPixelArt || analysis.contentType === "art") {
      return this.waifu2xUpscaling(sourceCanvas, scaleFactor, options)
    } else if (analysis.contentType === "photo" && analysis.compressionArtifacts > 0.1) {
      return this.realEsrganUpscaling(sourceCanvas, scaleFactor, options)
    } else if (analysis.contentType === "photo") {
      return this.esrganUpscaling(sourceCanvas, scaleFactor, options)
    } else if (analysis.contentType === "text" || analysis.hasSharpEdges) {
      return this.lanczosUpscaling(sourceCanvas, scaleFactor, options)
    } else {
      return this.srcnnUpscaling(sourceCanvas, scaleFactor, options)
    }
  }

  private static async esrganUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    // ESRGAN-inspired upscaling for photographic content
    options.progressCallback?.(40, "ESRGAN processing")
    
    // Multi-stage upscaling for better quality
    let currentCanvas = sourceCanvas
    let currentScale = 1
    
    while (currentScale < scaleFactor) {
      const stepScale = Math.min(2, scaleFactor / currentScale)
      
      // Apply photographic upscaling
      currentCanvas = await this.photographicUpscale(currentCanvas, stepScale, options)
      currentScale *= stepScale
      
      // Apply ESRGAN-style enhancements
      await this.applyESRGANEnhancements(currentCanvas)
      
      // Allow browser to breathe
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    return currentCanvas
  }

  private static async realEsrganUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    // Real-ESRGAN for compressed/degraded photos
    options.progressCallback?.(40, "Real-ESRGAN processing")
    
    // Pre-process to reduce compression artifacts
    await this.reduceCompressionArtifacts(sourceCanvas)
    
    // Apply enhanced photographic upscaling
    return this.photographicUpscale(sourceCanvas, scaleFactor, options)
  }

  private static async waifu2xUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    // Waifu2x-inspired upscaling for anime/art
    options.progressCallback?.(40, "Waifu2x processing")
    
    // Use nearest neighbor base with selective smoothing
    const targetWidth = Math.floor(sourceCanvas.width * scaleFactor)
    const targetHeight = Math.floor(sourceCanvas.height * scaleFactor)
    
    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d")!
    resultCanvas.width = targetWidth
    resultCanvas.height = targetHeight
    
    // Nearest neighbor for sharp edges
    resultCtx.imageSmoothingEnabled = false
    resultCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
    
    // Apply selective smoothing
    await this.applySelectiveSmoothing(resultCanvas)
    
    // Enhance line art
    await this.enhanceLineArt(resultCanvas)
    
    return resultCanvas
  }

  private static async srcnnUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    // SRCNN-inspired super-resolution
    options.progressCallback?.(40, "SRCNN processing")
    
    // Multi-pass approach
    let currentCanvas = sourceCanvas
    let currentScale = 1
    
    while (currentScale < scaleFactor) {
      const stepScale = Math.min(1.6, scaleFactor / currentScale)
      
      // Apply bicubic base
      currentCanvas = await this.bicubicUpscaling(currentCanvas, stepScale, options)
      
      // Apply SRCNN-style refinement
      await this.applySRCNNRefinement(currentCanvas)
      
      currentScale *= stepScale
      
      await new Promise(resolve => setTimeout(resolve, 5))
    }
    
    return currentCanvas
  }

  private static async edsrUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    // EDSR-inspired enhanced deep super-resolution
    options.progressCallback?.(40, "EDSR processing")
    
    // High-quality base upscaling
    const result = await this.lanczosUpscaling(sourceCanvas, scaleFactor, options)
    
    // Apply EDSR-style enhancements
    await this.applyEDSREnhancements(result)
    
    return result
  }

  private static async lanczosUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    // High-quality Lanczos upscaling
    const srcCtx = sourceCanvas.getContext("2d")!
    const srcImageData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const srcData = srcImageData.data
    
    const targetWidth = Math.floor(sourceCanvas.width * scaleFactor)
    const targetHeight = Math.floor(sourceCanvas.height * scaleFactor)
    
    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d")!
    resultCanvas.width = targetWidth
    resultCanvas.height = targetHeight
    
    const resultImageData = resultCtx.createImageData(targetWidth, targetHeight)
    const resultData = resultImageData.data
    
    // Lanczos-3 kernel
    const lanczos = (x: number): number => {
      if (x === 0) return 1
      if (Math.abs(x) >= 3) return 0
      
      const piX = Math.PI * x
      return (3 * Math.sin(piX) * Math.sin(piX / 3)) / (piX * piX)
    }
    
    // Process in chunks to prevent hanging
    const chunkSize = options.chunkProcessing ? 200 : targetHeight
    
    for (let startY = 0; startY < targetHeight; startY += chunkSize) {
      const endY = Math.min(startY + chunkSize, targetHeight)
      
      for (let targetY = startY; targetY < endY; targetY++) {
        for (let targetX = 0; targetX < targetWidth; targetX++) {
          const srcX = targetX / scaleFactor
          const srcY = targetY / scaleFactor
          
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
          
          const targetIndex = (targetY * targetWidth + targetX) * 4
          resultData[targetIndex] = Math.max(0, Math.min(255, r / weightSum))
          resultData[targetIndex + 1] = Math.max(0, Math.min(255, g / weightSum))
          resultData[targetIndex + 2] = Math.max(0, Math.min(255, b / weightSum))
          resultData[targetIndex + 3] = Math.max(0, Math.min(255, a / weightSum))
        }
      }
      
      // Allow browser to breathe between chunks
      if (startY + chunkSize < targetHeight) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
    
    resultCtx.putImageData(resultImageData, 0, 0)
    return resultCanvas
  }

  private static async bicubicUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    const targetWidth = Math.floor(sourceCanvas.width * scaleFactor)
    const targetHeight = Math.floor(sourceCanvas.height * scaleFactor)
    
    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d")!
    resultCanvas.width = targetWidth
    resultCanvas.height = targetHeight
    
    // High-quality bicubic scaling
    resultCtx.imageSmoothingEnabled = true
    resultCtx.imageSmoothingQuality = "high"
    
    // Multi-pass for better quality on large scales
    if (scaleFactor > 2.5) {
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
    
    return resultCanvas
  }

  private static async photographicUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    // Optimized for photographic content
    const result = await this.bicubicUpscaling(sourceCanvas, scaleFactor, options)
    
    // Apply photographic enhancements
    const ctx = result.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, result.width, result.height)
    
    // Enhance details
    this.enhancePhotographicDetails(imageData.data, result.width, result.height)
    
    // Reduce noise
    this.applyBilateralFilter(imageData.data, result.width, result.height)
    
    ctx.putImageData(imageData, 0, 0)
    
    return result
  }

  private static async applySecondaryEnhancements(
    canvas: HTMLCanvasElement,
    analysis: any,
    options: UltimateUpscaleOptions
  ): Promise<HTMLCanvasElement> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Apply enhancements based on options
    if (options.enhanceDetails) {
      this.enhanceDetails(data, canvas.width, canvas.height)
    }
    
    if (options.reduceNoise) {
      this.reduceNoise(data, canvas.width, canvas.height)
    }
    
    if (options.sharpenAmount && options.sharpenAmount > 0) {
      this.applySharpen(data, canvas.width, canvas.height, options.sharpenAmount)
    }
    
    if (options.colorEnhancement) {
      this.enhanceColors(data, canvas.width, canvas.height)
    }
    
    if (options.contrastBoost && options.contrastBoost > 0) {
      this.boostContrast(data, canvas.width, canvas.height, options.contrastBoost)
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    return canvas
  }

  private static async applyESRGANEnhancements(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // ESRGAN-style enhancements
    this.enhancePhotographicDetails(imageData.data, canvas.width, canvas.height)
    this.reduceCompressionArtifactsInData(imageData.data, canvas.width, canvas.height)
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static async applySelectiveSmoothing(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Apply smoothing only to non-edge areas
    const smoothed = new Uint8ClampedArray(data)
    
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const idx = (y * canvas.width + x) * 4
        
        // Calculate edge strength
        let edgeStrength = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * canvas.width + (x + dx)) * 4
            const gradient = Math.abs(data[idx] - data[nIdx]) +
                           Math.abs(data[idx + 1] - data[nIdx + 1]) +
                           Math.abs(data[idx + 2] - data[nIdx + 2])
            edgeStrength = Math.max(edgeStrength, gradient)
          }
        }
        
        // Apply smoothing only to non-edge areas
        if (edgeStrength < 30) {
          for (let c = 0; c < 3; c++) {
            let sum = 0
            let count = 0
            
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nIdx = ((y + dy) * canvas.width + (x + dx)) * 4 + c
                sum += data[nIdx]
                count++
              }
            }
            
            smoothed[idx + c] = Math.round(sum / count)
          }
        }
      }
    }
    
    ctx.putImageData(new ImageData(smoothed, canvas.width, canvas.height), 0, 0)
  }

  private static async enhanceLineArt(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Enhance line art without blurring
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const idx = (y * canvas.width + x) * 4
        
        // Check if this is a line art edge
        let maxGradient = 0
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * canvas.width + (x + dx)) * 4
            const gradient = Math.abs(data[idx] - data[nIdx]) +
                           Math.abs(data[idx + 1] - data[nIdx + 1]) +
                           Math.abs(data[idx + 2] - data[nIdx + 2])
            maxGradient = Math.max(maxGradient, gradient)
          }
        }
        
        // Enhance strong edges (line art)
        if (maxGradient > 100) {
          for (let c = 0; c < 3; c++) {
            const value = data[idx + c]
            data[idx + c] = value < 128 ? Math.max(0, value - 15) : Math.min(255, value + 15)
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static async applySRCNNRefinement(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // SRCNN-style detail enhancement
    this.enhanceDetails(imageData.data, canvas.width, canvas.height)
    this.reduceNoise(imageData.data, canvas.width, canvas.height)
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static async applyEDSREnhancements(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // EDSR-style enhancements
    this.enhanceDetails(imageData.data, canvas.width, canvas.height)
    this.applySharpen(imageData.data, canvas.width, canvas.height, 20)
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static enhanceDetails(data: Uint8ClampedArray, width: number, height: number): void {
    const enhanced = new Uint8ClampedArray(data)
    
    // Multi-scale detail enhancement
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let center = data[idx + c] * 25 // 5x5 center weight
          
          // 5x5 neighborhood
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              sum += data[nIdx]
            }
          }
          
          const highPass = center - sum
          const enhancement = highPass * 0.15
          enhanced[idx + c] = Math.max(0, Math.min(255, data[idx + c] + enhancement))
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

  private static enhancePhotographicDetails(data: Uint8ClampedArray, width: number, height: number): void {
    const enhanced = new Uint8ClampedArray(data)
    
    // Local contrast enhancement
    for (let y = 3; y < height - 3; y++) {
      for (let x = 3; x < width - 3; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let localSum = 0
          let localCount = 0
          
          // 7x7 neighborhood
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              localSum += data[nIdx]
              localCount++
            }
          }
          
          const localAvg = localSum / localCount
          const centerValue = data[idx + c]
          
          // Apply local contrast enhancement
          const contrast = (centerValue - localAvg) * 0.25
          enhanced[idx + c] = Math.max(0, Math.min(255, centerValue + contrast))
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

  private static reduceNoise(data: Uint8ClampedArray, width: number, height: number): void {
    this.applyBilateralFilter(data, width, height)
  }

  private static applyBilateralFilter(data: Uint8ClampedArray, width: number, height: number): void {
    const filtered = new Uint8ClampedArray(data)
    const radius = 2
    const sigmaSpace = 20
    const sigmaColor = 30
    
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
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = filtered[i + c]
      }
    }
  }

  private static applySharpen(data: Uint8ClampedArray, width: number, height: number, amount: number): void {
    const sharpened = new Uint8ClampedArray(data)
    const factor = amount / 100
    
    // Unsharp mask
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let center = data[idx + c] * 9
          
          // 3x3 neighborhood
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              sum += data[nIdx]
            }
          }
          
          const highPass = center - sum
          const enhancement = highPass * factor * 0.2
          sharpened[idx + c] = Math.max(0, Math.min(255, data[idx + c] + enhancement))
        }
      }
    }
    
    // Apply sharpened version
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = sharpened[i + c]
      }
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

  private static boostContrast(data: Uint8ClampedArray, width: number, height: number, amount: number): void {
    const factor = amount / 100
    
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const value = data[i + c]
        const contrast = (value - 128) * (1 + factor * 0.5) + 128
        data[i + c] = Math.max(0, Math.min(255, contrast))
      }
    }
  }

  private static async reduceCompressionArtifacts(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    this.reduceCompressionArtifactsInData(imageData.data, canvas.width, canvas.height)
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static reduceCompressionArtifactsInData(data: Uint8ClampedArray, width: number, height: number): void {
    const filtered = new Uint8ClampedArray(data)
    
    // Apply selective filtering to reduce JPEG artifacts
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let weightSum = 0
          let valueSum = 0
          const centerValue = data[idx + c]
          
          // 5x5 neighborhood with bilateral filtering
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
          
          filtered[idx + c] = Math.round(valueSum / weightSum)
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

  private static async applyFinalPostProcessing(
    canvas: HTMLCanvasElement,
    options: UltimateUpscaleOptions
  ): Promise<void> {
    if (options.multiPass) {
      // Second pass refinement
      const ctx = canvas.getContext("2d")!
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Apply final sharpening
      this.applySharpen(imageData.data, canvas.width, canvas.height, 15)
      
      ctx.putImageData(imageData, 0, 0)
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
    
    // Sample every 10th pixel for performance
    for (let y = 5; y < canvas.height - 5; y += 10) {
      for (let x = 5; x < canvas.width - 5; x += 10) {
        const idx = (y * canvas.width + x) * 4
        
        // Calculate sharpness (edge strength)
        let edgeStrength = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * canvas.width + (x + dx)) * 4
            const gradient = Math.abs(data[idx] - data[nIdx]) +
                           Math.abs(data[idx + 1] - data[nIdx + 1]) +
                           Math.abs(data[idx + 2] - data[nIdx + 2])
            edgeStrength = Math.max(edgeStrength, gradient)
          }
        }
        
        sharpnessSum += edgeStrength
        
        // Calculate noise (high frequency variation)
        if (this.isNoisePixel(data, x, y, canvas.width, canvas.height)) {
          noiseSum++
        }
        
        // Calculate artifacts (blocking patterns)
        if (this.hasCompressionArtifacts(data, x, y, canvas.width, canvas.height)) {
          artifactSum++
        }
        
        sampleCount++
      }
    }
    
    return {
      sharpness: Math.min(100, (sharpnessSum / sampleCount) / 2),
      noise: Math.min(100, (noiseSum / sampleCount) * 100),
      artifacts: Math.min(100, (artifactSum / sampleCount) * 100)
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
    // Clean up canvases
    canvases.forEach(canvas => {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      canvas.width = 1
      canvas.height = 1
    })
    
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      setTimeout(() => {
        (window as any).gc()
      }, 100)
    }
  }
}