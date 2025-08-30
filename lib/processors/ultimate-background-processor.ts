// Ultimate Background Processor with crash prevention and memory management
export interface UltimateBackgroundOptions {
  primaryModel?: "auto" | "portrait" | "object" | "animal" | "product" | "general"
  secondaryModel?: "edge-detection" | "color-clustering" | "gradient-analysis"
  hybridMode?: boolean
  enableObjectDetection?: boolean
  sensitivity?: number
  edgeFeathering?: number
  detailPreservation?: number
  smoothingLevel?: number
  memoryOptimized?: boolean
  multiPass?: boolean
  chunkProcessing?: boolean
  maxDimensions?: { width: number; height: number }
  outputFormat?: "png" | "webp"
  quality?: number
  progressCallback?: (progress: number, stage: string) => void
  debugMode?: boolean
}

export interface ProcessingResult {
  processedBlob: Blob
  confidence: number
  processingTime: number
  algorithmsUsed: string[]
  finalDimensions: { width: number; height: number }
  memoryUsage: number
}

export class UltimateBackgroundProcessor {
  private static readonly MAX_SAFE_PIXELS = 1536 * 1536 // 2.3MP for stability
  private static readonly MAX_CANVAS_SIZE = 2048
  private static readonly CHUNK_SIZE = 256
  private static readonly MAX_MEMORY_MB = 150

  static async removeBackground(
    imageFile: File,
    options: UltimateBackgroundOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    let memoryUsage = 0

    try {
      // Enhanced safety checks
      if (imageFile.size > 50 * 1024 * 1024) {
        throw new Error(`File too large (${Math.round(imageFile.size / (1024 * 1024))}MB). Maximum 50MB allowed.`)
      }

      options.progressCallback?.(5, "Loading image")
      
      // Load image with memory monitoring
      const { canvas, ctx, originalDimensions } = await this.loadImageSafely(imageFile, options)
      memoryUsage += this.estimateCanvasMemory(canvas)
      
      options.progressCallback?.(15, "Analyzing image content")
      
      // Analyze image for optimal processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const analysis = await this.analyzeImageContent(imageData, options)
      
      options.progressCallback?.(25, "Preparing background removal")
      
      // Create processing plan based on analysis
      const processingPlan = this.createProcessingPlan(analysis, options)
      
      options.progressCallback?.(35, "Processing background")
      
      // Apply background removal with chunked processing
      await this.processBackgroundChunked(imageData, processingPlan, options)
      
      options.progressCallback?.(80, "Applying post-processing")
      
      // Apply post-processing
      await this.applyPostProcessing(imageData, processingPlan, options)
      
      options.progressCallback?.(90, "Creating output")
      
      // Put processed data back to canvas
      ctx.putImageData(imageData, 0, 0)
      
      // Create output blob
      const processedBlob = await this.createOutputBlob(canvas, options)
      
      options.progressCallback?.(100, "Complete")
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(analysis, processingPlan)
      
      // Cleanup
      this.cleanupMemory([canvas])
      
      return {
        processedBlob,
        confidence,
        processingTime: Date.now() - startTime,
        algorithmsUsed: processingPlan.algorithmsUsed,
        finalDimensions: { width: canvas.width, height: canvas.height },
        memoryUsage
      }
    } catch (error) {
      options.progressCallback?.(0, "Error occurred")
      console.error("Background removal failed:", error)
      throw new Error(error instanceof Error ? error.message : "Background removal failed")
    }
  }

  private static async loadImageSafely(
    file: File,
    options: UltimateBackgroundOptions
  ): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; originalDimensions: { width: number; height: number } }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          const originalDimensions = { width: img.naturalWidth, height: img.naturalHeight }
          
          // Calculate safe processing dimensions
          let workingWidth = img.naturalWidth
          let workingHeight = img.naturalHeight
          
          // Apply max dimensions limit
          const maxDim = Math.min(
            options.maxDimensions?.width || this.MAX_CANVAS_SIZE,
            options.maxDimensions?.height || this.MAX_CANVAS_SIZE,
            this.MAX_CANVAS_SIZE
          )
          
          if (workingWidth > maxDim || workingHeight > maxDim) {
            const scale = Math.min(maxDim / workingWidth, maxDim / workingHeight)
            workingWidth = Math.floor(workingWidth * scale)
            workingHeight = Math.floor(workingHeight * scale)
          }
          
          // Check pixel count limit
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

  private static async analyzeImageContent(
    imageData: ImageData,
    options: UltimateBackgroundOptions
  ): Promise<any> {
    const { data, width, height } = imageData
    
    let skinTonePixels = 0
    let edgePixels = 0
    let uniformPixels = 0
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
        
        // Detect skin tones
        if (this.isSkinTone(r, g, b)) {
          skinTonePixels++
        }
        
        // Detect edges
        if (this.isEdgePixel(data, x, y, width, height)) {
          edgePixels++
        }
        
        // Detect uniform areas
        if (this.isUniformArea(data, x, y, width, height)) {
          uniformPixels++
        }
        
        // Track color frequency
        const colorKey = `${Math.floor(r/16)}-${Math.floor(g/16)}-${Math.floor(b/16)}`
        colorFrequency.set(colorKey, (colorFrequency.get(colorKey) || 0) + 1)
      }
    }
    
    return {
      hasPortrait: skinTonePixels / totalSamples > 0.02,
      hasSharpEdges: edgePixels / totalSamples > 0.15,
      backgroundComplexity: uniformPixels / totalSamples,
      dominantColors: this.getDominantColors(colorFrequency, totalSamples),
      contentType: this.determineContentType(skinTonePixels, edgePixels, uniformPixels, totalSamples)
    }
  }

  private static isSkinTone(r: number, g: number, b: number): boolean {
    // Enhanced skin tone detection
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    
    return (r > 95 && g > 40 && b > 20 && 
            max - min > 15 && 
            Math.abs(r - g) > 15 && 
            r > g && r > b) ||
           (r > 60 && g > 30 && b > 15 &&
            r >= g && g >= b &&
            r - b > 10)
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

  private static isUniformArea(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) return false
    
    const centerIdx = (y * width + x) * 4
    const centerColor = [data[centerIdx], data[centerIdx + 1], data[centerIdx + 2]]
    
    let uniformCount = 0
    const totalNeighbors = 25 // 5x5 area
    
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nIdx = ((y + dy) * width + (x + dx)) * 4
        const distance = Math.sqrt(
          Math.pow(data[nIdx] - centerColor[0], 2) +
          Math.pow(data[nIdx + 1] - centerColor[1], 2) +
          Math.pow(data[nIdx + 2] - centerColor[2], 2)
        )
        
        if (distance < 20) uniformCount++
      }
    }
    
    return uniformCount / totalNeighbors > 0.8
  }

  private static getDominantColors(
    colorFrequency: Map<string, number>,
    totalSamples: number
  ): Array<{ r: number; g: number; b: number; frequency: number }> {
    return Array.from(colorFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([colorKey, count]) => {
        const [r, g, b] = colorKey.split('-').map(n => parseInt(n) * 16)
        return { r, g, b, frequency: count / totalSamples }
      })
  }

  private static determineContentType(
    skinTonePixels: number,
    edgePixels: number,
    uniformPixels: number,
    totalSamples: number
  ): string {
    const skinRatio = skinTonePixels / totalSamples
    const edgeRatio = edgePixels / totalSamples
    const uniformRatio = uniformPixels / totalSamples
    
    if (skinRatio > 0.02) return "portrait"
    if (edgeRatio > 0.3 && uniformRatio < 0.2) return "object"
    if (uniformRatio > 0.6) return "product"
    return "general"
  }

  private static createProcessingPlan(analysis: any, options: UltimateBackgroundOptions): any {
    const plan = {
      primaryAlgorithm: options.primaryModel || "auto",
      secondaryAlgorithm: options.secondaryModel || "edge-detection",
      useHybridMode: options.hybridMode !== false,
      chunkSize: options.chunkProcessing ? this.CHUNK_SIZE : 0,
      algorithmsUsed: [] as string[]
    }
    
    // Auto-select algorithm based on analysis
    if (plan.primaryAlgorithm === "auto") {
      if (analysis.hasPortrait) {
        plan.primaryAlgorithm = "portrait"
      } else if (analysis.hasSharpEdges) {
        plan.primaryAlgorithm = "object"
      } else if (analysis.backgroundComplexity > 0.6) {
        plan.primaryAlgorithm = "product"
      } else {
        plan.primaryAlgorithm = "general"
      }
    }
    
    plan.algorithmsUsed.push(plan.primaryAlgorithm)
    if (plan.useHybridMode) {
      plan.algorithmsUsed.push(plan.secondaryAlgorithm)
    }
    
    return plan
  }

  private static async processBackgroundChunked(
    imageData: ImageData,
    plan: any,
    options: UltimateBackgroundOptions
  ): Promise<void> {
    const { data, width, height } = imageData
    const chunkSize = plan.chunkSize || this.CHUNK_SIZE
    
    // Create background mask
    const backgroundMask = new Uint8Array(width * height)
    
    if (chunkSize > 0) {
      // Chunked processing for large images
      const totalChunks = Math.ceil(width / chunkSize) * Math.ceil(height / chunkSize)
      let processedChunks = 0
      
      for (let startY = 0; startY < height; startY += chunkSize) {
        for (let startX = 0; startX < width; startX += chunkSize) {
          const endX = Math.min(startX + chunkSize, width)
          const endY = Math.min(startY + chunkSize, height)
          
          // Process chunk
          await this.processChunk(data, backgroundMask, startX, startY, endX, endY, width, height, plan, options)
          
          processedChunks++
          const progress = 35 + (processedChunks / totalChunks) * 35
          options.progressCallback?.(progress, `Processing chunk ${processedChunks}/${totalChunks}`)
          
          // Memory check
          if (this.checkMemoryUsage() > this.MAX_MEMORY_MB) {
            await this.forceGarbageCollection()
          }
          
          // Allow browser to breathe
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      }
    } else {
      // Process entire image at once (for smaller images)
      await this.processChunk(data, backgroundMask, 0, 0, width, height, width, height, plan, options)
    }
    
    // Apply background removal
    options.progressCallback?.(70, "Applying background removal")
    await this.applyBackgroundRemoval(data, backgroundMask, width, height, options)
  }

  private static async processChunk(
    data: Uint8ClampedArray,
    mask: Uint8Array,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    width: number,
    height: number,
    plan: any,
    options: UltimateBackgroundOptions
  ): Promise<void> {
    const sensitivity = options.sensitivity || 25
    
    // Apply primary algorithm
    switch (plan.primaryAlgorithm) {
      case "portrait":
        await this.processPortraitChunk(data, mask, startX, startY, endX, endY, width, height, sensitivity)
        break
      case "object":
        await this.processObjectChunk(data, mask, startX, startY, endX, endY, width, height, sensitivity)
        break
      case "product":
        await this.processProductChunk(data, mask, startX, startY, endX, endY, width, height, sensitivity)
        break
      default:
        await this.processGeneralChunk(data, mask, startX, startY, endX, endY, width, height, sensitivity)
    }
  }

  private static async processGeneralChunk(
    data: Uint8ClampedArray,
    mask: Uint8Array,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    width: number,
    height: number,
    sensitivity: number
  ): Promise<void> {
    const threshold = sensitivity * 2.5
    
    // Sample background colors from edges
    const backgroundColors = this.sampleBackgroundColors(data, width, height)
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        const r = data[pixelIdx]
        const g = data[pixelIdx + 1]
        const b = data[pixelIdx + 2]
        
        // Calculate minimum distance to background colors
        let minDistance = Infinity
        backgroundColors.forEach(bgColor => {
          const distance = Math.sqrt(
            Math.pow(r - bgColor.r, 2) +
            Math.pow(g - bgColor.g, 2) +
            Math.pow(b - bgColor.b, 2)
          )
          minDistance = Math.min(minDistance, distance)
        })
        
        // Mark as background if close to background colors
        mask[idx] = minDistance < threshold ? 255 : 0
      }
    }
  }

  private static async processPortraitChunk(
    data: Uint8ClampedArray,
    mask: Uint8Array,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    width: number,
    height: number,
    sensitivity: number
  ): Promise<void> {
    // Portrait-specific processing with skin tone detection
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        const r = data[pixelIdx]
        const g = data[pixelIdx + 1]
        const b = data[pixelIdx + 2]
        
        // Check if pixel is skin tone or likely foreground
        const isSkin = this.isSkinTone(r, g, b)
        const isHair = this.isHairColor(r, g, b)
        const isClothing = this.isClothingColor(r, g, b, x, y, width, height)
        
        // Mark as foreground if it's skin, hair, or clothing
        mask[idx] = (isSkin || isHair || isClothing) ? 0 : 255
      }
    }
  }

  private static async processObjectChunk(
    data: Uint8ClampedArray,
    mask: Uint8Array,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    width: number,
    height: number,
    sensitivity: number
  ): Promise<void> {
    // Object-specific processing focusing on center content
    const centerX = width / 2
    const centerY = height / 2
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = y * width + x
        
        // Distance from center (objects usually in center)
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        )
        const centerWeight = 1 - (distanceFromCenter / maxDistance)
        
        // Bias towards keeping center content
        const threshold = sensitivity * (2 + centerWeight)
        
        // Check if pixel is similar to edge colors
        const isBackground = this.isBackgroundPixel(data, x, y, width, height, threshold)
        mask[idx] = isBackground ? 255 : 0
      }
    }
  }

  private static async processProductChunk(
    data: Uint8ClampedArray,
    mask: Uint8Array,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    width: number,
    height: number,
    sensitivity: number
  ): Promise<void> {
    // Product-specific processing for clean backgrounds
    const backgroundColors = this.sampleBackgroundColors(data, width, height)
    const threshold = sensitivity * 2
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        const r = data[pixelIdx]
        const g = data[pixelIdx + 1]
        const b = data[pixelIdx + 2]
        
        // Check uniformity in local area
        const isUniform = this.isUniformArea(data, x, y, width, height)
        
        // Check similarity to background
        let minBgDistance = Infinity
        backgroundColors.forEach(bgColor => {
          const distance = Math.sqrt(
            Math.pow(r - bgColor.r, 2) +
            Math.pow(g - bgColor.g, 2) +
            Math.pow(b - bgColor.b, 2)
          )
          minBgDistance = Math.min(minBgDistance, distance)
        })
        
        // Mark as background if uniform and similar to background
        mask[idx] = (isUniform && minBgDistance < threshold) ? 255 : 0
      }
    }
  }

  private static sampleBackgroundColors(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ r: number; g: number; b: number }> {
    const samples: Array<{ r: number; g: number; b: number }> = []
    
    // Sample from edges
    const samplePoints = [
      // Corners
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      // Edge midpoints
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

  private static isBackgroundPixel(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number,
    threshold: number
  ): boolean {
    const pixelIdx = (y * width + x) * 4
    const r = data[pixelIdx]
    const g = data[pixelIdx + 1]
    const b = data[pixelIdx + 2]
    
    // Check similarity to corner pixels (likely background)
    const corners = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
    ]
    
    let minDistance = Infinity
    corners.forEach(([cx, cy]) => {
      const cornerIdx = (cy * width + cx) * 4
      const distance = Math.sqrt(
        Math.pow(r - data[cornerIdx], 2) +
        Math.pow(g - data[cornerIdx + 1], 2) +
        Math.pow(b - data[cornerIdx + 2], 2)
      )
      minDistance = Math.min(minDistance, distance)
    })
    
    return minDistance < threshold
  }

  private static isHairColor(r: number, g: number, b: number): boolean {
    const brightness = (r + g + b) / 3
    const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
    
    // Hair is typically darker with low saturation
    return brightness < 120 && saturation < 0.6
  }

  private static isClothingColor(r: number, g: number, b: number, x: number, y: number, width: number, height: number): boolean {
    const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
    const brightness = (r + g + b) / 3
    
    // Clothing is typically in lower portion of image with moderate saturation
    const isInClothingArea = y > height * 0.4
    const hasClothingColors = saturation > 0.15 && brightness > 30 && brightness < 220
    
    return isInClothingArea && hasClothingColors
  }

  private static async applyBackgroundRemoval(
    data: Uint8ClampedArray,
    mask: Uint8Array,
    width: number,
    height: number,
    options: UltimateBackgroundOptions
  ): Promise<void> {
    const chunkSize = 512
    let processedPixels = 0
    const totalPixels = width * height
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const maskValue = mask[pixelIdx]
      
      if (maskValue > 128) {
        // Background pixel
        if (options.edgeFeathering && options.edgeFeathering > 0) {
          const featherDistance = this.calculateFeatherDistance(mask, pixelIdx, width, height)
          const alpha = Math.max(0, Math.min(255, featherDistance * 255))
          data[i + 3] = alpha
        } else {
          data[i + 3] = 0
        }
      } else if (options.detailPreservation && options.detailPreservation > 0) {
        // Foreground pixel - enhance slightly
        const enhancement = 1 + (options.detailPreservation / 1000)
        data[i + 3] = Math.min(255, data[i + 3] * enhancement)
      }
      
      processedPixels++
      
      // Update progress periodically
      if (processedPixels % chunkSize === 0) {
        const progress = 70 + (processedPixels / totalPixels) * 10
        options.progressCallback?.(progress, "Removing background")
        
        // Allow browser to breathe
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
  }

  private static calculateFeatherDistance(
    mask: Uint8Array,
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
          if (mask[nIdx] <= 128) {
            const distance = Math.sqrt(dx * dx + dy * dy)
            minDistance = Math.min(minDistance, distance)
          }
        }
      }
    }
    
    return Math.max(0, 1 - minDistance / searchRadius)
  }

  private static async applyPostProcessing(
    imageData: ImageData,
    plan: any,
    options: UltimateBackgroundOptions
  ): Promise<void> {
    const { data, width, height } = imageData
    
    // Apply smoothing if requested
    if (options.smoothingLevel && options.smoothingLevel > 0) {
      await this.applyAlphaSmoothing(data, width, height, options.smoothingLevel)
    }
    
    // Apply detail preservation
    if (options.detailPreservation && options.detailPreservation > 0) {
      await this.enhanceEdgeDetails(data, width, height, options.detailPreservation)
    }
  }

  private static async applyAlphaSmoothing(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    smoothingLevel: number
  ): Promise<void> {
    const smoothedAlpha = new Uint8ClampedArray(width * height)
    const radius = Math.ceil(smoothingLevel / 10)
    
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
    
    // Apply smoothed alpha
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 3] = smoothedAlpha[i]
    }
  }

  private static async enhanceEdgeDetails(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    detailLevel: number
  ): Promise<void> {
    const enhancement = detailLevel / 100
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        // Check if this is an edge pixel
        let isEdge = false
        const centerAlpha = data[idx + 3]
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const neighborAlpha = data[nIdx + 3]
            
            if (Math.abs(centerAlpha - neighborAlpha) > 50) {
              isEdge = true
              break
            }
          }
        }
        
        // Enhance edge details
        if (isEdge && centerAlpha > 0) {
          for (let c = 0; c < 3; c++) {
            const value = data[idx + c]
            const enhanced = value + (value - 128) * enhancement * 0.1
            data[idx + c] = Math.max(0, Math.min(255, enhanced))
          }
        }
      }
    }
  }

  private static calculateConfidence(analysis: any, plan: any): number {
    let confidence = 50 // Base confidence
    
    // Adjust based on content analysis
    if (analysis.hasPortrait && plan.primaryAlgorithm === "portrait") {
      confidence += 20
    }
    
    if (analysis.hasSharpEdges && plan.primaryAlgorithm === "object") {
      confidence += 15
    }
    
    if (analysis.backgroundComplexity > 0.6 && plan.primaryAlgorithm === "product") {
      confidence += 15
    }
    
    // Adjust for hybrid mode
    if (plan.useHybridMode) {
      confidence += 10
    }
    
    return Math.min(95, Math.max(30, confidence))
  }

  private static async createOutputBlob(
    canvas: HTMLCanvasElement,
    options: UltimateBackgroundOptions
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

  private static estimateCanvasMemory(canvas: HTMLCanvasElement): number {
    // Estimate memory usage in MB
    return (canvas.width * canvas.height * 4) / (1024 * 1024)
  }

  private static checkMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / (1024 * 1024)
    }
    return 0
  }

  private static async forceGarbageCollection(): Promise<void> {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }
    
    // Additional cleanup
    const images = document.querySelectorAll('img[src^="blob:"]')
    images.forEach(img => {
      if (img instanceof HTMLImageElement) {
        const src = img.src
        // Only revoke if not currently in use
        if (!document.querySelector(`img[src="${src}"]:not([data-cleanup])`)) {
          URL.revokeObjectURL(src)
        }
      }
    })
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100))
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