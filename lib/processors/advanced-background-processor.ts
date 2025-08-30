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
  private static readonly MAX_SAFE_PIXELS = 1024 * 1024 // Reduced for stability
  
  static async removeBackground(
    file: File, 
    options: BackgroundRemovalOptions = {}
  ): Promise<ProcessingResult> {
    const { progressCallback } = options
    
    try {
      progressCallback?.(5, "Loading image...")
      
      // Strict memory safety checks
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error("Image too large. Please use an image smaller than 10MB.")
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
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, workingWidth, workingHeight)
      
      progressCallback?.(25, "Detecting subject...")
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, workingWidth, workingHeight)
      
      progressCallback?.(40, "Removing background...")
      
      // Apply improved background removal with automatic algorithm selection
      await this.processBackgroundRemovalAuto(imageData, options, progressCallback)
      
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
    const maxWidth = maxDimensions?.width || 1024
    const maxHeight = maxDimensions?.height || 1024
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

  private static async processBackgroundRemovalAuto(
    imageData: ImageData,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<void> {
    const { width, height, data } = imageData
    
    progressCallback?.(45, "Analyzing image structure...")
    
    // Automatic algorithm selection based on image analysis
    const imageAnalysis = this.analyzeImageAdvanced(data, width, height)
    
    progressCallback?.(55, "Applying smart background removal...")
    
    // Use the most effective algorithm based on image content
    if (imageAnalysis.hasPortrait && imageAnalysis.skinToneRatio > 0.05) {
      await this.smartPortraitRemoval(data, width, height, options)
    } else if (imageAnalysis.hasDistinctSubject) {
      await this.smartSubjectRemoval(data, width, height, options)
    } else {
      await this.smartEdgeBasedRemoval(data, width, height, options)
    }
    
    // Always apply post-processing for better results
    progressCallback?.(70, "Refining edges...")
    await this.applyPostProcessing(data, width, height, options)
  }

  private static analyzeImageAdvanced(data: Uint8ClampedArray, width: number, height: number) {
    let skinPixels = 0
    let edgePixels = 0
    let centerSubjectPixels = 0
    let backgroundUniformity = 0
    const totalPixels = width * height
    const sampleRate = Math.max(1, Math.floor(totalPixels / 2000))
    
    // Analyze center region for subject detection
    const centerX = width / 2
    const centerY = height / 2
    const centerRadius = Math.min(width, height) * 0.3
    
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const pixelIndex = i / 4
      const x = pixelIndex % width
      const y = Math.floor(pixelIndex / width)
      
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Detect skin tones with better accuracy
      if (this.isSkinToneAdvanced(r, g, b)) {
        skinPixels++
      }
      
      // Check if pixel is in center region
      const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      if (distanceFromCenter < centerRadius) {
        centerSubjectPixels++
      }
      
      // Detect edges with improved algorithm
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const edgeStrength = this.calculateEdgeStrength(data, x, y, width)
        if (edgeStrength > 25) {
          edgePixels++
        }
      }
      
      // Check background uniformity (edges and corners)
      if (this.isEdgePixel(x, y, width, height)) {
        const neighbors = this.getNeighborColors(data, x, y, width, height)
        const uniformity = this.calculateColorUniformity(neighbors)
        backgroundUniformity += uniformity
      }
    }
    
    const sampledPixels = Math.floor(totalPixels / sampleRate)
    const edgePixelCount = Math.floor(width * 2 + height * 2)
    
    return {
      hasPortrait: (skinPixels / sampledPixels) > 0.02,
      skinToneRatio: skinPixels / sampledPixels,
      hasDistinctSubject: (centerSubjectPixels / sampledPixels) > 0.3,
      edgeComplexity: edgePixels / sampledPixels,
      backgroundUniformity: backgroundUniformity / edgePixelCount,
      isSimpleBackground: backgroundUniformity / edgePixelCount > 0.7
    }
  }

  private static isSkinToneAdvanced(r: number, g: number, b: number): boolean {
    // Improved skin tone detection with better color space analysis
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    
    // Basic skin tone checks
    if (r < 95 || g < 40 || b < 20) return false
    if (r <= g || r <= b) return false
    if (r - g < 15) return false
    
    // Additional checks for better accuracy
    const rg = r - g
    const rb = r - b
    const gb = g - b
    
    // Skin tone typically has specific ratios
    if (rg < 15 || rb < 15) return false
    if (gb < -10 || gb > 20) return false
    
    // Check saturation
    const saturation = (max - min) / max
    if (saturation < 0.2 || saturation > 0.6) return false
    
    return true
  }

  private static calculateEdgeStrength(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number
  ): number {
    const centerIdx = (y * width + x) * 4
    const centerIntensity = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    let maxGradient = 0
    
    // Check 8-connected neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const neighborIdx = ((y + dy) * width + (x + dx)) * 4
        if (neighborIdx >= 0 && neighborIdx < data.length - 3) {
          const neighborIntensity = (data[neighborIdx] + data[neighborIdx + 1] + data[neighborIdx + 2]) / 3
          const gradient = Math.abs(centerIntensity - neighborIntensity)
          maxGradient = Math.max(maxGradient, gradient)
        }
      }
    }
    
    return maxGradient
  }

  private static isEdgePixel(x: number, y: number, width: number, height: number): boolean {
    const margin = Math.min(width, height) * 0.1
    return x < margin || y < margin || x > width - margin || y > height - margin
  }

  private static getNeighborColors(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): Array<{ r: number; g: number; b: number }> {
    const colors = []
    
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          colors.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
          })
        }
      }
    }
    
    return colors
  }

  private static calculateColorUniformity(colors: Array<{ r: number; g: number; b: number }>): number {
    if (colors.length === 0) return 0
    
    const avgR = colors.reduce((sum, c) => sum + c.r, 0) / colors.length
    const avgG = colors.reduce((sum, c) => sum + c.g, 0) / colors.length
    const avgB = colors.reduce((sum, c) => sum + c.b, 0) / colors.length
    
    const variance = colors.reduce((sum, c) => {
      return sum + Math.pow(c.r - avgR, 2) + Math.pow(c.g - avgG, 2) + Math.pow(c.b - avgB, 2)
    }, 0) / colors.length
    
    return Math.max(0, 1 - variance / 10000)
  }

  private static async smartPortraitRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Advanced portrait-specific background removal
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) * 0.4
    
    // Create subject probability map
    const subjectMap = new Float32Array(width * height)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const pixelIdx = y * width + x
        
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        let subjectProbability = 0
        
        // Distance from center (portraits usually centered)
        const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
        const centerWeight = Math.max(0, 1 - distanceFromCenter / maxRadius)
        subjectProbability += centerWeight * 0.4
        
        // Skin tone detection
        if (this.isSkinToneAdvanced(r, g, b)) {
          subjectProbability += 0.8
        }
        
        // Hair detection (dark areas near skin)
        const hairWeight = this.detectHairAdvanced(data, x, y, width, height)
        subjectProbability += hairWeight * 0.6
        
        // Clothing detection (varied colors in center region)
        const clothingWeight = this.detectClothing(data, x, y, width, height, centerX, centerY)
        subjectProbability += clothingWeight * 0.5
        
        // Edge proximity (subjects have more edges)
        const edgeWeight = this.calculateEdgeProximity(data, x, y, width, height)
        subjectProbability += edgeWeight * 0.3
        
        subjectMap[pixelIdx] = Math.min(1, subjectProbability)
      }
    }
    
    // Apply Gaussian blur to smooth the probability map
    this.gaussianBlurFloat32(subjectMap, width, height, 3)
    
    // Apply background removal based on probability
    for (let i = 0; i < width * height; i++) {
      const probability = subjectMap[i]
      const pixelIdx = i * 4
      
      if (probability < 0.3) {
        // Definitely background
        data[pixelIdx + 3] = 0
      } else if (probability < 0.7) {
        // Edge area - apply smooth transition
        const alpha = Math.round((probability - 0.3) / 0.4 * 255)
        data[pixelIdx + 3] = Math.min(data[pixelIdx + 3], alpha)
      }
      // Else keep original alpha (definitely subject)
    }
  }

  private static async smartSubjectRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Advanced subject detection for objects
    const backgroundColors = this.sampleBackgroundColorsAdvanced(data, width, height)
    const dominantBg = this.findDominantBackgroundColor(backgroundColors)
    
    // Create background probability map
    const backgroundMap = new Float32Array(width * height)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const pixelIdx = y * width + x
        
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        // Calculate color similarity to background
        const colorDistance = this.calculatePerceptualDistance(
          { r, g, b },
          dominantBg
        )
        
        // Edge proximity (backgrounds usually have fewer edges)
        const edgeStrength = this.calculateEdgeStrength(data, x, y, width)
        const edgeWeight = 1 - Math.min(1, edgeStrength / 50)
        
        // Position weight (backgrounds more likely at edges)
        const positionWeight = this.calculatePositionWeight(x, y, width, height)
        
        // Texture analysis (backgrounds often more uniform)
        const textureWeight = this.calculateTextureUniformity(data, x, y, width, height)
        
        // Combine weights
        const backgroundProbability = 
          (1 - colorDistance / 150) * 0.4 +
          edgeWeight * 0.2 +
          positionWeight * 0.2 +
          textureWeight * 0.2
        
        backgroundMap[pixelIdx] = Math.max(0, Math.min(1, backgroundProbability))
      }
    }
    
    // Apply Gaussian blur to smooth transitions
    this.gaussianBlurFloat32(backgroundMap, width, height, 2)
    
    // Apply background removal
    for (let i = 0; i < width * height; i++) {
      const backgroundProb = backgroundMap[i]
      const pixelIdx = i * 4
      
      if (backgroundProb > 0.7) {
        // Definitely background
        data[pixelIdx + 3] = 0
      } else if (backgroundProb > 0.3) {
        // Transition area
        const alpha = Math.round((1 - backgroundProb) * 255)
        data[pixelIdx + 3] = Math.min(data[pixelIdx + 3], alpha)
      }
    }
  }

  private static async smartEdgeBasedRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Enhanced edge-based removal for complex images
    const edges = this.detectEdgesAdvanced(data, width, height)
    const backgroundMask = this.floodFillBackgroundAdvanced(data, edges, width, height)
    
    // Apply removal with intelligent feathering
    for (let i = 0; i < width * height; i++) {
      const isBackground = backgroundMask[i]
      const pixelIdx = i * 4
      
      if (isBackground > 0.8) {
        data[pixelIdx + 3] = 0
      } else if (isBackground > 0.3) {
        const alpha = Math.round((1 - isBackground) * 255)
        data[pixelIdx + 3] = Math.min(data[pixelIdx + 3], alpha)
      }
    }
  }

  private static detectHairAdvanced(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    
    // Hair is typically dark and has texture
    const brightness = (r + g + b) / 3
    if (brightness > 100) return 0
    
    // Look for nearby skin tones
    let nearSkin = false
    const searchRadius = 15
    
    for (let dy = -searchRadius; dy <= searchRadius; dy += 3) {
      for (let dx = -searchRadius; dx <= searchRadius; dx += 3) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 4
          if (this.isSkinToneAdvanced(data[nIdx], data[nIdx + 1], data[nIdx + 2])) {
            nearSkin = true
            break
          }
        }
      }
      if (nearSkin) break
    }
    
    return nearSkin && brightness < 80 ? 0.8 : 0
  }

  private static detectClothing(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number,
    centerX: number,
    centerY: number
  ): number {
    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
    const maxDistance = Math.min(width, height) * 0.4
    
    if (distanceFromCenter > maxDistance) return 0
    
    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    
    // Clothing often has consistent colors and is in the center-lower region
    const isInClothingRegion = y > height * 0.4 && distanceFromCenter < maxDistance * 0.8
    
    if (!isInClothingRegion) return 0
    
    // Check for color consistency in local area
    const consistency = this.calculateLocalColorConsistency(data, x, y, width, height)
    
    return consistency * 0.6
  }

  private static calculateEdgeProximity(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    let edgeCount = 0
    const searchRadius = 5
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const edgeStrength = this.calculateEdgeStrength(data, nx, ny, width)
          if (edgeStrength > 30) {
            edgeCount++
          }
        }
      }
    }
    
    const totalChecked = (searchRadius * 2 + 1) ** 2
    return edgeCount / totalChecked
  }

  private static calculatePositionWeight(x: number, y: number, width: number, height: number): number {
    const distanceFromEdge = Math.min(x, y, width - x, height - y)
    const maxDistance = Math.min(width, height) * 0.3
    
    return Math.max(0, 1 - distanceFromEdge / maxDistance)
  }

  private static calculateTextureUniformity(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const colors = this.getNeighborColors(data, x, y, width, height)
    return this.calculateColorUniformity(colors)
  }

  private static calculateLocalColorConsistency(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const radius = 8
    const colors = []
    
    for (let dy = -radius; dy <= radius; dy += 2) {
      for (let dx = -radius; dx <= radius; dx += 2) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          colors.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
          })
        }
      }
    }
    
    return this.calculateColorUniformity(colors)
  }

  private static sampleBackgroundColorsAdvanced(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ r: number; g: number; b: number }> {
    const samples = []
    const margin = Math.min(width, height) * 0.05
    
    // Sample from edges with better coverage
    const samplePoints = []
    
    // Top and bottom edges
    for (let x = 0; x < width; x += Math.floor(width / 20)) {
      samplePoints.push([x, margin])
      samplePoints.push([x, height - margin])
    }
    
    // Left and right edges
    for (let y = 0; y < height; y += Math.floor(height / 20)) {
      samplePoints.push([margin, y])
      samplePoints.push([width - margin, y])
    }
    
    samplePoints.forEach(([x, y]) => {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 4
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
    // K-means clustering to find dominant background color
    const k = 3
    const centroids = []
    
    // Initialize centroids
    for (let i = 0; i < k; i++) {
      centroids.push(colors[Math.floor(Math.random() * colors.length)])
    }
    
    // Perform clustering iterations
    for (let iter = 0; iter < 10; iter++) {
      const clusters: Array<Array<{ r: number; g: number; b: number }>> = Array(k).fill(null).map(() => [])
      
      // Assign colors to nearest centroid
      colors.forEach(color => {
        let minDistance = Infinity
        let bestCluster = 0
        
        centroids.forEach((centroid, index) => {
          const distance = this.calculatePerceptualDistance(color, centroid)
          if (distance < minDistance) {
            minDistance = distance
            bestCluster = index
          }
        })
        
        clusters[bestCluster].push(color)
      })
      
      // Update centroids
      clusters.forEach((cluster, index) => {
        if (cluster.length > 0) {
          centroids[index] = {
            r: Math.round(cluster.reduce((sum, c) => sum + c.r, 0) / cluster.length),
            g: Math.round(cluster.reduce((sum, c) => sum + c.g, 0) / cluster.length),
            b: Math.round(cluster.reduce((sum, c) => sum + c.b, 0) / cluster.length)
          }
        }
      })
    }
    
    // Return the centroid with the most samples (likely background)
    let maxSamples = 0
    let dominantColor = centroids[0]
    
    centroids.forEach(centroid => {
      const samples = colors.filter(color => 
        this.calculatePerceptualDistance(color, centroid) < 30
      ).length
      
      if (samples > maxSamples) {
        maxSamples = samples
        dominantColor = centroid
      }
    })
    
    return dominantColor
  }

  private static calculatePerceptualDistance(
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number }
  ): number {
    // Use perceptual color distance (weighted RGB)
    return Math.sqrt(
      Math.pow(color1.r - color2.r, 2) * 0.3 +
      Math.pow(color1.g - color2.g, 2) * 0.59 +
      Math.pow(color1.b - color2.b, 2) * 0.11
    )
  }

  private static detectEdgesAdvanced(data: Uint8ClampedArray, width: number, height: number): Float32Array {
    const edges = new Float32Array(width * height)
    
    // Sobel edge detection with improved kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        
        let gx = 0, gy = 0
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const pixelIdx = ((y + dy) * width + (x + dx)) * 4
            const intensity = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3
            const kernelIdx = (dy + 1) * 3 + (dx + 1)
            
            gx += intensity * sobelX[kernelIdx]
            gy += intensity * sobelY[kernelIdx]
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        edges[idx] = Math.min(1, magnitude / 255)
      }
    }
    
    return edges
  }

  private static floodFillBackgroundAdvanced(
    data: Uint8ClampedArray,
    edges: Float32Array,
    width: number,
    height: number
  ): Float32Array {
    const backgroundMap = new Float32Array(width * height)
    const visited = new Uint8Array(width * height)
    const queue: Array<[number, number, number]> = [] // x, y, confidence
    
    // Start from multiple edge points with confidence scores
    const startPoints = [
      [0, 0, 1.0], [width - 1, 0, 1.0], [0, height - 1, 1.0], [width - 1, height - 1, 1.0],
      [Math.floor(width / 2), 0, 0.9], [Math.floor(width / 2), height - 1, 0.9],
      [0, Math.floor(height / 2), 0.9], [width - 1, Math.floor(height / 2), 0.9]
    ]
    
    startPoints.forEach(([x, y, confidence]) => {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        queue.push([x, y, confidence])
      }
    })
    
    while (queue.length > 0) {
      const [x, y, confidence] = queue.shift()!
      const idx = y * width + x
      
      if (visited[idx] || edges[idx] > 0.3) continue
      
      visited[idx] = 1
      backgroundMap[idx] = confidence
      
      // Add neighbors with reduced confidence
      const neighbors = [[x+1,y], [x-1,y], [x,y+1], [x,y-1]]
      neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (!visited[nIdx] && edges[nIdx] <= 0.3) {
            const newConfidence = confidence * 0.95
            if (newConfidence > 0.1) {
              queue.push([nx, ny, newConfidence])
            }
          }
        }
      })
    }
    
    return backgroundMap
  }

  private static async applyPostProcessing(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Apply morphological operations to clean up the mask
    this.applyMorphologicalClosing(data, width, height)
    
    // Apply edge smoothing
    if (options.smoothing && options.smoothing > 0) {
      this.applyAdvancedSmoothing(data, width, height, options.smoothing)
    }
    
    // Remove small isolated regions
    this.removeSmallRegions(data, width, height)
  }

  private static applyMorphologicalClosing(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const radius = 2
    const tempAlpha = new Uint8ClampedArray(width * height)
    
    // Extract alpha channel
    for (let i = 0; i < width * height; i++) {
      tempAlpha[i] = data[i * 4 + 3]
    }
    
    // Dilation followed by erosion
    const dilated = new Uint8ClampedArray(tempAlpha)
    const eroded = new Uint8ClampedArray(tempAlpha)
    
    // Dilation
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = y * width + x
        let maxAlpha = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nIdx = (y + dy) * width + (x + dx)
            maxAlpha = Math.max(maxAlpha, tempAlpha[nIdx])
          }
        }
        
        dilated[idx] = maxAlpha
      }
    }
    
    // Erosion
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = y * width + x
        let minAlpha = 255
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nIdx = (y + dy) * width + (x + dx)
            minAlpha = Math.min(minAlpha, dilated[nIdx])
          }
        }
        
        eroded[idx] = minAlpha
      }
    }
    
    // Apply result back to alpha channel
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 3] = eroded[i]
    }
  }

  private static applyAdvancedSmoothing(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    smoothing: number
  ): void {
    const radius = Math.ceil(smoothing / 2)
    const smoothed = new Uint8ClampedArray(width * height)
    
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
              const weight = Math.exp(-distance / (radius * 0.5))
              
              alphaSum += data[nIdx * 4 + 3] * weight
              weightSum += weight
            }
          }
        }
        
        smoothed[idx] = Math.round(alphaSum / weightSum)
      }
    }
    
    // Apply smoothed alpha
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 3] = smoothed[i]
    }
  }

  private static removeSmallRegions(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const visited = new Uint8Array(width * height)
    const minRegionSize = Math.floor(width * height * 0.001) // 0.1% of image
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        if (!visited[idx] && data[pixelIdx + 3] > 0) {
          const regionSize = this.floodFillRegion(data, visited, x, y, width, height)
          
          if (regionSize < minRegionSize) {
            // Remove small region
            this.removeRegion(data, x, y, width, height)
          }
        }
      }
    }
  }

  private static floodFillRegion(
    data: Uint8ClampedArray,
    visited: Uint8Array,
    startX: number,
    startY: number,
    width: number,
    height: number
  ): number {
    const queue = [[startX, startY]]
    let regionSize = 0
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      const idx = y * width + x
      
      if (visited[idx] || data[idx * 4 + 3] === 0) continue
      
      visited[idx] = 1
      regionSize++
      
      // Add 4-connected neighbors
      const neighbors = [[x+1,y], [x-1,y], [x,y+1], [x,y-1]]
      neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (!visited[nIdx] && data[nIdx * 4 + 3] > 0) {
            queue.push([nx, ny])
          }
        }
      })
    }
    
    return regionSize
  }

  private static removeRegion(
    data: Uint8ClampedArray,
    startX: number,
    startY: number,
    width: number,
    height: number
  ): void {
    const queue = [[startX, startY]]
    const visited = new Uint8Array(width * height)
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      const idx = y * width + x
      
      if (visited[idx] || data[idx * 4 + 3] === 0) continue
      
      visited[idx] = 1
      data[idx * 4 + 3] = 0 // Remove pixel
      
      // Add neighbors
      const neighbors = [[x+1,y], [x-1,y], [x,y+1], [x,y-1]]
      neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (!visited[nIdx] && data[nIdx * 4 + 3] > 0) {
            queue.push([nx, ny])
          }
        }
      })
    }
  }

  private static gaussianBlurFloat32(
    data: Float32Array,
    width: number,
    height: number,
    radius: number
  ): void {
    const sigma = radius / 3
    const kernel = []
    let kernelSum = 0
    
    // Create Gaussian kernel
    for (let i = -radius; i <= radius; i++) {
      const value = Math.exp(-(i * i) / (2 * sigma * sigma))
      kernel.push(value)
      kernelSum += value
    }
    
    // Normalize kernel
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] /= kernelSum
    }
    
    const temp = new Float32Array(data)
    
    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        let sum = 0
        
        for (let i = -radius; i <= radius; i++) {
          const nx = Math.max(0, Math.min(width - 1, x + i))
          const nIdx = y * width + nx
          sum += temp[nIdx] * kernel[i + radius]
        }
        
        data[idx] = sum
      }
    }
    
    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        let sum = 0
        
        for (let i = -radius; i <= radius; i++) {
          const ny = Math.max(0, Math.min(height - 1, y + i))
          const nIdx = ny * width + x
          sum += data[nIdx] * kernel[i + radius]
        }
        
        temp[idx] = sum
      }
    }
    
    // Copy back
    for (let i = 0; i < data.length; i++) {
      data[i] = temp[i]
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