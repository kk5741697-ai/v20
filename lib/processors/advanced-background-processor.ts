// Professional background removal processor with improved algorithms
export interface BackgroundRemovalOptions {
  algorithm?: "auto" | "portrait" | "object" | "precise"
  sensitivity?: number
  featherEdges?: boolean
  preserveDetails?: boolean
  memoryOptimized?: boolean
  maxDimensions?: { width: number; height: number }
  progressCallback?: (progress: number, stage: string) => void
  smoothing?: number
  outputFormat?: "png" | "webp"
}

export interface ProcessingResult {
  processedBlob: Blob
  maskData?: ImageData
  originalImageData?: ImageData
}

export class AdvancedBackgroundProcessor {
  private static readonly MAX_SAFE_PIXELS = 1536 * 1536 // Reduced for stability
  
  static async removeBackground(
    file: File, 
    options: BackgroundRemovalOptions = {}
  ): Promise<ProcessingResult> {
    const { progressCallback } = options
    
    try {
      progressCallback?.(5, "Loading image...")
      
      // Strict memory safety checks
      if (file.size > 15 * 1024 * 1024) { // 15MB limit
        throw new Error("Image too large. Please use an image smaller than 15MB.")
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { 
        alpha: true,
        willReadFrequently: true,
        desynchronized: false
      })
      
      if (!ctx) {
        throw new Error("Canvas not supported")
      }

      const img = await this.loadImage(file)
      progressCallback?.(15, "Analyzing image...")
      
      // Calculate safe working dimensions
      const { workingWidth, workingHeight } = this.calculateSafeDimensions(
        img.naturalWidth, 
        img.naturalHeight,
        options.maxDimensions
      )
      
      canvas.width = workingWidth
      canvas.height = workingHeight
      
      // Draw image at safe resolution
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "medium"
      ctx.drawImage(img, 0, 0, workingWidth, workingHeight)
      
      progressCallback?.(25, "Detecting subject...")
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, workingWidth, workingHeight)
      
      progressCallback?.(40, "Removing background...")
      
      // Apply improved background removal
      await this.processBackgroundRemoval(imageData, options, progressCallback)
      
      progressCallback?.(80, "Applying transparency...")
      
      // Put processed data back
      ctx.putImageData(imageData, 0, 0)
      
      progressCallback?.(95, "Finalizing...")
      
      // Create final blob
      const processedBlob = await this.canvasToBlob(canvas, `image/${options.outputFormat || "png"}`, 0.95)
      
      progressCallback?.(100, "Complete!")
      
      return {
        processedBlob
      }
      
    } catch (error) {
      console.error("Background removal failed:", error)
      throw new Error(error instanceof Error ? error.message : "Background removal failed")
    }
  }

  private static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Failed to load image"))
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file)
    })
  }

  private static calculateSafeDimensions(
    originalWidth: number, 
    originalHeight: number,
    maxDimensions?: { width: number; height: number }
  ) {
    const maxWidth = maxDimensions?.width || 1536
    const maxHeight = maxDimensions?.height || 1536
    const totalPixels = originalWidth * originalHeight
    
    let workingWidth = originalWidth
    let workingHeight = originalHeight
    
    // Check if image exceeds safe pixel count
    if (totalPixels > this.MAX_SAFE_PIXELS) {
      const scale = Math.sqrt(this.MAX_SAFE_PIXELS / totalPixels)
      workingWidth = Math.floor(originalWidth * scale)
      workingHeight = Math.floor(originalHeight * scale)
    }
    
    // Check if image exceeds max dimensions
    if (workingWidth > maxWidth || workingHeight > maxHeight) {
      const scale = Math.min(maxWidth / workingWidth, maxHeight / workingHeight)
      workingWidth = Math.floor(workingWidth * scale)
      workingHeight = Math.floor(workingHeight * scale)
    }
    
    return { workingWidth, workingHeight }
  }

  private static async processBackgroundRemoval(
    imageData: ImageData,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<void> {
    const { width, height, data } = imageData
    const algorithm = options.algorithm || "auto"
    
    progressCallback?.(45, "Analyzing image structure...")
    
    // Analyze image to choose best algorithm
    const imageAnalysis = this.analyzeImage(data, width, height)
    let selectedAlgorithm = algorithm
    
    if (algorithm === "auto") {
      if (imageAnalysis.hasPortrait) {
        selectedAlgorithm = "portrait"
      } else if (imageAnalysis.hasDistinctObject) {
        selectedAlgorithm = "object"
      } else {
        selectedAlgorithm = "precise"
      }
    }
    
    progressCallback?.(55, `Applying ${selectedAlgorithm} algorithm...`)
    
    // Apply selected algorithm
    switch (selectedAlgorithm) {
      case "portrait":
        await this.portraitBackgroundRemoval(data, width, height, options)
        break
      case "object":
        await this.objectBackgroundRemoval(data, width, height, options)
        break
      case "precise":
        await this.preciseBackgroundRemoval(data, width, height, options)
        break
      default:
        await this.smartBackgroundRemoval(data, width, height, options)
    }
  }

  private static analyzeImage(data: Uint8ClampedArray, width: number, height: number) {
    let skinPixels = 0
    let edgePixels = 0
    let uniformRegions = 0
    const totalPixels = width * height
    const sampleRate = Math.max(1, Math.floor(totalPixels / 5000)) // Reduced sampling
    
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Detect skin tones
      if (this.isSkinTone(r, g, b)) {
        skinPixels++
      }
      
      // Detect edges
      const x = (i / 4) % width
      const y = Math.floor((i / 4) / width)
      
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const neighborIdx = ((y * width) + (x + 1)) * 4
        if (neighborIdx < data.length - 3) {
          const colorDiff = Math.abs(r - data[neighborIdx]) + 
                           Math.abs(g - data[neighborIdx + 1]) + 
                           Math.abs(b - data[neighborIdx + 2])
          if (colorDiff > 30) {
            edgePixels++
          } else {
            uniformRegions++
          }
        }
      }
    }
    
    const sampledPixels = Math.floor(totalPixels / sampleRate)
    
    return {
      hasPortrait: (skinPixels / sampledPixels) > 0.03,
      hasDistinctObject: (edgePixels / sampledPixels) > 0.1,
      hasUniformBackground: (uniformRegions / sampledPixels) > 0.5
    }
  }

  private static isSkinTone(r: number, g: number, b: number): boolean {
    // Improved skin tone detection
    return (
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(r - g) > 15
    )
  }

  private static async portraitBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    const sensitivity = options.sensitivity || 25
    
    // Enhanced portrait detection with better edge handling
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) * 0.45
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        // Distance from center
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        )
        const centerWeight = Math.max(0, 1 - distanceFromCenter / maxRadius)
        
        // Skin tone detection
        const isSkin = this.isSkinTone(r, g, b)
        const skinWeight = isSkin ? 0.9 : 0
        
        // Edge detection
        const edgeWeight = this.calculateEdgeWeight(data, x, y, width, height)
        
        // Hair and clothing detection (darker regions near skin)
        const hairWeight = this.detectHairClothing(data, x, y, width, height, r, g, b)
        
        // Combine weights
        const keepScore = (centerWeight * 0.3) + (skinWeight * 0.4) + (edgeWeight * 0.2) + (hairWeight * 0.1)
        
        // Apply threshold with feathering
        if (keepScore < 0.3) {
          // Background - make transparent
          data[idx + 3] = 0
        } else if (keepScore < 0.6 && options.featherEdges) {
          // Edge area - apply feathering
          const alpha = Math.round((keepScore - 0.3) / 0.3 * 255)
          data[idx + 3] = Math.min(data[idx + 3], alpha)
        }
        // Else keep original alpha
      }
    }
    
    // Apply smoothing if requested
    if (options.smoothing && options.smoothing > 0) {
      this.applyAlphaSmoothing(data, width, height, options.smoothing)
    }
  }

  private static async objectBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    const sensitivity = options.sensitivity || 25
    
    // Enhanced edge detection
    const edges = this.detectEdges(data, width, height)
    
    // Improved flood fill from edges
    const backgroundMask = this.floodFillBackground(data, edges, width, height, sensitivity)
    
    // Apply mask with feathering
    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4
      const isBackground = backgroundMask[i]
      
      if (isBackground) {
        if (options.featherEdges) {
          // Calculate distance to nearest foreground pixel for feathering
          const featherDistance = this.calculateFeatherDistance(backgroundMask, i, width, height)
          const alpha = Math.max(0, Math.min(255, featherDistance * 255))
          data[pixelIdx + 3] = alpha
        } else {
          data[pixelIdx + 3] = 0
        }
      }
    }
  }

  private static async preciseBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    const sensitivity = options.sensitivity || 25
    
    // Sample background colors from edges
    const backgroundColors = this.sampleBackgroundColors(data, width, height)
    const dominantBg = this.findDominantBackgroundColor(backgroundColors)
    
    // Apply precise color-based removal
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        // Calculate perceptual color distance
        const colorDistance = Math.sqrt(
          Math.pow(r - dominantBg.r, 2) * 0.3 +
          Math.pow(g - dominantBg.g, 2) * 0.59 +
          Math.pow(b - dominantBg.b, 2) * 0.11
        )
        
        const threshold = sensitivity * 2.5
        
        if (colorDistance < threshold) {
          if (options.featherEdges) {
            const alpha = Math.max(0, Math.min(255, (colorDistance / threshold) * 255))
            data[idx + 3] = alpha
          } else {
            data[idx + 3] = 0
          }
        }
      }
    }
  }

  private static async smartBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Combine multiple techniques
    const tempData1 = new Uint8ClampedArray(data)
    const tempData2 = new Uint8ClampedArray(data)
    
    // Apply portrait and object detection
    await this.portraitBackgroundRemoval(tempData1, width, height, options)
    await this.objectBackgroundRemoval(tempData2, width, height, options)
    
    // Combine results by taking the more conservative (higher alpha) result
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4
      const alpha1 = tempData1[idx + 3]
      const alpha2 = tempData2[idx + 3]
      
      // Use the higher alpha value (more conservative)
      data[idx + 3] = Math.max(alpha1, alpha2)
    }
  }

  private static calculateEdgeWeight(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) return 0
    
    const centerIdx = (y * width + x) * 4
    const centerIntensity = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    let maxGradient = 0
    
    // Check neighbors for edge detection
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const neighborIdx = ((y + dy) * width + (x + dx)) * 4
        const neighborIntensity = (data[neighborIdx] + data[neighborIdx + 1] + data[neighborIdx + 2]) / 3
        const gradient = Math.abs(centerIntensity - neighborIntensity)
        
        maxGradient = Math.max(maxGradient, gradient)
      }
    }
    
    return Math.min(1, maxGradient / 100)
  }

  private static detectHairClothing(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number,
    r: number,
    g: number,
    b: number
  ): number {
    // Look for darker regions that might be hair or clothing
    const brightness = (r + g + b) / 3
    
    // Check if this is a darker region near skin tones
    let nearSkin = false
    const searchRadius = 20
    
    for (let dy = -searchRadius; dy <= searchRadius; dy += 5) {
      for (let dx = -searchRadius; dx <= searchRadius; dx += 5) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 4
          if (this.isSkinTone(data[nIdx], data[nIdx + 1], data[nIdx + 2])) {
            nearSkin = true
            break
          }
        }
      }
      if (nearSkin) break
    }
    
    // If it's dark and near skin, likely hair/clothing
    if (nearSkin && brightness < 120) {
      return 0.8
    }
    
    return 0
  }

  private static detectEdges(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const edges = new Uint8Array(width * height)
    
    // Simple Sobel edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        
        let gx = 0, gy = 0
        
        // 3x3 Sobel kernels
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const pixelIdx = ((y + dy) * width + (x + dx)) * 4
            const intensity = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3
            
            // Sobel X and Y
            const sobelX = dx * (dy === 0 ? 2 : 1)
            const sobelY = dy * (dx === 0 ? 2 : 1)
            
            gx += intensity * sobelX
            gy += intensity * sobelY
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        edges[idx] = Math.min(255, magnitude)
      }
    }
    
    return edges
  }

  private static floodFillBackground(
    data: Uint8ClampedArray,
    edges: Uint8Array,
    width: number,
    height: number,
    sensitivity: number
  ): Uint8Array {
    const backgroundMask = new Uint8Array(width * height)
    const visited = new Uint8Array(width * height)
    const queue: Array<[number, number]> = []
    const edgeThreshold = sensitivity * 2
    
    // Start from multiple edge points
    const startPoints = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)]
    ]
    
    startPoints.forEach(([x, y]) => {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        queue.push([x, y])
      }
    })
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      const idx = y * width + x
      
      if (visited[idx] || edges[idx] > edgeThreshold) continue
      
      visited[idx] = 1
      backgroundMask[idx] = 1
      
      // Add 4-connected neighbors
      const neighbors = [[x+1,y], [x-1,y], [x,y+1], [x,y-1]]
      neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (!visited[nIdx] && edges[nIdx] <= edgeThreshold) {
            queue.push([nx, ny])
          }
        }
      })
    }
    
    return backgroundMask
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
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4
        samples.push({
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2]
        })
      }
    })
    
    return samples
  }

  private static findDominantBackgroundColor(
    colors: Array<{ r: number; g: number; b: number }>
  ): { r: number; g: number; b: number } {
    // Find most common color
    const colorCounts = new Map<string, { color: { r: number; g: number; b: number }; count: number }>()
    
    colors.forEach(color => {
      const key = `${Math.floor(color.r / 20)}-${Math.floor(color.g / 20)}-${Math.floor(color.b / 20)}`
      if (colorCounts.has(key)) {
        colorCounts.get(key)!.count++
      } else {
        colorCounts.set(key, { color, count: 1 })
      }
    })
    
    let maxCount = 0
    let dominantColor = colors[0]
    
    colorCounts.forEach(({ color, count }) => {
      if (count > maxCount) {
        maxCount = count
        dominantColor = color
      }
    })
    
    return dominantColor
  }

  private static calculateFeatherDistance(
    backgroundMask: Uint8Array,
    pixelIdx: number,
    width: number,
    height: number
  ): number {
    const x = pixelIdx % width
    const y = Math.floor(pixelIdx / width)
    
    let minDistance = Infinity
    const searchRadius = 8
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (!backgroundMask[nIdx]) {
            const distance = Math.sqrt(dx * dx + dy * dy)
            minDistance = Math.min(minDistance, distance)
          }
        }
      }
    }
    
    return Math.max(0, 1 - minDistance / searchRadius)
  }

  private static applyAlphaSmoothing(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    smoothing: number
  ): void {
    const smoothed = new Uint8ClampedArray(data)
    const radius = Math.ceil(smoothing / 2)
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4
        let alphaSum = 0
        let count = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            alphaSum += data[nIdx + 3]
            count++
          }
        }
        
        smoothed[idx + 3] = Math.round(alphaSum / count)
      }
    }
    
    // Copy smoothed alpha back
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 3] = smoothed[i * 4 + 3]
    }
  }

  private static canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to create blob"))
          }
        },
        type,
        quality
      )
    })
  }
}