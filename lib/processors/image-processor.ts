// Enhanced image processing utilities with improved algorithms and performance
import { AdvancedImageProcessor } from "./advanced-image-processor"

export interface ImageProcessingOptions {
  quality?: number
  width?: number
  height?: number
  maintainAspectRatio?: boolean
  outputFormat?: "jpeg" | "png" | "webp" | "gif"
  backgroundColor?: string
  watermarkText?: string
  watermarkOpacity?: number
  rotation?: number
  flipHorizontal?: boolean
  flipVertical?: boolean
  cropArea?: { x: number; y: number; width: number; height: number }
  compressionLevel?: "low" | "medium" | "high" | "maximum"
  removeBackground?: boolean
  position?: string
  textColor?: string
  shadowEnabled?: boolean
  sensitivity?: number
  smoothing?: number
  featherEdges?: boolean
  preserveDetails?: boolean
  scaleFactor?: string | number
  algorithm?: string
  enhanceDetails?: boolean
  reduceNoise?: boolean
  sharpen?: number
  autoOptimize?: boolean
  removeMetadata?: boolean
  resizeWidth?: number
  resizeHeight?: number
  customRotation?: number
  flipDirection?: string
  watermarkImageUrl?: string
  useImageWatermark?: boolean
  fontSize?: number
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
  // Improved upscaling with better algorithms and sharpening
  static async upscaleImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    // Parse scale factor
    let scaleFactor = 2
    if (typeof options.scaleFactor === "string") {
      scaleFactor = parseFloat(options.scaleFactor.replace('x', ''))
    } else if (typeof options.scaleFactor === "number") {
      scaleFactor = options.scaleFactor
    }

    // Use advanced processor for better results
    return AdvancedImageProcessor.upscaleImageAdvanced(file, {
      scaleFactor,
      algorithm: options.algorithm || "esrgan-like",
      enhanceDetails: options.enhanceDetails,
      reduceNoise: options.reduceNoise,
      sharpen: options.sharpen,
      maxDimensions: { width: 4096, height: 4096 },
      memoryOptimized: true,
      progressCallback: (progress) => {
        // Could emit progress events here
      }
    })
  }

  // Improved background removal with better performance for large images
  static async removeBackground(file: File, options: ImageProcessingOptions): Promise<Blob> {
    // Use advanced processor with memory protection
    return AdvancedImageProcessor.removeBackgroundAdvanced(file, {
      sensitivity: options.sensitivity,
      featherEdges: options.featherEdges,
      preserveDetails: options.preserveDetails,
      smoothing: options.smoothing,
      algorithm: "u2net-like",
      maxDimensions: { width: 2048, height: 2048 }, // Prevent crashes
      memoryOptimized: true,
      progressCallback: (progress) => {
        // Could emit progress events here
      }
    })
  }

  // Advanced sharpening filter for upscaled images
  private static applySharpeningFilter(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    intensity: number
  ): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = canvas.width
    const height = canvas.height
    
    // Advanced unsharp mask algorithm
    const kernel = [
      0, -1, 0,
      -1, 5 + intensity * 2, -1,
      0, -1, 0
    ]
    
    const output = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const kidx = ((y + ky) * width + (x + kx)) * 4 + c
              sum += data[kidx] * kernel[(ky + 1) * 3 + (kx + 1)]
            }
          }
          
          output[idx + c] = Math.max(0, Math.min(255, sum))
        }
      }
    }
    
    ctx.putImageData(new ImageData(output, width, height), 0, 0)
  }

  // Advanced sharpening specifically for upscaled images
  private static applyAdvancedSharpening(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    scaleFactor: number
  ): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = canvas.width
    const height = canvas.height
    
    // Adaptive sharpening based on scale factor
    const intensity = Math.min(0.8, scaleFactor * 0.2)
    
    // High-pass filter for detail enhancement
    const kernel = [
      -1, -1, -1,
      -1, 9 + intensity * 4, -1,
      -1, -1, -1
    ]
    
    const output = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const kidx = ((y + ky) * width + (x + kx)) * 4 + c
              sum += data[kidx] * kernel[(ky + 1) * 3 + (kx + 1)]
            }
          }
          
          // Blend with original for natural look
          const original = data[idx + c]
          const sharpened = Math.max(0, Math.min(255, sum))
          output[idx + c] = Math.round(original * 0.7 + sharpened * 0.3)
        }
      }
    }
    
    ctx.putImageData(new ImageData(output, width, height), 0, 0)
  }

  // Edge enhancement for upscaled images
  private static applyEdgeEnhancement(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    scaleFactor: number
  ): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = canvas.width
    const height = canvas.height
    
    // Edge detection and enhancement
    const edgeThreshold = 30
    const enhancementFactor = Math.min(0.5, scaleFactor * 0.1)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        // Calculate edge strength using Sobel operator
        let gx = 0, gy = 0
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const intensity = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
            
            // Sobel X
            const sobelX = dx === -1 ? -1 : dx === 1 ? 1 : 0
            gx += intensity * sobelX
            
            // Sobel Y
            const sobelY = dy === -1 ? -1 : dy === 1 ? 1 : 0
            gy += intensity * sobelY
          }
        }
        
        const edgeStrength = Math.sqrt(gx * gx + gy * gy)
        
        if (edgeStrength > edgeThreshold) {
          // Enhance edge pixels
          for (let c = 0; c < 3; c++) {
            const original = data[idx + c]
            const enhanced = Math.min(255, original * (1 + enhancementFactor))
            data[idx + c] = Math.round(original * 0.8 + enhanced * 0.2)
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
  }

  // Improved background detection with better sampling
  private static detectBackgroundColorAdvanced(
    data: Uint8ClampedArray, 
    width: number, 
    height: number
  ): number[] {
    const samples: number[][] = []
    const sampleSize = 5 // Sample every 5th pixel for performance
    
    // Enhanced edge sampling with more points
    const edgePoints = [
      // Corners (high weight)
      ...Array(10).fill([0, 0]),
      ...Array(10).fill([width - 1, 0]),
      ...Array(10).fill([0, height - 1]),
      ...Array(10).fill([width - 1, height - 1]),
      
      // Edges (medium weight)
      ...Array.from({ length: 100 }, (_, i) => [Math.floor((width * i) / 100), 0]),
      ...Array.from({ length: 100 }, (_, i) => [Math.floor((width * i) / 100), height - 1]),
      ...Array.from({ length: 100 }, (_, i) => [0, Math.floor((height * i) / 100)]),
      ...Array.from({ length: 100 }, (_, i) => [width - 1, Math.floor((height * i) / 100)]),
      
      // Inner border (low weight)
      ...Array.from({ length: 50 }, (_, i) => [Math.floor((width * i) / 50), Math.floor(height * 0.1)]),
      ...Array.from({ length: 50 }, (_, i) => [Math.floor((width * i) / 50), Math.floor(height * 0.9)]),
    ]
    
    edgePoints.forEach(([x, y]) => {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const index = (y * width + x) * 4
        samples.push([data[index], data[index + 1], data[index + 2]])
      }
    })
    
    // Advanced clustering to find dominant background color
    return this.findDominantColorClustering(samples)
  }

  // Improved color clustering algorithm
  private static findDominantColorClustering(colors: number[][]): number[] {
    if (colors.length === 0) return [255, 255, 255]
    
    // K-means clustering with k=5 for better background detection
    const k = 5
    const maxIterations = 10
    
    // Initialize centroids
    const centroids: number[][] = []
    for (let i = 0; i < k; i++) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)]
      centroids.push([...randomColor])
    }
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const clusters: number[][][] = Array(k).fill(null).map(() => [])
      
      // Assign colors to nearest centroid
      colors.forEach(color => {
        let minDistance = Infinity
        let bestCluster = 0
        
        centroids.forEach((centroid, index) => {
          const distance = Math.sqrt(
            Math.pow(color[0] - centroid[0], 2) +
            Math.pow(color[1] - centroid[1], 2) +
            Math.pow(color[2] - centroid[2], 2)
          )
      if (file.size > 30 * 1024 * 1024) {
          if (distance < minDistance) {
            minDistance = distance
          description: `${file.name} is ${Math.round(file.size / (1024 * 1024))}MB. Processing will be memory-optimized to prevent crashes.`,
          }
        })
        
        clusters[bestCluster].push(color)
      })
      
      // Update centroids
      clusters.forEach((cluster, index) => {
        if (cluster.length > 0) {
          const avgR = cluster.reduce((sum, color) => sum + color[0], 0) / cluster.length
          const avgG = cluster.reduce((sum, color) => sum + color[1], 0) / cluster.length
          const avgB = cluster.reduce((sum, color) => sum + color[2], 0) / cluster.length
          centroids[index] = [avgR, avgG, avgB]
        }
      })
    }
    
    // Find the cluster with most samples (likely background)
    let maxClusterSize = 0
    let backgroundColor = centroids[0]
    
    centroids.forEach((centroid, index) => {
      const clusterSize = colors.filter(color => {
        const distance = Math.sqrt(
          Math.pow(color[0] - centroid[0], 2) +
          Math.pow(color[1] - centroid[1], 2) +
          Math.pow(color[2] - centroid[2], 2)
        )
        return distance < 50
      }).length
      
      if (clusterSize > maxClusterSize) {
        maxClusterSize = clusterSize
        backgroundColor = centroid
      }
    })
    
    return backgroundColor
  }

  // Improved background removal with better edge detection
  private static removeBackgroundAdvanced(
    data: Uint8ClampedArray, 
    width: number, 
    height: number, 
    bgColor: number[], 
    sensitivity: number, 
    options: ImageProcessingOptions
  ): void {
    const threshold = sensitivity * 2.5
    const edgeMap = new Uint8Array(width * height)
    
    // Advanced edge detection with Canny-like algorithm
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        // Calculate gradients using improved Sobel operator
        let gx = 0, gy = 0
        
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const intensity = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
            const kernelIdx = (dy + 1) * 3 + (dx + 1)
            
            gx += intensity * sobelX[kernelIdx]
            gy += intensity * sobelY[kernelIdx]
          }
        }
        
        const gradientMagnitude = Math.sqrt(gx * gx + gy * gy)
        edgeMap[idx] = gradientMagnitude > threshold * 0.3 ? 1 : 0
      }
    }
    
    // Apply background removal with improved algorithm
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const x = pixelIdx % width
      const y = Math.floor(pixelIdx / width)
      
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Enhanced color distance calculation
      const colorDistance = Math.sqrt(
        Math.pow(r - bgColor[0], 2) * 0.3 + // Red weight
        Math.pow(g - bgColor[1], 2) * 0.59 + // Green weight (human eye sensitivity)
        Math.pow(b - bgColor[2], 2) * 0.11   // Blue weight
      )

      if (colorDistance < threshold) {
        if (options.featherEdges !== false && edgeMap[pixelIdx]) {
          // Advanced feathering with distance-based alpha
          const featherDistance = this.calculateFeatherDistance(edgeMap, pixelIdx, width, height, 8)
          const alpha = Math.max(0, Math.min(255, featherDistance * 255))
          data[i + 3] = alpha
        } else {
          data[i + 3] = 0 // Fully transparent
        }
      } else if (options.preserveDetails !== false && edgeMap[pixelIdx]) {
        // Enhance foreground edge details
        data[i + 3] = Math.min(255, data[i + 3] * 1.1)
      }
    }
    
    // Apply smoothing if enabled
    if (options.smoothing && options.smoothing > 0) {
      this.applyAlphaSmoothing(data, width, height, options.smoothing)
    }
  }

  // Improved feather distance calculation
  private static calculateFeatherDistance(
    edgeMap: Uint8Array,
    pixelIdx: number,
    width: number,
    height: number,
    searchRadius: number
  ): number {
    const x = pixelIdx % width
    const y = Math.floor(pixelIdx / width)
    
    let minDistance = searchRadius
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (edgeMap[nIdx] === 0) { // Foreground pixel
            const distance = Math.sqrt(dx * dx + dy * dy)
            minDistance = Math.min(minDistance, distance)
          }
        }
      }
    }
    
    return Math.max(0, 1 - minDistance / searchRadius)
  }

  // Alpha channel smoothing for better edges
  private static applyAlphaSmoothing(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    smoothing: number
  ): void {
    const smoothedAlpha = new Uint8ClampedArray(width * height)
    const radius = Math.ceil(smoothing / 10)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        let alphaSum = 0
        let weightSum = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx
              const distance = Math.sqrt(dx * dx + dy * dy)
              const weight = Math.exp(-distance / radius)
              
              alphaSum += data[nIdx * 4 + 3] * weight
              weightSum += weight
            }
          }
        }
        
        smoothedAlpha[idx] = Math.round(alphaSum / weightSum)
      }
    }
    
    // Apply smoothed alpha values
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 3] = smoothedAlpha[i]
    }
  }

  // Noise reduction for upscaled images
  private static applyNoiseReduction(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement
  ): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = canvas.width
    const height = canvas.height
    
    // Bilateral filter for noise reduction while preserving edges
    const output = new Uint8ClampedArray(data)
    const spatialSigma = 2
    const intensitySigma = 30
    
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = (y * width + x) * 4
        
        for (let c = 0; c < 3; c++) {
          let weightSum = 0
          let valueSum = 0
          const centerValue = data[idx + c]
          
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c
              const neighborValue = data[nIdx]
              
              const spatialWeight = Math.exp(-(dx * dx + dy * dy) / (2 * spatialSigma * spatialSigma))
              const intensityWeight = Math.exp(-Math.pow(centerValue - neighborValue, 2) / (2 * intensitySigma * intensitySigma))
              const weight = spatialWeight * intensityWeight
              
              weightSum += weight
              valueSum += neighborValue * weight
            }
          }
          
          output[idx + c] = Math.round(valueSum / weightSum)
        }
      }
    }
    
    ctx.putImageData(new ImageData(output, width, height), 0, 0)
  }

  // Keep existing methods but with improved implementations
  static async resizeImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { alpha: true })
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          let { width: targetWidth, height: targetHeight } = options
          const { naturalWidth: originalWidth, naturalHeight: originalHeight } = img

          if (options.resizeWidth && options.resizeWidth > 0) {
            targetWidth = options.resizeWidth
          }
          if (options.resizeHeight && options.resizeHeight > 0) {
            targetHeight = options.resizeHeight
          }

          if (options.maintainAspectRatio && targetWidth && targetHeight) {
            const aspectRatio = originalWidth / originalHeight
            if (targetWidth / targetHeight > aspectRatio) {
              targetWidth = targetHeight * aspectRatio
            } else {
              targetHeight = targetWidth / aspectRatio
            }
          } else if (targetWidth && !targetHeight) {
            targetHeight = (targetWidth / originalWidth) * originalHeight
          } else if (targetHeight && !targetWidth) {
            targetWidth = (targetHeight / originalHeight) * originalWidth
          }

          canvas.width = Math.max(1, Math.floor(targetWidth || originalWidth))
          canvas.height = Math.max(1, Math.floor(targetHeight || originalHeight))

          if (options.backgroundColor && options.outputFormat !== "png") {
            ctx.fillStyle = options.backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          ctx.save()
          
          let scaleX = 1, scaleY = 1
          if (options.flipDirection === "horizontal" || options.flipDirection === "both") {
            scaleX = -1
          }
          if (options.flipDirection === "vertical" || options.flipDirection === "both") {
            scaleY = -1
          }
          
          if (scaleX !== 1 || scaleY !== 1) {
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.scale(scaleX, scaleY)
            ctx.translate(-canvas.width / 2, -canvas.height / 2)
          }

          const rotationAngle = options.customRotation !== undefined ? options.customRotation : (options.rotation || 0)
          if (rotationAngle) {
            const angle = (rotationAngle * Math.PI) / 180
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate(angle)
            ctx.translate(-canvas.width / 2, -canvas.height / 2)
          }

          if (options.filters) {
            const filters = []
            const { brightness, contrast, saturation, blur, sepia, grayscale } = options.filters

            if (brightness !== undefined && brightness !== 100) {
              filters.push(`brightness(${Math.max(0, Math.min(300, brightness))}%)`)
            }
            if (contrast !== undefined && contrast !== 100) {
              filters.push(`contrast(${Math.max(0, Math.min(300, contrast))}%)`)
            }
            if (saturation !== undefined && saturation !== 100) {
              filters.push(`saturate(${Math.max(0, Math.min(300, saturation))}%)`)
            }
            if (blur !== undefined && blur > 0) {
              filters.push(`blur(${Math.max(0, Math.min(50, blur))}px)`)
            }
            if (sepia) filters.push("sepia(100%)")
            if (grayscale) filters.push("grayscale(100%)")

            if (filters.length > 0) {
              ctx.filter = filters.join(" ")
            }
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          ctx.restore()

          if (options.watermarkText) {
            this.applyTextWatermark(ctx, canvas, options.watermarkText, options)
          }

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
            quality,
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

  static async compressImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { alpha: true })
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          let canvasWidth = img.naturalWidth
          let canvasHeight = img.naturalHeight

          let scaleFactor = 1
          let qualityMultiplier = 1
          
          switch (options.compressionLevel) {
            case "low":
              scaleFactor = 0.98
              qualityMultiplier = 0.95
              break
            case "medium":
              scaleFactor = 0.85
              qualityMultiplier = 0.8
              break
            case "high":
              scaleFactor = 0.65
              qualityMultiplier = 0.6
              break
            case "maximum":
              scaleFactor = 0.4
              qualityMultiplier = 0.3
              break
          }

          canvasWidth = Math.max(50, Math.floor(canvasWidth * scaleFactor))
          canvasHeight = Math.max(50, Math.floor(canvasHeight * scaleFactor))

          canvas.width = canvasWidth
          canvas.height = canvasHeight

          if (options.outputFormat === "jpeg") {
            ctx.fillStyle = options.backgroundColor || "#ffffff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          ctx.imageSmoothingEnabled = options.compressionLevel !== "maximum"
          ctx.imageSmoothingQuality = options.compressionLevel === "maximum" ? "low" : "high"
          
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)

          let quality = (options.quality || 80) * qualityMultiplier
          
          switch (options.compressionLevel) {
            case "low":
              quality = Math.max(quality, 85)
              break
            case "medium":
              quality = Math.max(30, Math.min(quality, 85))
              break
            case "high":
              quality = Math.max(15, Math.min(quality, 50))
              break
            case "maximum":
              quality = Math.max(5, Math.min(quality, 25))
              break
          }

          const mimeType = `image/${options.outputFormat || "jpeg"}`
          const normalizedQuality = Math.max(0.05, Math.min(1.0, quality / 100))

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error("Failed to create blob"))
              }
            },
            mimeType,
            normalizedQuality,
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

  static async cropImage(file: File, cropArea: any, options: ImageProcessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { alpha: true })
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          let validCropArea
          
          if (cropArea && typeof cropArea === 'object') {
            validCropArea = {
              x: Math.max(0, Math.min(100, cropArea.x || 10)),
              y: Math.max(0, Math.min(100, cropArea.y || 10)),
              width: Math.max(1, Math.min(100, cropArea.width || 80)),
              height: Math.max(1, Math.min(100, cropArea.height || 80))
            }
          } else {
            validCropArea = { x: 10, y: 10, width: 80, height: 80 }
          }

          if (validCropArea.x + validCropArea.width > 100) {
            validCropArea.width = 100 - validCropArea.x
          }
          if (validCropArea.y + validCropArea.height > 100) {
            validCropArea.height = 100 - validCropArea.y
          }

          if (validCropArea.width < 1) validCropArea.width = 1
          if (validCropArea.height < 1) validCropArea.height = 1

          const cropX = (validCropArea.x / 100) * img.naturalWidth
          const cropY = (validCropArea.y / 100) * img.naturalHeight
          const cropWidth = (validCropArea.width / 100) * img.naturalWidth
          const cropHeight = (validCropArea.height / 100) * img.naturalHeight

          const finalCropX = Math.max(0, Math.min(img.naturalWidth - 1, cropX))
          const finalCropY = Math.max(0, Math.min(img.naturalHeight - 1, cropY))
          const finalCropWidth = Math.max(1, Math.min(cropWidth, img.naturalWidth - finalCropX))
          const finalCropHeight = Math.max(1, Math.min(cropHeight, img.naturalHeight - finalCropY))

          if (finalCropWidth <= 0 || finalCropHeight <= 0) {
            reject(new Error("Invalid crop area - dimensions too small"))
            return
          }

          canvas.width = Math.max(1, Math.floor(finalCropWidth))
          canvas.height = Math.max(1, Math.floor(finalCropHeight))

          if (options.backgroundColor) {
            ctx.fillStyle = options.backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          ctx.drawImage(
            img, 
            finalCropX, finalCropY, finalCropWidth, finalCropHeight,
            0, 0, canvas.width, canvas.height
          )

          const quality = Math.max(0.1, Math.min(1.0, (options.quality || 95) / 100))
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
            quality,
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

  static async rotateImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { alpha: true })
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          const angle = options.customRotation !== undefined ? 
            (options.customRotation * Math.PI) / 180 : 
            ((options.rotation || 0) * Math.PI) / 180
            
          const { naturalWidth: width, naturalHeight: height } = img

          const cos = Math.abs(Math.cos(angle))
          const sin = Math.abs(Math.sin(angle))
          const newWidth = Math.ceil(width * cos + height * sin)
          const newHeight = Math.ceil(width * sin + height * cos)

          canvas.width = newWidth
          canvas.height = newHeight

          if (options.backgroundColor) {
            ctx.fillStyle = options.backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          ctx.translate(newWidth / 2, newHeight / 2)
          ctx.rotate(angle)
          ctx.drawImage(img, -width / 2, -height / 2)

          const quality = Math.max(0.1, Math.min(1.0, (options.quality || 95) / 100))
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
            quality,
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

  static async addWatermark(file: File, watermarkText: string, options: ImageProcessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { alpha: true })
      if (!ctx || !watermarkText) {
        reject(new Error("Canvas not supported or watermark text not specified"))
        return
      }

      const img = new Image()
      img.onload = async () => {
        try {
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight

          ctx.drawImage(img, 0, 0)

          if (options.useImageWatermark && options.watermarkImageUrl) {
            try {
              await this.addImageWatermark(ctx, canvas, options.watermarkImageUrl, options)
            } catch (error) {
              console.warn("Failed to add image watermark, falling back to text:", error)
              this.applyTextWatermark(ctx, canvas, watermarkText, options)
            }
          } else {
            this.applyTextWatermark(ctx, canvas, watermarkText, options)
          }

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
            quality,
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

  private static async addImageWatermark(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    imageUrl: string, 
    options: ImageProcessingOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const watermarkImg = new Image()
      watermarkImg.crossOrigin = "anonymous"
      
      watermarkImg.onload = () => {
        try {
          ctx.save()
          ctx.globalAlpha = options.watermarkOpacity || 0.5

          const watermarkSize = Math.min(canvas.width, canvas.height) * 0.2
          const aspectRatio = watermarkImg.naturalWidth / watermarkImg.naturalHeight
          
          let watermarkWidth = watermarkSize
          let watermarkHeight = watermarkSize / aspectRatio
          
          if (aspectRatio < 1) {
            watermarkHeight = watermarkSize
            watermarkWidth = watermarkSize * aspectRatio
          }

          let x: number, y: number

          switch (options.position) {
            case "top-left":
              x = 20
              y = 20
              break
            case "top-right":
              x = canvas.width - watermarkWidth - 20
              y = 20
              break
            case "bottom-left":
              x = 20
              y = canvas.height - watermarkHeight - 20
              break
            case "bottom-right":
              x = canvas.width - watermarkWidth - 20
              y = canvas.height - watermarkHeight - 20
              break
            default:
              x = (canvas.width - watermarkWidth) / 2
              y = (canvas.height - watermarkHeight) / 2
              break
          }

          ctx.drawImage(watermarkImg, x, y, watermarkWidth, watermarkHeight)
          ctx.restore()
          resolve()
        } catch (error) {
          reject(error)
        }
      }

      watermarkImg.onerror = () => reject(new Error("Failed to load watermark image"))
      watermarkImg.src = imageUrl
    })
  }

  private static applyTextWatermark(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    watermarkText: string, 
    options: ImageProcessingOptions
  ): void {
    ctx.save()
    
    const baseFontSize = Math.min(canvas.width, canvas.height) * 0.08
    const fontSizeMultiplier = (options.fontSize || 48) / 48
    const fontSize = Math.max(12, baseFontSize * fontSizeMultiplier)
    
    ctx.font = `bold ${fontSize}px Arial`
    ctx.fillStyle = options.textColor || "#ffffff"
    ctx.globalAlpha = Math.max(0.1, Math.min(1.0, options.watermarkOpacity || 0.5))

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
      case "diagonal":
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(-Math.PI / 4)
        x = 0
        y = 0
        ctx.textAlign = "center"
        break
      default:
        ctx.textAlign = "center"
        break
    }

    ctx.textBaseline = "middle"
    ctx.fillText(watermarkText, x, y)
    
    ctx.restore()
  }

  static async convertFormat(file: File, outputFormat: "jpeg" | "png" | "webp", options: ImageProcessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { alpha: true })
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight

          if (outputFormat === "jpeg") {
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          
          ctx.drawImage(img, 0, 0)

          const quality = Math.max(0.1, Math.min(1.0, (options.quality || 90) / 100))
          const mimeType = `image/${outputFormat}`

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error("Failed to create blob"))
              }
            },
            mimeType,
            quality,
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

  static async applyFilters(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { alpha: true })
      if (!ctx || !options.filters) {
        reject(new Error("Canvas not supported or no filters specified"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight

          const filters = []
          const { brightness, contrast, saturation, blur, sepia, grayscale } = options.filters

          if (brightness !== undefined && brightness !== 100) {
            filters.push(`brightness(${Math.max(0, Math.min(300, brightness))}%)`)
          }
          if (contrast !== undefined && contrast !== 100) {
            filters.push(`contrast(${Math.max(0, Math.min(300, contrast))}%)`)
          }
          if (saturation !== undefined && saturation !== 100) {
            filters.push(`saturate(${Math.max(0, Math.min(300, saturation))}%)`)
          }
          if (blur !== undefined && blur > 0) {
            filters.push(`blur(${Math.max(0, Math.min(50, blur))}px)`)
          }
          if (sepia) filters.push("sepia(100%)")
          if (grayscale) filters.push("grayscale(100%)")

          if (filters.length > 0) {
            ctx.filter = filters.join(" ")
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          
          ctx.drawImage(img, 0, 0)

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
            quality,
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
}