// Advanced image processing with automatic upscaling and crash prevention
export interface AdvancedImageOptions {
  scaleFactor?: number
  algorithm?: "auto" | "lanczos" | "bicubic" | "super-resolution"
  enhanceDetails?: boolean
  reduceNoise?: boolean
  sharpen?: number
  tileSize?: number
  maxDimensions?: { width: number; height: number }
  useWebWorker?: boolean
  memoryOptimized?: boolean
  progressCallback?: (progress: number) => void
  autoOptimize?: boolean
  quality?: number
}

export class AdvancedImageProcessor {
  private static readonly MAX_SAFE_PIXELS = 1024 * 1024 // 1MP for stability
  private static readonly MAX_CANVAS_SIZE = 2048 // Max canvas dimension
  
  static async upscaleImageAdvanced(file: File, options: AdvancedImageOptions = {}): Promise<Blob> {
    // Auto-optimize settings based on file size and device
    const autoOptions = this.getAutoOptimizedSettings(file, options)
    const finalOptions = { ...options, ...autoOptions }
    
    // Strict file size limits for stability
    if (file.size > 8 * 1024 * 1024) { // 8MB limit
      throw new Error("Image too large. Please use an image smaller than 8MB for upscaling.")
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
      img.onload = async () => {
        try {
          finalOptions.progressCallback?.(10)
          
          // Calculate optimal working dimensions
          const { workingWidth, workingHeight, needsPreScale } = this.calculateOptimalDimensions(
            img.naturalWidth, 
            img.naturalHeight,
            finalOptions.scaleFactor || 2,
            finalOptions.maxDimensions
          )
          
          finalOptions.progressCallback?.(20)
          
          let sourceCanvas = canvas
          let sourceCtx = ctx
          
          // Pre-scale if needed for memory safety
          if (needsPreScale) {
            const preScaleCanvas = document.createElement("canvas")
            const preScaleCtx = preScaleCanvas.getContext("2d")!
            
            preScaleCanvas.width = workingWidth
            preScaleCanvas.height = workingHeight
            
            preScaleCtx.imageSmoothingEnabled = true
            preScaleCtx.imageSmoothingQuality = "high"
            preScaleCtx.drawImage(img, 0, 0, workingWidth, workingHeight)
            
            sourceCanvas = preScaleCanvas
            sourceCtx = preScaleCtx
          } else {
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = "high"
            ctx.drawImage(img, 0, 0)
          }
          
          finalOptions.progressCallback?.(40)
          
          // Apply automatic upscaling with the best algorithm
          const upscaledCanvas = await this.applyAutoUpscaling(sourceCanvas, finalOptions)
          
          finalOptions.progressCallback?.(80)
          
          // Apply automatic post-processing
          if (finalOptions.autoOptimize !== false) {
            await this.applyAutoPostProcessing(upscaledCanvas, finalOptions)
          }
          
          finalOptions.progressCallback?.(100)
          
          upscaledCanvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error("Failed to create blob"))
              }
            },
            "image/png",
            (finalOptions.quality || 95) / 100
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

  private static getAutoOptimizedSettings(file: File, options: AdvancedImageOptions): Partial<AdvancedImageOptions> {
    const autoSettings: Partial<AdvancedImageOptions> = {}
    
    // Auto-select algorithm based on file size and type
    if (!options.algorithm || options.algorithm === "auto") {
      if (file.size < 2 * 1024 * 1024) { // < 2MB
        autoSettings.algorithm = "super-resolution"
      } else if (file.size < 5 * 1024 * 1024) { // < 5MB
        autoSettings.algorithm = "lanczos"
      } else {
        autoSettings.algorithm = "bicubic"
      }
    }
    
    // Auto-adjust scale factor based on file size
    if (!options.scaleFactor) {
      if (file.size > 5 * 1024 * 1024) {
        autoSettings.scaleFactor = 1.5 // Conservative for large files
      } else {
        autoSettings.scaleFactor = 2
      }
    }
    
    // Auto-enable features based on image characteristics
    autoSettings.enhanceDetails = true
    autoSettings.reduceNoise = file.size > 3 * 1024 * 1024 // Enable for larger files
    autoSettings.sharpen = 30 // Moderate sharpening
    autoSettings.memoryOptimized = true
    autoSettings.autoOptimize = true
    
    // Set safe max dimensions
    autoSettings.maxDimensions = {
      width: Math.min(options.maxDimensions?.width || 2048, 2048),
      height: Math.min(options.maxDimensions?.height || 2048, 2048)
    }
    
    return autoSettings
  }

  private static calculateOptimalDimensions(
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
    
    return { workingWidth, workingHeight, needsPreScale }
  }

  private static async applyAutoUpscaling(
    sourceCanvas: HTMLCanvasElement,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    const algorithm = options.algorithm || "lanczos"
    const scaleFactor = Math.min(options.scaleFactor || 2, 3) // Limit to 3x
    
    switch (algorithm) {
      case "super-resolution":
        return this.superResolutionUpscale(sourceCanvas, scaleFactor, options)
      case "lanczos":
        return this.lanczosUpscale(sourceCanvas, scaleFactor)
      case "bicubic":
        return this.bicubicUpscale(sourceCanvas, scaleFactor)
      default:
        return this.smartUpscale(sourceCanvas, scaleFactor, options)
    }
  }

  private static async smartUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    // Analyze image to choose best upscaling method
    const ctx = sourceCanvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const analysis = this.analyzeImageForUpscaling(imageData)
    
    if (analysis.hasSharpEdges && analysis.textContent > 0.1) {
      // Use Lanczos for sharp content
      return this.lanczosUpscale(sourceCanvas, scaleFactor)
    } else if (analysis.hasPhotographicContent) {
      // Use super-resolution for photos
      return this.superResolutionUpscale(sourceCanvas, scaleFactor, options)
    } else {
      // Use bicubic for general content
      return this.bicubicUpscale(sourceCanvas, scaleFactor)
    }
  }

  private static analyzeImageForUpscaling(imageData: ImageData): {
    hasSharpEdges: boolean
    textContent: number
    hasPhotographicContent: boolean
    noiseLevel: number
  } {
    const { data, width, height } = imageData
    let edgeCount = 0
    let highFrequencyCount = 0
    let colorVariation = 0
    let totalPixels = 0
    
    // Sample every 4th pixel for performance
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = (y * width + x) * 4
        totalPixels++
        
        // Edge detection
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
        if (maxGradient > 100) highFrequencyCount++
        
        // Color variation
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const variation = Math.max(r, g, b) - Math.min(r, g, b)
        colorVariation += variation
      }
    }
    
    return {
      hasSharpEdges: edgeCount / totalPixels > 0.15,
      textContent: highFrequencyCount / totalPixels,
      hasPhotographicContent: colorVariation / totalPixels > 30,
      noiseLevel: highFrequencyCount / totalPixels
    }
  }

  private static async lanczosUpscale(
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
    
    // Optimized Lanczos-3 kernel
    const lanczos = (x: number): number => {
      if (x === 0) return 1
      if (Math.abs(x) >= 3) return 0
      
      const piX = Math.PI * x
      return (3 * Math.sin(piX) * Math.sin(piX / 3)) / (piX * piX)
    }
    
    // Process in chunks to prevent browser freezing
    const chunkSize = 1000
    
    for (let startY = 0; startY < targetHeight; startY += chunkSize) {
      const endY = Math.min(startY + chunkSize, targetHeight)
      
      for (let targetY = startY; targetY < endY; targetY++) {
        for (let targetX = 0; targetX < targetWidth; targetX++) {
          const srcX = targetX / scaleFactor
          const srcY = targetY / scaleFactor
          
          let r = 0, g = 0, b = 0, a = 0, weightSum = 0
          
          // Sample 6x6 neighborhood
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
      
      // Allow browser to breathe
      await new Promise(resolve => setTimeout(resolve, 1))
    }
    
    resultCtx.putImageData(resultImageData, 0, 0)
    return resultCanvas
  }

  private static async bicubicUpscale(
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
    
    // Use browser's built-in high-quality scaling as base
    resultCtx.imageSmoothingEnabled = true
    resultCtx.imageSmoothingQuality = "high"
    resultCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
    
    // Apply additional sharpening for better results
    const imageData = resultCtx.getImageData(0, 0, targetWidth, targetHeight)
    this.applyUnsharpMask(imageData.data, targetWidth, targetHeight, 0.5, 1.5)
    resultCtx.putImageData(imageData, 0, 0)
    
    return resultCanvas
  }

  private static async superResolutionUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    // Multi-pass upscaling with enhancement
    let currentCanvas = sourceCanvas
    let currentScale = 1
    const targetScale = Math.min(scaleFactor, 2.5) // Limit for quality
    
    while (currentScale < targetScale) {
      const stepScale = Math.min(1.5, targetScale / currentScale)
      
      // Apply Lanczos upscaling
      currentCanvas = await this.lanczosUpscale(currentCanvas, stepScale)
      currentScale *= stepScale
      
      // Apply enhancement between passes
      const ctx = currentCanvas.getContext("2d")!
      const imageData = ctx.getImageData(0, 0, currentCanvas.width, currentCanvas.height)
      
      // Apply detail enhancement
      this.applyDetailEnhancement(imageData.data, currentCanvas.width, currentCanvas.height)
      
      // Apply noise reduction if enabled
      if (options.reduceNoise) {
        this.applyBilateralFilter(imageData.data, currentCanvas.width, currentCanvas.height)
      }
      
      ctx.putImageData(imageData, 0, 0)
      
      // Allow browser to breathe
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    return currentCanvas
  }

  private static async applyAutoPostProcessing(
    canvas: HTMLCanvasElement,
    options: AdvancedImageOptions
  ): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Auto-enhance details
    if (options.enhanceDetails !== false) {
      this.applyDetailEnhancement(data, canvas.width, canvas.height)
    }
    
    // Auto-apply noise reduction
    if (options.reduceNoise !== false) {
      this.applyBilateralFilter(data, canvas.width, canvas.height)
    }
    
    // Auto-apply sharpening
    const sharpenAmount = options.sharpen || 25
    if (sharpenAmount > 0) {
      this.applyUnsharpMask(data, canvas.width, canvas.height, sharpenAmount / 100, 1.2)
    }
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static applyDetailEnhancement(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const enhanced = new Uint8ClampedArray(data)
    
    // High-pass filter for detail enhancement
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let center = data[centerIdx + c] * 9
          
          // 3x3 neighborhood
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              sum += data[nIdx]
            }
          }
          
          const highPass = center - sum
          enhanced[centerIdx + c] = Math.max(0, Math.min(255, data[centerIdx + c] + highPass * 0.2))
        }
      }
    }
    
    // Blend with original
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(data[i + c] * 0.7 + enhanced[i + c] * 0.3)
      }
    }
  }

  private static applyBilateralFilter(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const filtered = new Uint8ClampedArray(data)
    const radius = 3
    const sigmaSpace = 50
    const sigmaColor = 50
    
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

  private static applyUnsharpMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    amount: number,
    threshold: number
  ): void {
    const blurred = new Uint8ClampedArray(data)
    
    // Apply Gaussian blur
    this.gaussianBlur(blurred, width, height, 1.0)
    
    // Apply unsharp mask
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
}