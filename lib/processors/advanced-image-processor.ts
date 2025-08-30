// Advanced image processing with improved upscaling algorithms
export interface AdvancedImageOptions {
  scaleFactor?: number
  algorithm?: "lanczos" | "bicubic" | "esrgan-like" | "super-resolution"
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
  private static readonly MAX_SAFE_PIXELS = 1536 * 1536 // Reduced for stability
  
  static async upscaleImageAdvanced(file: File, options: AdvancedImageOptions = {}): Promise<Blob> {
    const scaleFactor = Math.min(options.scaleFactor || 2, 3) // Limit to 3x for stability
    const maxDimensions = options.maxDimensions || { width: 1536, height: 1536 }
    
    // Strict file size limits
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error("Image too large. Please use an image smaller than 10MB.")
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
          options.progressCallback?.(10)
          
          // Calculate safe working dimensions
          let workingWidth = img.naturalWidth
          let workingHeight = img.naturalHeight
          
          // Ensure we don't exceed memory limits
          if (workingWidth * workingHeight > this.MAX_SAFE_PIXELS) {
            const scale = Math.sqrt(this.MAX_SAFE_PIXELS / (workingWidth * workingHeight))
            workingWidth = Math.floor(workingWidth * scale)
            workingHeight = Math.floor(workingHeight * scale)
          }
          
          // Check against max dimensions
          if (workingWidth > maxDimensions.width || workingHeight > maxDimensions.height) {
            const scale = Math.min(
              maxDimensions.width / workingWidth,
              maxDimensions.height / workingHeight
            )
            workingWidth = Math.floor(workingWidth * scale)
            workingHeight = Math.floor(workingHeight * scale)
          }
          
          // Create working canvas
          const workingCanvas = document.createElement("canvas")
          const workingCtx = workingCanvas.getContext("2d", { alpha: true })!
          workingCanvas.width = workingWidth
          workingCanvas.height = workingHeight
          
          // Draw at working resolution
          workingCtx.imageSmoothingEnabled = true
          workingCtx.imageSmoothingQuality = "high"
          workingCtx.drawImage(img, 0, 0, workingWidth, workingHeight)
          
          options.progressCallback?.(30)
          
          // Apply upscaling algorithm
          const upscaledCanvas = await this.applyUpscalingAlgorithm(
            workingCanvas, 
            scaleFactor, 
            options
          )
          
          options.progressCallback?.(80)
          
          // Final canvas setup
          canvas.width = upscaledCanvas.width
          canvas.height = upscaledCanvas.height
          ctx.drawImage(upscaledCanvas, 0, 0)
          
          // Apply post-processing
          if (options.enhanceDetails || options.sharpen) {
            await this.applyPostProcessing(ctx, canvas, options)
          }
          
          options.progressCallback?.(100)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error("Failed to create blob"))
              }
            },
            "image/png",
            (options.quality || 95) / 100
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

  private static async applyUpscalingAlgorithm(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    const algorithm = options.algorithm || "bicubic"
    
    switch (algorithm) {
      case "lanczos":
        return this.lanczosUpscale(sourceCanvas, scaleFactor)
      case "esrgan-like":
        return this.esrganLikeUpscale(sourceCanvas, scaleFactor, options)
      case "super-resolution":
        return this.superResolutionUpscale(sourceCanvas, scaleFactor, options)
      default: // bicubic
        return this.bicubicUpscale(sourceCanvas, scaleFactor)
    }
  }

  private static async bicubicUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number
  ): Promise<HTMLCanvasElement> {
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
    
    // Bicubic interpolation
    const cubic = (t: number): number => {
      const a = -0.5
      const absT = Math.abs(t)
      
      if (absT <= 1) {
        return (a + 2) * absT * absT * absT - (a + 3) * absT * absT + 1
      } else if (absT <= 2) {
        return a * absT * absT * absT - 5 * a * absT * absT + 8 * a * absT - 4 * a
      }
      return 0
    }
    
    for (let targetY = 0; targetY < targetHeight; targetY++) {
      for (let targetX = 0; targetX < targetWidth; targetX++) {
        const srcX = targetX / scaleFactor
        const srcY = targetY / scaleFactor
        
        let r = 0, g = 0, b = 0, a = 0
        
        // Sample 4x4 neighborhood
        for (let dy = -1; dy <= 2; dy++) {
          for (let dx = -1; dx <= 2; dx++) {
            const sampleX = Math.floor(srcX) + dx
            const sampleY = Math.floor(srcY) + dy
            
            if (sampleX >= 0 && sampleX < sourceCanvas.width && 
                sampleY >= 0 && sampleY < sourceCanvas.height) {
              
              const weightX = cubic(srcX - sampleX)
              const weightY = cubic(srcY - sampleY)
              const weight = weightX * weightY
              
              const srcIndex = (sampleY * sourceCanvas.width + sampleX) * 4
              
              r += srcData[srcIndex] * weight
              g += srcData[srcIndex + 1] * weight
              b += srcData[srcIndex + 2] * weight
              a += srcData[srcIndex + 3] * weight
            }
          }
        }
        
        const targetIndex = (targetY * targetWidth + targetX) * 4
        resultData[targetIndex] = Math.max(0, Math.min(255, r))
        resultData[targetIndex + 1] = Math.max(0, Math.min(255, g))
        resultData[targetIndex + 2] = Math.max(0, Math.min(255, b))
        resultData[targetIndex + 3] = Math.max(0, Math.min(255, a))
      }
    }
    
    resultCtx.putImageData(resultImageData, 0, 0)
    return resultCanvas
  }

  private static async lanczosUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number
  ): Promise<HTMLCanvasElement> {
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
    
    for (let targetY = 0; targetY < targetHeight; targetY++) {
      for (let targetX = 0; targetX < targetWidth; targetX++) {
        const srcX = targetX / scaleFactor
        const srcY = targetY / scaleFactor
        
        let r = 0, g = 0, b = 0, a = 0, weightSum = 0
        
        // Sample 6x6 neighborhood for Lanczos-3
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
    
    resultCtx.putImageData(resultImageData, 0, 0)
    return resultCanvas
  }

  private static async esrganLikeUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    // Start with high-quality bicubic upscaling
    const bicubicResult = await this.bicubicUpscale(sourceCanvas, scaleFactor)
    
    // Apply ESRGAN-like enhancement
    const ctx = bicubicResult.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, bicubicResult.width, bicubicResult.height)
    const data = imageData.data
    
    // Apply detail enhancement
    if (options.enhanceDetails !== false) {
      this.applyDetailEnhancement(data, bicubicResult.width, bicubicResult.height)
    }
    
    // Apply noise reduction
    if (options.reduceNoise) {
      this.applyNoiseReduction(data, bicubicResult.width, bicubicResult.height)
    }
    
    ctx.putImageData(imageData, 0, 0)
    return bicubicResult
  }

  private static async superResolutionUpscale(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    // Multi-pass upscaling for better quality
    let currentCanvas = sourceCanvas
    let currentScale = 1
    
    while (currentScale < scaleFactor) {
      const stepScale = Math.min(2, scaleFactor / currentScale)
      currentCanvas = await this.lanczosUpscale(currentCanvas, stepScale)
      currentScale *= stepScale
      
      // Apply enhancement between passes
      const ctx = currentCanvas.getContext("2d")!
      const imageData = ctx.getImageData(0, 0, currentCanvas.width, currentCanvas.height)
      this.applyDetailEnhancement(imageData.data, currentCanvas.width, currentCanvas.height)
      ctx.putImageData(imageData, 0, 0)
    }
    
    return currentCanvas
  }

  private static applyDetailEnhancement(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const enhanced = new Uint8ClampedArray(data)
    
    // Unsharp mask for detail enhancement
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const sampleIdx = ((y + ky) * width + (x + kx)) * 4 + c
              sum += data[sampleIdx] * kernel[(ky + 1) * 3 + (kx + 1)]
            }
          }
          
          enhanced[centerIdx + c] = Math.max(0, Math.min(255, sum))
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

  private static applyNoiseReduction(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const filtered = new Uint8ClampedArray(data)
    
    // Simple bilateral filter
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let weightSum = 0
          let valueSum = 0
          const centerValue = data[centerIdx + c]
          
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const sampleIdx = ((y + dy) * width + (x + dx)) * 4 + c
              const sampleValue = data[sampleIdx]
              
              const spatialWeight = Math.exp(-(dx * dx + dy * dy) / 8)
              const intensityWeight = Math.exp(-Math.pow(centerValue - sampleValue, 2) / 1000)
              const weight = spatialWeight * intensityWeight
              
              weightSum += weight
              valueSum += sampleValue * weight
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

  private static async applyPostProcessing(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    options: AdvancedImageOptions
  ): Promise<void> {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Apply sharpening if requested
    if (options.sharpen && options.sharpen > 0) {
      this.applySharpening(imageData.data, canvas.width, canvas.height, options.sharpen / 100)
    }
    
    // Apply final enhancement
    if (options.enhanceDetails) {
      this.applyDetailEnhancement(imageData.data, canvas.width, canvas.height)
    }
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static applySharpening(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    amount: number
  ): void {
    const sharpened = new Uint8ClampedArray(data)
    
    // Sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const sampleIdx = ((y + ky) * width + (x + kx)) * 4 + c
              sum += data[sampleIdx] * kernel[(ky + 1) * 3 + (kx + 1)]
            }
          }
          
          const original = data[centerIdx + c]
          sharpened[centerIdx + c] = Math.max(0, Math.min(255, 
            original * (1 - amount) + sum * amount
          ))
        }
      }
    }
    
    // Copy sharpened data back
    for (let i = 0; i < data.length; i++) {
      data[i] = sharpened[i]
    }
  }
}