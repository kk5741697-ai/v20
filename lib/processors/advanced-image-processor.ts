// Advanced image processing with Real-ESRGAN-like upscaling and U²Net-like background removal
export interface AdvancedImageOptions {
  // Upscaling options
  scaleFactor?: number
  algorithm?: "lanczos" | "bicubic" | "esrgan-like" | "super-resolution"
  enhanceDetails?: boolean
  reduceNoise?: boolean
  sharpen?: number
  tileSize?: number
  
  // Background removal options
  sensitivity?: number
  featherEdges?: boolean
  preserveDetails?: boolean
  smoothing?: number
  algorithm?: "u2net-like" | "modnet-like" | "edge-detection" | "hybrid"
  
  // Performance options
  maxDimensions?: { width: number; height: number }
  useWebWorker?: boolean
  memoryOptimized?: boolean
  progressCallback?: (progress: number) => void
}

export class AdvancedImageProcessor {
  private static webWorker: Worker | null = null
  
  // Advanced upscaling with Real-ESRGAN-like algorithm
  static async upscaleImageAdvanced(file: File, options: AdvancedImageOptions = {}): Promise<Blob> {
    const scaleFactor = Math.min(options.scaleFactor || 2, 4) // Limit to 4x for performance
    const tileSize = options.tileSize || 512
    const maxDimensions = options.maxDimensions || { width: 4096, height: 4096 }
    
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
          
          // Memory optimization for large images
          let workingWidth = img.naturalWidth
          let workingHeight = img.naturalHeight
          let needsUpscaling = false
          
          // Check if image needs downscaling for processing
          if (workingWidth > maxDimensions.width || workingHeight > maxDimensions.height) {
            const scale = Math.min(
              maxDimensions.width / workingWidth,
              maxDimensions.height / workingHeight
            )
            workingWidth = Math.floor(workingWidth * scale)
            workingHeight = Math.floor(workingHeight * scale)
            needsUpscaling = true
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
          
          // Apply advanced upscaling algorithm
          const upscaledCanvas = await this.applyAdvancedUpscaling(
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
          await this.applyPostProcessing(ctx, canvas, options)
          
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
            0.98
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

  // Real-ESRGAN-like upscaling algorithm
  private static async applyAdvancedUpscaling(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    const { width: srcWidth, height: srcHeight } = sourceCanvas
    const targetWidth = Math.floor(srcWidth * scaleFactor)
    const targetHeight = Math.floor(srcHeight * scaleFactor)
    
    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d", { alpha: true })!
    resultCanvas.width = targetWidth
    resultCanvas.height = targetHeight
    
    const tileSize = options.tileSize || 256
    const overlap = 32 // Overlap to prevent seams
    
    // Process in tiles to prevent memory issues
    for (let y = 0; y < srcHeight; y += tileSize - overlap) {
      for (let x = 0; x < srcWidth; x += tileSize - overlap) {
        const tileWidth = Math.min(tileSize, srcWidth - x)
        const tileHeight = Math.min(tileSize, srcHeight - y)
        
        // Extract tile
        const tileCanvas = document.createElement("canvas")
        const tileCtx = tileCanvas.getContext("2d")!
        tileCanvas.width = tileWidth
        tileCanvas.height = tileHeight
        
        tileCtx.drawImage(
          sourceCanvas,
          x, y, tileWidth, tileHeight,
          0, 0, tileWidth, tileHeight
        )
        
        // Apply advanced upscaling to tile
        const upscaledTile = await this.upscaleTileWithESRGAN(tileCanvas, scaleFactor, options)
        
        // Place upscaled tile in result
        const targetX = Math.floor(x * scaleFactor)
        const targetY = Math.floor(y * scaleFactor)
        
        resultCtx.drawImage(upscaledTile, targetX, targetY)
        
        // Update progress
        const progress = 30 + ((y * srcWidth + x) / (srcWidth * srcHeight)) * 50
        options.progressCallback?.(progress)
      }
    }
    
    return resultCanvas
  }

  // ESRGAN-like tile upscaling with advanced interpolation
  private static async upscaleTileWithESRGAN(
    tileCanvas: HTMLCanvasElement,
    scaleFactor: number,
    options: AdvancedImageOptions
  ): Promise<HTMLCanvasElement> {
    const srcCtx = tileCanvas.getContext("2d")!
    const srcImageData = srcCtx.getImageData(0, 0, tileCanvas.width, tileCanvas.height)
    
    const targetWidth = Math.floor(tileCanvas.width * scaleFactor)
    const targetHeight = Math.floor(tileCanvas.height * scaleFactor)
    
    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d")!
    resultCanvas.width = targetWidth
    resultCanvas.height = targetHeight
    
    // Apply multi-stage upscaling for better quality
    if (scaleFactor > 2) {
      // Multi-pass upscaling
      const intermediateCanvas = await this.lanczosUpscale(tileCanvas, 2)
      const finalCanvas = await this.lanczosUpscale(intermediateCanvas, scaleFactor / 2)
      
      // Apply ESRGAN-like enhancement
      await this.applyESRGANEnhancement(finalCanvas, options)
      
      resultCtx.drawImage(finalCanvas, 0, 0)
    } else {
      // Single pass with Lanczos
      const upscaledCanvas = await this.lanczosUpscale(tileCanvas, scaleFactor)
      await this.applyESRGANEnhancement(upscaledCanvas, options)
      resultCtx.drawImage(upscaledCanvas, 0, 0)
    }
    
    return resultCanvas
  }

  // High-quality Lanczos upscaling
  private static async lanczosUpscale(
    sourceCanvas: HTMLCanvasElement,
    scale: number
  ): Promise<HTMLCanvasElement> {
    const srcCtx = sourceCanvas.getContext("2d")!
    const srcImageData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const srcData = srcImageData.data
    
    const targetWidth = Math.floor(sourceCanvas.width * scale)
    const targetHeight = Math.floor(sourceCanvas.height * scale)
    
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
    
    // Process each pixel in the target image
    for (let targetY = 0; targetY < targetHeight; targetY++) {
      for (let targetX = 0; targetX < targetWidth; targetX++) {
        const srcX = targetX / scale
        const srcY = targetY / scale
        
        let r = 0, g = 0, b = 0, a = 0, weightSum = 0
        
        // Sample surrounding pixels with Lanczos kernel
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
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

  // ESRGAN-like enhancement with residual learning
  private static async applyESRGANEnhancement(
    canvas: HTMLCanvasElement,
    options: AdvancedImageOptions
  ): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const { width, height } = canvas
    
    // Apply residual enhancement (simulating ESRGAN's residual blocks)
    const enhanced = new Uint8ClampedArray(data)
    
    // Multi-scale feature extraction
    for (let scale = 1; scale <= 3; scale++) {
      const kernelSize = scale * 2 + 1
      const sigma = scale * 0.8
      
      // Apply Gaussian-like convolution at different scales
      for (let y = kernelSize; y < height - kernelSize; y++) {
        for (let x = kernelSize; x < width - kernelSize; x++) {
          const centerIdx = (y * width + x) * 4
          
          for (let c = 0; c < 3; c++) {
            let sum = 0
            let weightSum = 0
            
            for (let dy = -kernelSize; dy <= kernelSize; dy++) {
              for (let dx = -kernelSize; dx <= kernelSize; dx++) {
                const sampleIdx = ((y + dy) * width + (x + dx)) * 4 + c
                const distance = Math.sqrt(dx * dx + dy * dy)
                const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma))
                
                sum += data[sampleIdx] * weight
                weightSum += weight
              }
            }
            
            const smoothed = sum / weightSum
            const original = data[centerIdx + c]
            
            // Residual learning: enhance high-frequency details
            const residual = original - smoothed
            enhanced[centerIdx + c] = Math.max(0, Math.min(255, 
              original + residual * (0.3 + scale * 0.1)
            ))
          }
        }
      }
    }
    
    // Apply detail enhancement
    if (options.enhanceDetails !== false) {
      this.applyDetailEnhancement(enhanced, width, height)
    }
    
    // Apply noise reduction
    if (options.reduceNoise) {
      this.applyAdvancedNoiseReduction(enhanced, width, height)
    }
    
    // Apply sharpening
    if (options.sharpen && options.sharpen > 0) {
      this.applyUnsharpMask(enhanced, width, height, options.sharpen / 100)
    }
    
    ctx.putImageData(new ImageData(enhanced, width, height), 0, 0)
  }

  // Detail enhancement using high-pass filtering
  private static applyDetailEnhancement(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const enhanced = new Uint8ClampedArray(data)
    
    // High-pass filter for detail enhancement
    const kernel = [
      -1, -1, -1,
      -1,  9, -1,
      -1, -1, -1
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
          const highPass = sum / 9
          
          // Blend original with high-pass filtered result
          enhanced[centerIdx + c] = Math.max(0, Math.min(255,
            original * 0.7 + highPass * 0.3
          ))
        }
      }
    }
    
    // Copy enhanced data back
    for (let i = 0; i < data.length; i++) {
      data[i] = enhanced[i]
    }
  }

  // Advanced noise reduction using bilateral filtering
  private static applyAdvancedNoiseReduction(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const filtered = new Uint8ClampedArray(data)
    const spatialSigma = 2
    const intensitySigma = 25
    const kernelRadius = 3
    
    for (let y = kernelRadius; y < height - kernelRadius; y++) {
      for (let x = kernelRadius; x < width - kernelRadius; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let weightSum = 0
          let valueSum = 0
          const centerValue = data[centerIdx + c]
          
          for (let dy = -kernelRadius; dy <= kernelRadius; dy++) {
            for (let dx = -kernelRadius; dx <= kernelRadius; dx++) {
              const sampleIdx = ((y + dy) * width + (x + dx)) * 4 + c
              const sampleValue = data[sampleIdx]
              
              const spatialWeight = Math.exp(-(dx * dx + dy * dy) / (2 * spatialSigma * spatialSigma))
              const intensityWeight = Math.exp(-Math.pow(centerValue - sampleValue, 2) / (2 * intensitySigma * intensitySigma))
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

  // Unsharp mask for final sharpening
  private static applyUnsharpMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    amount: number
  ): void {
    const blurred = new Uint8ClampedArray(data)
    
    // Apply Gaussian blur
    const sigma = 1.0
    const kernelRadius = Math.ceil(sigma * 3)
    
    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let weightSum = 0
          
          for (let dx = -kernelRadius; dx <= kernelRadius; dx++) {
            const sampleX = Math.max(0, Math.min(width - 1, x + dx))
            const sampleIdx = (y * width + sampleX) * 4 + c
            const weight = Math.exp(-(dx * dx) / (2 * sigma * sigma))
            
            sum += data[sampleIdx] * weight
            weightSum += weight
          }
          
          blurred[centerIdx + c] = sum / weightSum
        }
      }
    }
    
    // Vertical pass
    const temp = new Uint8ClampedArray(blurred)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIdx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let weightSum = 0
          
          for (let dy = -kernelRadius; dy <= kernelRadius; dy++) {
            const sampleY = Math.max(0, Math.min(height - 1, y + dy))
            const sampleIdx = (sampleY * width + x) * 4 + c
            const weight = Math.exp(-(dy * dy) / (2 * sigma * sigma))
            
            sum += temp[sampleIdx] * weight
            weightSum += weight
          }
          
          blurred[centerIdx + c] = sum / weightSum
        }
      }
    }
    
    // Apply unsharp mask
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const original = data[i + c]
        const blur = blurred[i + c]
        const mask = original - blur
        
        data[i + c] = Math.max(0, Math.min(255, original + mask * amount))
      }
    }
  }

  // Advanced background removal with U²Net-like algorithm
  static async removeBackgroundAdvanced(file: File, options: AdvancedImageOptions = {}): Promise<Blob> {
    // Check file size and implement memory protection
    const maxSafeSize = 15 * 1024 * 1024 // 15MB limit
    const shouldOptimize = file.size > maxSafeSize
    
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { 
        alpha: true,
        willReadFrequently: true,
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
          
          let workingWidth = img.naturalWidth
          let workingHeight = img.naturalHeight
          let scaledForProcessing = false
          
          // Memory optimization for large images
          if (shouldOptimize) {
            const maxDimension = 1536 // Reduced for stability
            if (workingWidth > maxDimension || workingHeight > maxDimension) {
              const scale = maxDimension / Math.max(workingWidth, workingHeight)
              workingWidth = Math.floor(workingWidth * scale)
              workingHeight = Math.floor(workingHeight * scale)
              scaledForProcessing = true
            }
          }
          
          // Create working canvas
          const workingCanvas = document.createElement("canvas")
          const workingCtx = workingCanvas.getContext("2d", { alpha: true })!
          workingCanvas.width = workingWidth
          workingCanvas.height = workingHeight
          
          workingCtx.imageSmoothingEnabled = true
          workingCtx.imageSmoothingQuality = "high"
          workingCtx.drawImage(img, 0, 0, workingWidth, workingHeight)
          
          options.progressCallback?.(30)
          
          // Apply U²Net-like background removal
          await this.applyU2NetLikeRemoval(workingCanvas, options)
          
          options.progressCallback?.(80)
          
          // Scale back up if we downscaled for processing
          if (scaledForProcessing) {
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = "high"
            ctx.drawImage(workingCanvas, 0, 0, img.naturalWidth, img.naturalHeight)
          } else {
            canvas.width = workingWidth
            canvas.height = workingHeight
            ctx.drawImage(workingCanvas, 0, 0)
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
            0.98
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

  // U²Net-like background removal algorithm
  private static async applyU2NetLikeRemoval(
    canvas: HTMLCanvasElement,
    options: AdvancedImageOptions
  ): Promise<void> {
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const { width, height } = canvas
    
    options.progressCallback?.(40)
    
    // Stage 1: Multi-scale edge detection (simulating U²Net's encoder)
    const edgeMaps = await this.computeMultiScaleEdges(data, width, height)
    
    options.progressCallback?.(50)
    
    // Stage 2: Semantic segmentation (simulating U²Net's decoder)
    const segmentationMask = await this.computeSemanticSegmentation(data, width, height, edgeMaps)
    
    options.progressCallback?.(60)
    
    // Stage 3: Refinement with attention mechanism
    const refinedMask = await this.refineSegmentationMask(data, width, height, segmentationMask, options)
    
    options.progressCallback?.(70)
    
    // Stage 4: Apply mask with advanced blending
    this.applyAdvancedMask(data, width, height, refinedMask, options)
    
    ctx.putImageData(imageData, 0, 0)
  }

  // Multi-scale edge detection (simulating U²Net encoder)
  private static async computeMultiScaleEdges(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<Uint8Array[]> {
    const edgeMaps: Uint8Array[] = []
    
    // Compute edges at different scales
    for (let scale = 1; scale <= 4; scale++) {
      const edgeMap = new Uint8Array(width * height)
      const kernelSize = scale * 2 + 1
      
      for (let y = kernelSize; y < height - kernelSize; y++) {
        for (let x = kernelSize; x < width - kernelSize; x++) {
          const idx = y * width + x
          
          // Sobel edge detection at current scale
          let gx = 0, gy = 0
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const sampleIdx = ((y + dy * scale) * width + (x + dx * scale)) * 4
              const intensity = (data[sampleIdx] + data[sampleIdx + 1] + data[sampleIdx + 2]) / 3
              
              // Sobel kernels
              const sobelX = dx * (dy === 0 ? 2 : 1)
              const sobelY = dy * (dx === 0 ? 2 : 1)
              
              gx += intensity * sobelX
              gy += intensity * sobelY
            }
          }
          
          const magnitude = Math.sqrt(gx * gx + gy * gy)
          edgeMap[idx] = Math.min(255, magnitude)
        }
      }
      
      edgeMaps.push(edgeMap)
    }
    
    return edgeMaps
  }

  // Semantic segmentation (simulating U²Net decoder)
  private static async computeSemanticSegmentation(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    edgeMaps: Uint8Array[]
  ): Promise<Uint8Array> {
    const segmentationMask = new Uint8Array(width * height)
    
    // Combine multi-scale features
    for (let i = 0; i < width * height; i++) {
      let edgeScore = 0
      edgeMaps.forEach((edgeMap, scale) => {
        edgeScore += edgeMap[i] * (1 / (scale + 1)) // Weight by scale
      })
      
      // Color-based segmentation
      const pixelIdx = i * 4
      const r = data[pixelIdx]
      const g = data[pixelIdx + 1]
      const b = data[pixelIdx + 2]
      
      // Advanced background detection using multiple criteria
      const colorScore = this.computeBackgroundColorScore(r, g, b, data, width, height, i)
      const positionScore = this.computePositionScore(i, width, height)
      const textureScore = this.computeTextureScore(data, width, height, i)
      
      // Combine scores (simulating U²Net's feature fusion)
      const backgroundProbability = (
        colorScore * 0.4 +
        positionScore * 0.2 +
        textureScore * 0.2 +
        (1 - edgeScore / 255) * 0.2
      )
      
      segmentationMask[i] = backgroundProbability > 0.5 ? 255 : 0
    }
    
    return segmentationMask
  }

  // Compute background color score
  private static computeBackgroundColorScore(
    r: number, g: number, b: number,
    data: Uint8ClampedArray,
    width: number, height: number,
    pixelIndex: number
  ): number {
    // Sample edge pixels to determine background color
    const edgePixels = this.sampleEdgePixels(data, width, height, 50)
    
    let minDistance = Infinity
    edgePixels.forEach(([er, eg, eb]) => {
      const distance = Math.sqrt(
        Math.pow(r - er, 2) * 0.3 +  // Red weight
        Math.pow(g - eg, 2) * 0.59 + // Green weight (human perception)
        Math.pow(b - eb, 2) * 0.11   // Blue weight
      )
      minDistance = Math.min(minDistance, distance)
    })
    
    return Math.max(0, 1 - minDistance / 100)
  }

  // Compute position-based score (edges more likely to be background)
  private static computePositionScore(pixelIndex: number, width: number, height: number): number {
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)
    
    const distanceFromEdge = Math.min(x, y, width - x - 1, height - y - 1)
    const maxDistance = Math.min(width, height) / 2
    
    return Math.max(0, 1 - distanceFromEdge / maxDistance)
  }

  // Compute texture score (uniform areas more likely to be background)
  private static computeTextureScore(
    data: Uint8ClampedArray,
    width: number, height: number,
    pixelIndex: number
  ): number {
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)
    const radius = 5
    
    if (x < radius || y < radius || x >= width - radius || y >= height - radius) {
      return 1 // Edge pixels
    }
    
    const centerIdx = pixelIndex * 4
    const centerR = data[centerIdx]
    const centerG = data[centerIdx + 1]
    const centerB = data[centerIdx + 2]
    
    let variance = 0
    let count = 0
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const sampleIdx = ((y + dy) * width + (x + dx)) * 4
        const dr = data[sampleIdx] - centerR
        const dg = data[sampleIdx + 1] - centerG
        const db = data[sampleIdx + 2] - centerB
        
        variance += dr * dr + dg * dg + db * db
        count++
      }
    }
    
    variance /= count
    return Math.max(0, 1 - variance / 10000) // Normalize variance
  }

  // Sample edge pixels for background color detection
  private static sampleEdgePixels(
    data: Uint8ClampedArray,
    width: number, height: number,
    sampleCount: number
  ): number[][] {
    const samples: number[][] = []
    
    // Sample from all four edges
    const edgePositions = [
      // Top edge
      ...Array.from({ length: sampleCount / 4 }, (_, i) => 
        [(i * width) / (sampleCount / 4), 0]
      ),
      // Bottom edge
      ...Array.from({ length: sampleCount / 4 }, (_, i) => 
        [(i * width) / (sampleCount / 4), height - 1]
      ),
      // Left edge
      ...Array.from({ length: sampleCount / 4 }, (_, i) => 
        [0, (i * height) / (sampleCount / 4)]
      ),
      // Right edge
      ...Array.from({ length: sampleCount / 4 }, (_, i) => 
        [width - 1, (i * height) / (sampleCount / 4)]
      ),
    ]
    
    edgePositions.forEach(([x, y]) => {
      const pixelIdx = (Math.floor(y) * width + Math.floor(x)) * 4
      if (pixelIdx < data.length - 3) {
        samples.push([data[pixelIdx], data[pixelIdx + 1], data[pixelIdx + 2]])
      }
    })
    
    return samples
  }

  // Refine segmentation mask with attention mechanism
  private static async refineSegmentationMask(
    data: Uint8ClampedArray,
    width: number, height: number,
    mask: Uint8Array,
    options: AdvancedImageOptions
  ): Promise<Uint8Array> {
    const refined = new Uint8Array(mask)
    const kernelSize = 7
    
    // Apply morphological operations
    this.applyMorphologicalClosing(refined, width, height, 3)
    this.applyMorphologicalOpening(refined, width, height, 2)
    
    // Apply guided filtering (edge-preserving smoothing)
    this.applyGuidedFilter(data, refined, width, height, kernelSize, 0.1)
    
    // Apply conditional random field-like refinement
    this.applyCRFRefinement(data, refined, width, height, options)
    
    return refined
  }

  // Morphological closing operation
  private static applyMorphologicalClosing(
    mask: Uint8Array,
    width: number, height: number,
    kernelSize: number
  ): void {
    // Dilation followed by erosion
    this.applyDilation(mask, width, height, kernelSize)
    this.applyErosion(mask, width, height, kernelSize)
  }

  // Morphological opening operation
  private static applyMorphologicalOpening(
    mask: Uint8Array,
    width: number, height: number,
    kernelSize: number
  ): void {
    // Erosion followed by dilation
    this.applyErosion(mask, width, height, kernelSize)
    this.applyDilation(mask, width, height, kernelSize)
  }

  // Dilation operation
  private static applyDilation(
    mask: Uint8Array,
    width: number, height: number,
    kernelSize: number
  ): void {
    const dilated = new Uint8Array(mask)
    const radius = Math.floor(kernelSize / 2)
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const centerIdx = y * width + x
        
        let maxValue = 0
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const sampleIdx = (y + dy) * width + (x + dx)
            maxValue = Math.max(maxValue, mask[sampleIdx])
          }
        }
        
        dilated[centerIdx] = maxValue
      }
    }
    
    // Copy back
    for (let i = 0; i < mask.length; i++) {
      mask[i] = dilated[i]
    }
  }

  // Erosion operation
  private static applyErosion(
    mask: Uint8Array,
    width: number, height: number,
    kernelSize: number
  ): void {
    const eroded = new Uint8Array(mask)
    const radius = Math.floor(kernelSize / 2)
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const centerIdx = y * width + x
        
        let minValue = 255
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const sampleIdx = (y + dy) * width + (x + dx)
            minValue = Math.min(minValue, mask[sampleIdx])
          }
        }
        
        eroded[centerIdx] = minValue
      }
    }
    
    // Copy back
    for (let i = 0; i < mask.length; i++) {
      mask[i] = eroded[i]
    }
  }

  // Guided filter for edge-preserving smoothing
  private static applyGuidedFilter(
    guide: Uint8ClampedArray,
    mask: Uint8Array,
    width: number, height: number,
    kernelSize: number,
    epsilon: number
  ): void {
    const filtered = new Uint8Array(mask)
    const radius = Math.floor(kernelSize / 2)
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const centerIdx = y * width + x
        
        // Compute local statistics
        let meanGuide = 0, meanMask = 0, count = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const sampleIdx = (y + dy) * width + (x + dx)
            const guideIdx = sampleIdx * 4
            
            const guideIntensity = (guide[guideIdx] + guide[guideIdx + 1] + guide[guideIdx + 2]) / 3
            meanGuide += guideIntensity
            meanMask += mask[sampleIdx]
            count++
          }
        }
        
        meanGuide /= count
        meanMask /= count
        
        // Compute covariance and variance
        let covariance = 0, variance = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const sampleIdx = (y + dy) * width + (x + dx)
            const guideIdx = sampleIdx * 4
            
            const guideIntensity = (guide[guideIdx] + guide[guideIdx + 1] + guide[guideIdx + 2]) / 3
            const guideDiff = guideIntensity - meanGuide
            const maskDiff = mask[sampleIdx] - meanMask
            
            covariance += guideDiff * maskDiff
            variance += guideDiff * guideDiff
          }
        }
        
        covariance /= count
        variance /= count
        
        // Guided filter coefficients
        const a = covariance / (variance + epsilon)
        const b = meanMask - a * meanGuide
        
        // Apply filter
        const guideIntensity = (guide[centerIdx * 4] + guide[centerIdx * 4 + 1] + guide[centerIdx * 4 + 2]) / 3
        filtered[centerIdx] = Math.max(0, Math.min(255, a * guideIntensity + b))
      }
    }
    
    // Copy back
    for (let i = 0; i < mask.length; i++) {
      mask[i] = filtered[i]
    }
  }

  // CRF-like refinement for better boundaries
  private static applyCRFRefinement(
    data: Uint8ClampedArray,
    mask: Uint8Array,
    width: number, height: number,
    options: AdvancedImageOptions
  ): void {
    const refined = new Uint8Array(mask)
    const iterations = 3
    const colorSigma = 20
    const spatialSigma = 3
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const centerIdx = y * width + x
          const centerPixelIdx = centerIdx * 4
          
          let weightSum = 0
          let valueSum = 0
          
          // 8-connected neighborhood
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const neighborIdx = (y + dy) * width + (x + dx)
              const neighborPixelIdx = neighborIdx * 4
              
              // Color similarity
              const colorDist = Math.sqrt(
                Math.pow(data[centerPixelIdx] - data[neighborPixelIdx], 2) +
                Math.pow(data[centerPixelIdx + 1] - data[neighborPixelIdx + 1], 2) +
                Math.pow(data[centerPixelIdx + 2] - data[neighborPixelIdx + 2], 2)
              )
              
              // Spatial distance
              const spatialDist = Math.sqrt(dx * dx + dy * dy)
              
              // Combined weight
              const weight = Math.exp(-colorDist / colorSigma - spatialDist / spatialSigma)
              
              weightSum += weight
              valueSum += mask[neighborIdx] * weight
            }
          }
          
          refined[centerIdx] = Math.round(valueSum / weightSum)
        }
      }
      
      // Copy refined mask back
      for (let i = 0; i < mask.length; i++) {
        mask[i] = refined[i]
      }
    }
  }

  // Apply advanced mask with feathering and edge preservation
  private static applyAdvancedMask(
    data: Uint8ClampedArray,
    width: number, height: number,
    mask: Uint8Array,
    options: AdvancedImageOptions
  ): void {
    const featherRadius = options.featherEdges !== false ? 8 : 0
    
    for (let i = 0; i < mask.length; i++) {
      const pixelIdx = i * 4
      let alpha = 255 - mask[i] // Invert mask (0 = background, 255 = foreground)
      
      if (featherRadius > 0 && alpha < 255 && alpha > 0) {
        // Apply feathering
        const x = i % width
        const y = Math.floor(i / width)
        
        let minDistanceToForeground = featherRadius
        
        for (let dy = -featherRadius; dy <= featherRadius; dy++) {
          for (let dx = -featherRadius; dx <= featherRadius; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborIdx = ny * width + nx
              if (mask[neighborIdx] < 128) { // Foreground pixel
                const distance = Math.sqrt(dx * dx + dy * dy)
                minDistanceToForeground = Math.min(minDistanceToForeground, distance)
              }
            }
          }
        }
        
        const featherAlpha = Math.max(0, 1 - minDistanceToForeground / featherRadius)
        alpha = Math.round(alpha * (1 - featherAlpha) + 255 * featherAlpha)
      }
      
      data[pixelIdx + 3] = alpha
    }
  }

  // Post-processing for upscaled images
  private static async applyPostProcessing(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    options: AdvancedImageOptions
  ): Promise<void> {
    // Apply final sharpening
    if (options.sharpen && options.sharpen > 0) {
      this.applyUnsharpMask(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
        options.sharpen / 100
      )
    }
    
    // Apply noise reduction if needed
    if (options.reduceNoise) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      this.applyAdvancedNoiseReduction(imageData.data, canvas.width, canvas.height)
      ctx.putImageData(imageData, 0, 0)
    }
  }

  // Memory-safe processing for large images
  static async processLargeImage(
    file: File,
    processor: (canvas: HTMLCanvasElement, options: AdvancedImageOptions) => Promise<void>,
    options: AdvancedImageOptions = {}
  ): Promise<Blob> {
    // Check available memory (rough estimate)
    const availableMemory = this.estimateAvailableMemory()
    const imageMemoryUsage = this.estimateImageMemoryUsage(file.size)
    
    if (imageMemoryUsage > availableMemory * 0.8) {
      throw new Error("Image too large for available memory. Please use a smaller image or try the web version.")
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
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          ctx.drawImage(img, 0, 0)
          
          await processor(canvas, options)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error("Failed to create blob"))
              }
            },
            "image/png",
            0.98
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

  // Estimate available memory
  private static estimateAvailableMemory(): number {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory
      return memory.jsHeapSizeLimit - memory.usedJSHeapSize
    }
    
    // Fallback estimate based on device type
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    return isMobile ? 512 * 1024 * 1024 : 2 * 1024 * 1024 * 1024 // 512MB mobile, 2GB desktop
  }

  // Estimate memory usage for image processing
  private static estimateImageMemoryUsage(fileSize: number): number {
    // Rough estimate: file size * 8 (for various processing buffers)
    return fileSize * 8
  }
}