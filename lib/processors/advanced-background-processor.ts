// Professional background removal processor with memory optimization
export interface BackgroundRemovalOptions {
  algorithm?: "auto" | "portrait" | "object" | "precise"
  sensitivity?: number
  featherEdges?: boolean
  preserveDetails?: boolean
  memoryOptimized?: boolean
  maxDimensions?: { width: number; height: number }
  progressCallback?: (progress: number, stage: string) => void
}

export interface BackgroundConfig {
  type: "transparent" | "color" | "gradient" | "image" | "blur"
  value: string
  blurAmount?: number
  shadowIntensity?: number
  shadowOffset?: number
  quality?: number
}

export interface ProcessingResult {
  processedBlob: Blob
  maskData?: ImageData
  originalImageData?: ImageData
}

export class AdvancedBackgroundProcessor {
  private static readonly MAX_SAFE_PIXELS = 2048 * 2048 // 4MP max for stability
  private static readonly TILE_SIZE = 512 // Process in tiles to prevent crashes
  
  static async removeBackground(
    file: File, 
    options: BackgroundRemovalOptions = {}
  ): Promise<ProcessingResult> {
    const { progressCallback } = options
    
    try {
      progressCallback?.(5, "Loading image...")
      
      // Memory safety checks
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        throw new Error("Image too large. Please use an image smaller than 20MB.")
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { 
        alpha: true,
        willReadFrequently: false,
        desynchronized: true
      })
      
      if (!ctx) {
        throw new Error("Canvas not supported")
      }

      const img = await this.loadImage(file)
      progressCallback?.(15, "Analyzing image...")
      
      // Calculate safe working dimensions
      const { workingWidth, workingHeight, needsScaling } = this.calculateSafeDimensions(
        img.naturalWidth, 
        img.naturalHeight,
        options.maxDimensions
      )
      
      canvas.width = workingWidth
      canvas.height = workingHeight
      
      // Draw image at safe resolution
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, workingWidth, workingHeight)
      
      progressCallback?.(25, "Detecting subject...")
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, workingWidth, workingHeight)
      const originalImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        workingWidth,
        workingHeight
      )
      
      progressCallback?.(40, "Removing background...")
      
      // Apply advanced background removal
      const maskData = await this.processBackgroundRemoval(imageData, options, progressCallback)
      
      progressCallback?.(80, "Applying transparency...")
      
      // Apply mask to create transparency
      this.applyMaskToImage(imageData.data, maskData.data, workingWidth, workingHeight)
      ctx.putImageData(imageData, 0, 0)
      
      progressCallback?.(95, "Finalizing...")
      
      // Create final blob
      const processedBlob = await this.canvasToBlob(canvas, "image/png", 0.95)
      
      progressCallback?.(100, "Complete!")
      
      return {
        processedBlob,
        maskData,
        originalImageData
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
    const maxWidth = maxDimensions?.width || 2048
    const maxHeight = maxDimensions?.height || 2048
    const totalPixels = originalWidth * originalHeight
    
    let workingWidth = originalWidth
    let workingHeight = originalHeight
    let needsScaling = false
    
    // Check if image exceeds safe pixel count
    if (totalPixels > this.MAX_SAFE_PIXELS) {
      const scale = Math.sqrt(this.MAX_SAFE_PIXELS / totalPixels)
      workingWidth = Math.floor(originalWidth * scale)
      workingHeight = Math.floor(originalHeight * scale)
      needsScaling = true
    }
    
    // Check if image exceeds max dimensions
    if (workingWidth > maxWidth || workingHeight > maxHeight) {
      const scale = Math.min(maxWidth / workingWidth, maxHeight / workingHeight)
      workingWidth = Math.floor(workingWidth * scale)
      workingHeight = Math.floor(workingHeight * scale)
      needsScaling = true
    }
    
    return { workingWidth, workingHeight, needsScaling }
  }

  private static async processBackgroundRemoval(
    imageData: ImageData,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<ImageData> {
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
        return this.portraitBackgroundRemoval(data, width, height, options, progressCallback)
      case "object":
        return this.objectBackgroundRemoval(data, width, height, options, progressCallback)
      case "precise":
        return this.preciseBackgroundRemoval(data, width, height, options, progressCallback)
      default:
        return this.smartBackgroundRemoval(data, width, height, options, progressCallback)
    }
  }

  private static analyzeImage(data: Uint8ClampedArray, width: number, height: number) {
    let skinPixels = 0
    let edgePixels = 0
    let uniformRegions = 0
    const totalPixels = width * height
    const sampleRate = Math.max(1, Math.floor(totalPixels / 10000)) // Sample for performance
    
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Detect skin tones (improved detection)
      if (this.isSkinTone(r, g, b)) {
        skinPixels++
      }
      
      // Detect edges by checking neighboring pixels
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
      hasPortrait: (skinPixels / sampledPixels) > 0.05,
      hasDistinctObject: (edgePixels / sampledPixels) > 0.15,
      hasUniformBackground: (uniformRegions / sampledPixels) > 0.6
    }
  }

  private static isSkinTone(r: number, g: number, b: number): boolean {
    // Improved skin tone detection
    const rg = r - g
    const rb = r - b
    const gb = g - b
    
    return (
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(rg) > 15 &&
      rg > 0 && rb > 0 && gb >= -10
    ) || (
      // Additional skin tone ranges
      r >= 60 && r <= 255 &&
      g >= 40 && g <= 200 &&
      b >= 20 && b <= 150 &&
      Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
      r > g && r > b
    )
  }

  private static async portraitBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<ImageData> {
    progressCallback?.(60, "Detecting person...")
    
    const mask = new Uint8ClampedArray(width * height * 4)
    
    // Enhanced portrait detection
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) * 0.4
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const maskIdx = idx
        
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        // Distance from center (portraits usually centered)
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        )
        const centerWeight = Math.max(0, 1 - distanceFromCenter / maxRadius)
        
        // Skin tone detection
        const isSkin = this.isSkinTone(r, g, b)
        const skinWeight = isSkin ? 0.8 : 0
        
        // Edge detection for hair and clothing
        const edgeWeight = this.calculateEdgeWeight(data, x, y, width, height)
        
        // Combine weights for portrait detection
        const portraitScore = (centerWeight * 0.4) + (skinWeight * 0.4) + (edgeWeight * 0.2)
        
        // Create mask (255 = keep, 0 = remove)
        const alpha = portraitScore > 0.3 ? 255 : 0
        mask[maskIdx] = alpha
        mask[maskIdx + 1] = alpha
        mask[maskIdx + 2] = alpha
        mask[maskIdx + 3] = 255
      }
    }
    
    progressCallback?.(70, "Refining edges...")
    
    // Apply morphological operations to clean up mask
    this.morphologicalSmoothing(mask, width, height)
    
    return new ImageData(mask, width, height)
  }

  private static async objectBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<ImageData> {
    progressCallback?.(60, "Detecting object boundaries...")
    
    const mask = new Uint8ClampedArray(width * height * 4)
    
    // Enhanced edge-based object detection
    const edges = this.detectEdges(data, width, height)
    const backgroundRegions = this.floodFillBackground(data, edges, width, height)
    
    progressCallback?.(70, "Creating object mask...")
    
    for (let i = 0; i < width * height; i++) {
      const maskIdx = i * 4
      const isBackground = backgroundRegions[i]
      const alpha = isBackground ? 0 : 255
      
      mask[maskIdx] = alpha
      mask[maskIdx + 1] = alpha
      mask[maskIdx + 2] = alpha
      mask[maskIdx + 3] = 255
    }
    
    // Apply edge smoothing
    this.smoothMaskEdges(mask, width, height, options.featherEdges !== false)
    
    return new ImageData(mask, width, height)
  }

  private static async preciseBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<ImageData> {
    progressCallback?.(60, "Precise analysis...")
    
    const mask = new Uint8ClampedArray(width * height * 4)
    const sensitivity = (options.sensitivity || 25) / 100
    
    // Multi-pass background detection
    const backgroundColors = this.sampleBackgroundColors(data, width, height)
    const dominantBg = this.findDominantBackgroundColor(backgroundColors)
    
    progressCallback?.(65, "Creating precise mask...")
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        // Calculate color distance from background
        const colorDistance = Math.sqrt(
          Math.pow(r - dominantBg.r, 2) * 0.3 +
          Math.pow(g - dominantBg.g, 2) * 0.59 +
          Math.pow(b - dominantBg.b, 2) * 0.11
        )
        
        // Normalize distance
        const normalizedDistance = colorDistance / 255
        
        // Apply threshold with sensitivity
        const threshold = 0.15 + (sensitivity * 0.3)
        const alpha = normalizedDistance > threshold ? 255 : 0
        
        mask[idx] = alpha
        mask[idx + 1] = alpha
        mask[idx + 2] = alpha
        mask[idx + 3] = 255
      }
    }
    
    progressCallback?.(75, "Refining mask...")
    
    // Apply advanced mask refinement
    this.refineMaskWithGradients(mask, data, width, height)
    
    return new ImageData(mask, width, height)
  }

  private static async smartBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<ImageData> {
    // Combine multiple techniques for best results
    progressCallback?.(60, "Smart analysis...")
    
    const portraitMask = await this.portraitBackgroundRemoval(data, width, height, options)
    const objectMask = await this.objectBackgroundRemoval(data, width, height, options)
    
    progressCallback?.(70, "Combining results...")
    
    // Combine masks intelligently
    const combinedMask = new Uint8ClampedArray(width * height * 4)
    
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4
      const portraitAlpha = portraitMask.data[idx]
      const objectAlpha = objectMask.data[idx]
      
      // Use the more confident result
      const alpha = Math.max(portraitAlpha, objectAlpha)
      
      combinedMask[idx] = alpha
      combinedMask[idx + 1] = alpha
      combinedMask[idx + 2] = alpha
      combinedMask[idx + 3] = 255
    }
    
    return new ImageData(combinedMask, width, height)
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
    const centerR = data[centerIdx]
    const centerG = data[centerIdx + 1]
    const centerB = data[centerIdx + 2]
    
    let maxGradient = 0
    
    // Check 8-connected neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const neighborIdx = ((y + dy) * width + (x + dx)) * 4
        const gradient = Math.abs(centerR - data[neighborIdx]) +
                        Math.abs(centerG - data[neighborIdx + 1]) +
                        Math.abs(centerB - data[neighborIdx + 2])
        
        maxGradient = Math.max(maxGradient, gradient)
      }
    }
    
    return Math.min(1, maxGradient / 150)
  }

  private static detectEdges(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const edges = new Uint8Array(width * height)
    
    // Sobel edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        
        let gx = 0, gy = 0
        
        // Sobel kernels
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const pixelIdx = ((y + dy) * width + (x + dx)) * 4
            const intensity = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3
            
            // Sobel X kernel: [-1,0,1; -2,0,2; -1,0,1]
            const sobelX = dx * (dy === 0 ? 2 : 1)
            // Sobel Y kernel: [-1,-2,-1; 0,0,0; 1,2,1]  
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
    height: number
  ): Uint8Array {
    const backgroundMask = new Uint8Array(width * height)
    const visited = new Uint8Array(width * height)
    const queue: Array<[number, number]> = []
    
    // Start flood fill from edges
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
      
      if (visited[idx] || edges[idx] > 50) continue
      
      visited[idx] = 1
      backgroundMask[idx] = 1
      
      // Add 4-connected neighbors
      const neighbors = [[x+1,y], [x-1,y], [x,y+1], [x,y-1]]
      neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (!visited[nIdx] && edges[nIdx] <= 50) {
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
    
    // Sample from edges and corners
    const samplePoints = [
      // Corners
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      // Edge midpoints
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
      // Additional edge samples
      [Math.floor(width / 4), 0], [Math.floor(3 * width / 4), 0],
      [0, Math.floor(height / 4)], [0, Math.floor(3 * height / 4)]
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
    // Simple clustering to find dominant color
    const clusters = new Map<string, { color: { r: number; g: number; b: number }; count: number }>()
    
    colors.forEach(color => {
      // Quantize colors to reduce noise
      const quantizedR = Math.floor(color.r / 16) * 16
      const quantizedG = Math.floor(color.g / 16) * 16
      const quantizedB = Math.floor(color.b / 16) * 16
      const key = `${quantizedR}-${quantizedG}-${quantizedB}`
      
      if (clusters.has(key)) {
        clusters.get(key)!.count++
      } else {
        clusters.set(key, { color: { r: quantizedR, g: quantizedG, b: quantizedB }, count: 1 })
      }
    })
    
    let maxCount = 0
    let dominantColor = colors[0]
    
    clusters.forEach(({ color, count }) => {
      if (count > maxCount) {
        maxCount = count
        dominantColor = color
      }
    })
    
    return dominantColor
  }

  private static refineMaskWithGradients(
    mask: Uint8ClampedArray,
    originalData: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const refined = new Uint8ClampedArray(mask)
    
    // Apply gradient-based refinement
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        // Calculate local gradient
        const gradient = this.calculateLocalGradient(originalData, x, y, width, height)
        
        // Adjust mask based on gradient strength
        if (gradient > 30) {
          // Strong edge - likely object boundary
          refined[idx] = Math.max(refined[idx], 200)
        } else if (gradient < 10) {
          // Weak edge - likely uniform region
          const neighborSum = this.getNeighborMaskSum(mask, x, y, width, height)
          refined[idx] = neighborSum > 4 * 128 ? 255 : 0
        }
        
        refined[idx + 1] = refined[idx]
        refined[idx + 2] = refined[idx]
      }
    }
    
    // Copy refined mask back
    for (let i = 0; i < mask.length; i++) {
      mask[i] = refined[i]
    }
  }

  private static calculateLocalGradient(
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
    
    // Check 8-connected neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const neighborIdx = ((y + dy) * width + (x + dx)) * 4
        const neighborIntensity = (data[neighborIdx] + data[neighborIdx + 1] + data[neighborIdx + 2]) / 3
        const gradient = Math.abs(centerIntensity - neighborIntensity)
        
        maxGradient = Math.max(maxGradient, gradient)
      }
    }
    
    return maxGradient
  }

  private static getNeighborMaskSum(
    mask: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    let sum = 0
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          sum += mask[idx]
        }
      }
    }
    
    return sum
  }

  private static morphologicalSmoothing(
    mask: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    // Apply closing (dilation + erosion) to fill holes
    this.dilate(mask, width, height, 2)
    this.erode(mask, width, height, 2)
    
    // Apply opening (erosion + dilation) to remove noise
    this.erode(mask, width, height, 1)
    this.dilate(mask, width, height, 1)
  }

  private static dilate(mask: Uint8ClampedArray, width: number, height: number, radius: number): void {
    const dilated = new Uint8ClampedArray(mask)
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4
        
        let maxValue = 0
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const neighborIdx = ((y + dy) * width + (x + dx)) * 4
            maxValue = Math.max(maxValue, mask[neighborIdx])
          }
        }
        
        dilated[idx] = maxValue
        dilated[idx + 1] = maxValue
        dilated[idx + 2] = maxValue
      }
    }
    
    // Copy back
    for (let i = 0; i < mask.length; i++) {
      mask[i] = dilated[i]
    }
  }

  private static erode(mask: Uint8ClampedArray, width: number, height: number, radius: number): void {
    const eroded = new Uint8ClampedArray(mask)
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4
        
        let minValue = 255
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const neighborIdx = ((y + dy) * width + (x + dx)) * 4
            minValue = Math.min(minValue, mask[neighborIdx])
          }
        }
        
        eroded[idx] = minValue
        eroded[idx + 1] = minValue
        eroded[idx + 2] = minValue
      }
    }
    
    // Copy back
    for (let i = 0; i < mask.length; i++) {
      mask[i] = eroded[i]
    }
  }

  private static smoothMaskEdges(
    mask: Uint8ClampedArray,
    width: number,
    height: number,
    featherEdges: boolean
  ): void {
    if (!featherEdges) return
    
    const smoothed = new Uint8ClampedArray(mask)
    const kernelSize = 3
    const radius = Math.floor(kernelSize / 2)
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4
        
        let sum = 0
        let count = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const neighborIdx = ((y + dy) * width + (x + dx)) * 4
            sum += mask[neighborIdx]
            count++
          }
        }
        
        const average = sum / count
        smoothed[idx] = average
        smoothed[idx + 1] = average
        smoothed[idx + 2] = average
      }
    }
    
    // Copy smoothed data back
    for (let i = 0; i < mask.length; i++) {
      mask[i] = smoothed[i]
    }
  }

  private static applyMaskToImage(
    imageData: Uint8ClampedArray,
    maskData: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4
      const alpha = maskData[idx] // Use red channel as alpha
      imageData[idx + 3] = alpha
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

  static async applyBackground(
    imageBlob: Blob,
    backgroundConfig: BackgroundConfig,
    options: any = {}
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      
      const img = new Image()
      img.onload = () => {
        try {
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          
          // Apply background first
          switch (backgroundConfig.type) {
            case "color":
              ctx.fillStyle = backgroundConfig.value
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              break
              
            case "gradient":
              const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
              gradient.addColorStop(0, "#667eea")
              gradient.addColorStop(1, "#764ba2")
              ctx.fillStyle = gradient
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              break
              
            case "blur":
              // Create blurred version of original
              ctx.filter = `blur(${backgroundConfig.blurAmount || 20}px)`
              ctx.drawImage(img, 0, 0)
              ctx.filter = "none"
              break
              
            default: // transparent
              // No background
              break
          }
          
          // Draw the subject on top
          if (backgroundConfig.type !== "blur") {
            ctx.drawImage(img, 0, 0)
          }
          
          // Apply shadow effect if specified
          if (options.shadowIntensity > 0) {
            ctx.shadowColor = `rgba(0, 0, 0, ${options.shadowIntensity})`
            ctx.shadowBlur = options.shadowOffset * 2
            ctx.shadowOffsetX = options.shadowOffset
            ctx.shadowOffsetY = options.shadowOffset
          }
          
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
      img.src = URL.createObjectURL(imageBlob)
    })
  }
}