// Import the ultimate background processor
import { UltimateBackgroundProcessor, type UltimateBackgroundOptions, type ProcessingResult } from "./ultimate-background-processor"

// Legacy interface for backward compatibility
export interface BackgroundRemovalOptions {
  algorithm?: "auto" | "portrait" | "object" | "animal" | "product" | "general"
  sensitivity?: number
  featherEdges?: boolean
  preserveDetails?: boolean
  smoothing?: number
  outputFormat?: "png" | "webp"
  memoryOptimized?: boolean
  maxDimensions?: { width: number; height: number }
  progressCallback?: (progress: number, stage: string) => void
}

export interface BackgroundRemovalResult {
  processedBlob: Blob
  confidence: number
  processingTime: number
}

export class AdvancedBackgroundProcessor {
  static async removeBackground(
    imageFile: File, 
    options: BackgroundRemovalOptions = {}
  ): Promise<BackgroundRemovalResult> {
    // Convert legacy options to ultimate options
    const ultimateOptions: UltimateBackgroundOptions = {
      primaryModel: options.algorithm || "auto",
      secondaryModel: "edge-detection",
      hybridMode: true,
      enableObjectDetection: true,
      sensitivity: options.sensitivity || 25,
      edgeFeathering: options.featherEdges !== false ? 50 : 0,
      detailPreservation: options.preserveDetails !== false ? 80 : 0,
      smoothingLevel: options.smoothing || 20,
      memoryOptimized: options.memoryOptimized !== false,
      multiPass: true,
      chunkProcessing: true,
      maxDimensions: options.maxDimensions || { width: 2048, height: 2048 },
      outputFormat: options.outputFormat || "png",
      quality: 95,
      progressCallback: options.progressCallback,
      debugMode: false
    }
    
    // Use the ultimate processor
    const result = await UltimateBackgroundProcessor.removeBackground(imageFile, ultimateOptions)
    
    // Convert result to legacy format
    return {
      processedBlob: result.processedBlob,
      confidence: result.confidence,
      processingTime: result.processingTime
    }
  }

  private static async processBackgroundRemoval(
    imageData: ImageData,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    const { data, width, height } = imageData
    const algorithm = options.algorithm || "auto"
    
    options.progressCallback?.(40, "Processing background")
    
    // Select algorithm based on type
    switch (algorithm) {
      case "portrait":
        await this.portraitBackgroundRemoval(data, width, height, options)
        break
      case "object":
        await this.objectBackgroundRemoval(data, width, height, options)
        break
      case "animal":
        await this.animalBackgroundRemoval(data, width, height, options)
        break
      case "product":
        await this.productBackgroundRemoval(data, width, height, options)
        break
      case "general":
        await this.generalBackgroundRemoval(data, width, height, options)
        break
      default:
        await this.improvedAutoBackgroundRemoval(data, width, height, options)
    }
    
    options.progressCallback?.(70, "Refining edges")
    
    // Apply post-processing
    if (options.featherEdges !== false) {
      this.applyAdvancedFeathering(data, width, height)
    }
    
    if (options.smoothing && options.smoothing > 0) {
      this.applyAlphaSmoothing(data, width, height, options.smoothing)
    }
  }

  private static async improvedAutoBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Enhanced auto algorithm with better subject detection
    const analysis = this.analyzeImageContent(data, width, height)
    
    // Multi-algorithm approach for better results
    const masks: Uint8Array[] = []
    
    // 1. Edge-based detection
    const edgeMask = this.createEdgeBasedMask(data, width, height, options.sensitivity || 25)
    masks.push(edgeMask)
    
    // 2. Color clustering
    const colorMask = this.createColorClusteringMask(data, width, height, options.sensitivity || 25)
    masks.push(colorMask)
    
    // 3. Gradient-based detection
    const gradientMask = this.createGradientMask(data, width, height)
    masks.push(gradientMask)
    
    // 4. Texture analysis
    const textureMask = this.createTextureMask(data, width, height)
    masks.push(textureMask)
    
    // Combine masks intelligently
    const finalMask = this.combineMasksIntelligently(masks, width, height, analysis)
    
    // Apply background removal
    this.applyBackgroundMask(data, finalMask, width, height, options)
  }

  private static analyzeImageContent(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): {
    hasPortrait: boolean
    hasObject: boolean
    backgroundComplexity: number
    subjectPosition: { x: number; y: number; width: number; height: number }
    dominantColors: Array<{ r: number; g: number; b: number; frequency: number }>
  } {
    let skinTonePixels = 0
    let totalPixels = 0
    const colorFrequency = new Map<string, number>()
    let centerActivity = 0
    let edgeActivity = 0
    
    // Analyze image characteristics
    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x += 3) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        totalPixels++
        
        // Detect skin tones (improved detection)
        if (this.isSkinTone(r, g, b)) {
          skinTonePixels++
        }
        
        // Track color frequency
        const colorKey = `${Math.floor(r/16)}-${Math.floor(g/16)}-${Math.floor(b/16)}`
        colorFrequency.set(colorKey, (colorFrequency.get(colorKey) || 0) + 1)
        
        // Analyze center vs edge activity
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - width/2, 2) + Math.pow(y - height/2, 2)
        )
        const maxDistance = Math.sqrt(Math.pow(width/2, 2) + Math.pow(height/2, 2))
        
        if (distanceFromCenter < maxDistance * 0.3) {
          centerActivity += this.calculatePixelActivity(data, x, y, width, height)
        } else if (distanceFromCenter > maxDistance * 0.7) {
          edgeActivity += this.calculatePixelActivity(data, x, y, width, height)
        }
      }
    }
    
    // Get dominant colors
    const dominantColors = Array.from(colorFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([colorKey, frequency]) => {
        const [r, g, b] = colorKey.split('-').map(n => parseInt(n) * 16)
        return { r, g, b, frequency: frequency / totalPixels }
      })
    
    // Estimate subject position (center-weighted)
    const subjectPosition = {
      x: Math.floor(width * 0.2),
      y: Math.floor(height * 0.2),
      width: Math.floor(width * 0.6),
      height: Math.floor(height * 0.6)
    }
    
    return {
      hasPortrait: skinTonePixels / totalPixels > 0.02,
      hasObject: centerActivity > edgeActivity * 1.5,
      backgroundComplexity: edgeActivity / totalPixels,
      subjectPosition,
      dominantColors
    }
  }

  private static isSkinTone(r: number, g: number, b: number): boolean {
    // Improved skin tone detection
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    
    // Basic skin tone ranges
    if (r > 95 && g > 40 && b > 20 && 
        max - min > 15 && 
        Math.abs(r - g) > 15 && 
        r > g && r > b) {
      return true
    }
    
    // Additional skin tone ranges for different ethnicities
    if (r > 60 && g > 30 && b > 15 &&
        r >= g && g >= b &&
        r - b > 10) {
      return true
    }
    
    return false
  }

  private static calculatePixelActivity(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) return 0
    
    const centerIdx = (y * width + x) * 4
    let activity = 0
    
    // Calculate gradient magnitude
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const nIdx = ((y + dy) * width + (x + dx)) * 4
        const gradient = Math.abs(data[centerIdx] - data[nIdx]) +
                        Math.abs(data[centerIdx + 1] - data[nIdx + 1]) +
                        Math.abs(data[centerIdx + 2] - data[nIdx + 2])
        activity = Math.max(activity, gradient)
      }
    }
    
    return activity
  }

  private static createEdgeBasedMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    sensitivity: number
  ): Uint8Array {
    const mask = new Uint8Array(width * height)
    const threshold = sensitivity * 2.5
    
    // Enhanced edge detection with multiple operators
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        // Sobel operator
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
        
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        
        // Enhanced edge classification
        if (magnitude > threshold) {
          // Check if this is a subject edge or background edge
          const isSubjectEdge = this.isSubjectEdge(data, x, y, width, height)
          mask[idx] = isSubjectEdge ? 0 : 255 // 0 = keep, 255 = remove
        } else {
          // Low gradient - likely background
          mask[idx] = 255
        }
      }
    }
    
    return mask
  }

  private static isSubjectEdge(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    const centerIdx = (y * width + x) * 4
    const r = data[centerIdx]
    const g = data[centerIdx + 1]
    const b = data[centerIdx + 2]
    
    // Check if pixel is likely part of subject
    // 1. Skin tone detection
    if (this.isSkinTone(r, g, b)) return true
    
    // 2. Clothing colors (darker, more saturated)
    const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
    if (saturation > 0.3 && (r + g + b) / 3 < 200) return true
    
    // 3. Distance from center (subjects usually in center)
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - width/2, 2) + Math.pow(y - height/2, 2)
    )
    const maxDistance = Math.sqrt(Math.pow(width/2, 2) + Math.pow(height/2, 2))
    const centerWeight = 1 - (distanceFromCenter / maxDistance)
    
    if (centerWeight > 0.6) return true
    
    return false
  }

  private static createColorClusteringMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    sensitivity: number
  ): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    // Enhanced K-means clustering for background detection
    const clusters = this.performEnhancedKMeans(data, width, height, 6)
    const backgroundClusters = this.identifyBackgroundClusters(clusters, data, width, height)
    
    const threshold = sensitivity * 3
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Check distance to background clusters
      let minDistance = Infinity
      backgroundClusters.forEach(cluster => {
        const distance = Math.sqrt(
          Math.pow(r - cluster.r, 2) +
          Math.pow(g - cluster.g, 2) +
          Math.pow(b - cluster.b, 2)
        )
        minDistance = Math.min(minDistance, distance)
      })
      
      mask[pixelIdx] = minDistance < threshold ? 255 : 0
    }
    
    return mask
  }

  private static performEnhancedKMeans(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    k: number
  ): Array<{ r: number; g: number; b: number; count: number; variance: number }> {
    const pixels: Array<[number, number, number, number, number]> = [] // r, g, b, x, y
    
    // Smart sampling with position weighting
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4
        pixels.push([data[idx], data[idx + 1], data[idx + 2], x, y])
      }
    }
    
    // Initialize centroids using k-means++
    const centroids: Array<{ r: number; g: number; b: number; count: number; variance: number }> = []
    
    // First centroid - from edge (likely background)
    const edgePixels = pixels.filter(([r, g, b, x, y]) => 
      x < width * 0.1 || x > width * 0.9 || y < height * 0.1 || y > height * 0.9
    )
    const firstPixel = edgePixels[Math.floor(Math.random() * edgePixels.length)] || pixels[0]
    centroids.push({ r: firstPixel[0], g: firstPixel[1], b: firstPixel[2], count: 0, variance: 0 })
    
    // Subsequent centroids - choose farthest from existing
    for (let i = 1; i < k; i++) {
      let maxDistance = 0
      let bestPixel = pixels[0]
      
      pixels.forEach(pixel => {
        let minDistanceToExisting = Infinity
        
        centroids.forEach(centroid => {
          const distance = Math.sqrt(
            Math.pow(pixel[0] - centroid.r, 2) +
            Math.pow(pixel[1] - centroid.g, 2) +
            Math.pow(pixel[2] - centroid.b, 2)
          )
          minDistanceToExisting = Math.min(minDistanceToExisting, distance)
        })
        
        if (minDistanceToExisting > maxDistance) {
          maxDistance = minDistanceToExisting
          bestPixel = pixel
        }
      })
      
      centroids.push({ r: bestPixel[0], g: bestPixel[1], b: bestPixel[2], count: 0, variance: 0 })
    }
    
    // Perform clustering iterations
    for (let iter = 0; iter < 20; iter++) {
      // Reset counts
      centroids.forEach(c => { c.count = 0; c.variance = 0 })
      
      // Assign pixels to nearest centroid
      const assignments = pixels.map(pixel => {
        let minDistance = Infinity
        let assignment = 0
        
        centroids.forEach((centroid, index) => {
          const distance = Math.sqrt(
            Math.pow(pixel[0] - centroid.r, 2) +
            Math.pow(pixel[1] - centroid.g, 2) +
            Math.pow(pixel[2] - centroid.b, 2)
          )
          
          if (distance < minDistance) {
            minDistance = distance
            assignment = index
          }
        })
        
        centroids[assignment].count++
        return assignment
      })
      
      // Update centroids
      const newCentroids = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0, variance: 0 }))
      
      pixels.forEach((pixel, index) => {
        const cluster = assignments[index]
        newCentroids[cluster].r += pixel[0]
        newCentroids[cluster].g += pixel[1]
        newCentroids[cluster].b += pixel[2]
        newCentroids[cluster].count++
      })
      
      // Calculate new positions
      newCentroids.forEach((centroid, index) => {
        if (centroid.count > 0) {
          centroids[index].r = centroid.r / centroid.count
          centroids[index].g = centroid.g / centroid.count
          centroids[index].b = centroid.b / centroid.count
          centroids[index].count = centroid.count
        }
      })
    }
    
    return centroids
  }

  private static identifyBackgroundClusters(
    clusters: Array<{ r: number; g: number; b: number; count: number; variance: number }>,
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ r: number; g: number; b: number }> {
    const backgroundClusters: Array<{ r: number; g: number; b: number }> = []
    
    clusters.forEach(cluster => {
      const score = this.calculateBackgroundScore(cluster, data, width, height)
      
      // Clusters with high background score are likely background
      if (score > 0.6) {
        backgroundClusters.push(cluster)
      }
    })
    
    // Ensure we have at least one background cluster
    if (backgroundClusters.length === 0) {
      // Find cluster with highest edge presence
      let bestScore = 0
      let bestCluster = clusters[0]
      
      clusters.forEach(cluster => {
        const score = this.calculateEdgePresence(cluster, data, width, height)
        if (score > bestScore) {
          bestScore = score
          bestCluster = cluster
        }
      })
      
      backgroundClusters.push(bestCluster)
    }
    
    return backgroundClusters
  }

  private static calculateBackgroundScore(
    cluster: { r: number; g: number; b: number; count: number },
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): number {
    let edgePresence = 0
    let totalEdgePixels = 0
    const threshold = 30
    
    // Check presence in image edges
    const edgePositions = [
      // Top and bottom edges
      ...Array.from({ length: width }, (_, x) => [x, 0]),
      ...Array.from({ length: width }, (_, x) => [x, height - 1]),
      // Left and right edges
      ...Array.from({ length: height }, (_, y) => [0, y]),
      ...Array.from({ length: height }, (_, y) => [width - 1, y])
    ]
    
    edgePositions.forEach(([x, y]) => {
      const idx = (y * width + x) * 4
      const distance = Math.sqrt(
        Math.pow(data[idx] - cluster.r, 2) +
        Math.pow(data[idx + 1] - cluster.g, 2) +
        Math.pow(data[idx + 2] - cluster.b, 2)
      )
      
      if (distance < threshold) edgePresence++
      totalEdgePixels++
    })
    
    const edgeRatio = edgePresence / totalEdgePixels
    const frequency = cluster.count / (width * height)
    const uniformity = 1 / (1 + cluster.variance / 1000)
    
    // Combined score favoring edge presence and uniformity
    return edgeRatio * 0.5 + frequency * 0.3 + uniformity * 0.2
  }

  private static calculateEdgePresence(
    cluster: { r: number; g: number; b: number },
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): number {
    let matches = 0
    let total = 0
    const threshold = 40
    
    // Sample edge pixels
    for (let x = 0; x < width; x += 5) {
      for (const y of [0, height - 1]) {
        const idx = (y * width + x) * 4
        const distance = Math.sqrt(
          Math.pow(data[idx] - cluster.r, 2) +
          Math.pow(data[idx + 1] - cluster.g, 2) +
          Math.pow(data[idx + 2] - cluster.b, 2)
        )
        
        if (distance < threshold) matches++
        total++
      }
    }
    
    for (let y = 0; y < height; y += 5) {
      for (const x of [0, width - 1]) {
        const idx = (y * width + x) * 4
        const distance = Math.sqrt(
          Math.pow(data[idx] - cluster.r, 2) +
          Math.pow(data[idx + 1] - cluster.g, 2) +
          Math.pow(data[idx + 2] - cluster.b, 2)
        )
        
        if (distance < threshold) matches++
        total++
      }
    }
    
    return matches / total
  }

  private static createGradientMask(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    // Create gradient-based mask (backgrounds often have low gradients)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        let maxGradient = 0
        
        // Check 8-connected neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const gradient = Math.abs(data[pixelIdx] - data[nIdx]) +
                           Math.abs(data[pixelIdx + 1] - data[nIdx + 1]) +
                           Math.abs(data[pixelIdx + 2] - data[nIdx + 2])
            maxGradient = Math.max(maxGradient, gradient)
          }
        }
        
        // Low gradient areas are likely background
        mask[idx] = maxGradient < 20 ? 255 : 0
      }
    }
    
    return mask
  }

  private static createTextureMask(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    // Analyze local texture patterns
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = y * width + x
        
        // Calculate local binary pattern
        const centerIdx = idx * 4
        const centerIntensity = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
        
        let pattern = 0
        let bit = 0
        
        // 8-point circular pattern
        const offsets = [
          [-1, -1], [0, -1], [1, -1],
          [1, 0], [1, 1], [0, 1],
          [-1, 1], [-1, 0]
        ]
        
        offsets.forEach(([dx, dy]) => {
          const nIdx = ((y + dy) * width + (x + dx)) * 4
          const neighborIntensity = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
          
          if (neighborIntensity > centerIntensity) {
            pattern |= (1 << bit)
          }
          bit++
        })
        
        // Uniform patterns indicate background
        const uniformPatterns = [0, 255, 15, 240, 51, 204] // Common uniform patterns
        mask[idx] = uniformPatterns.includes(pattern) ? 255 : 0
      }
    }
    
    return mask
  }

  private static combineMasksIntelligently(
    masks: Uint8Array[],
    width: number,
    height: number,
    analysis: any
  ): Uint8Array {
    const combinedMask = new Uint8Array(width * height)
    
    // Weight masks based on image analysis
    const weights = [0.3, 0.25, 0.25, 0.2] // edge, color, gradient, texture
    
    // Adjust weights based on content
    if (analysis.hasPortrait) {
      weights[0] = 0.4 // More weight on edge detection for portraits
      weights[1] = 0.3 // More weight on color clustering
    }
    
    if (analysis.backgroundComplexity > 0.3) {
      weights[2] = 0.35 // More weight on gradient for complex backgrounds
    }
    
    for (let i = 0; i < combinedMask.length; i++) {
      let weightedSum = 0
      let totalWeight = 0
      
      masks.forEach((mask, index) => {
        if (mask && index < weights.length) {
          weightedSum += mask[i] * weights[index]
          totalWeight += weights[index]
        }
      })
      
      combinedMask[i] = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
    }
    
    // Apply morphological operations to clean up mask
    this.applyMorphologicalOperations(combinedMask, width, height)
    
    return combinedMask
  }

  private static applyMorphologicalOperations(
    mask: Uint8Array,
    width: number,
    height: number
  ): void {
    // Apply opening (erosion followed by dilation) to remove noise
    const temp = new Uint8Array(mask)
    
    // Erosion
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        
        let minValue = 255
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = (y + dy) * width + (x + dx)
            minValue = Math.min(minValue, mask[nIdx])
          }
        }
        
        temp[idx] = minValue
      }
    }
    
    // Dilation
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        
        let maxValue = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = (y + dy) * width + (x + dx)
            maxValue = Math.max(maxValue, temp[nIdx])
          }
        }
        
        mask[idx] = maxValue
      }
    }
  }

  private static applyBackgroundMask(
    data: Uint8ClampedArray,
    mask: Uint8Array,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): void {
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const maskValue = mask[pixelIdx]
      
      if (maskValue > 128) {
        // Background pixel - make transparent
        data[i + 3] = 0
      } else {
        // Foreground pixel - preserve or enhance
        if (options.preserveDetails !== false) {
          // Slightly enhance foreground
          data[i + 3] = Math.min(255, data[i + 3] * 1.02)
        }
      }
    }
  }

  private static applyAdvancedFeathering(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const alphaData = new Uint8Array(width * height)
    
    // Extract alpha channel
    for (let i = 0; i < data.length; i += 4) {
      alphaData[Math.floor(i / 4)] = data[i + 3]
    }
    
    // Apply distance transform for smooth edges
    const distanceMap = this.calculateDistanceTransform(alphaData, width, height)
    
    // Apply feathering based on distance
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const distance = distanceMap[pixelIdx]
      
      if (distance < 8) { // Feather within 8 pixels of edge
        const alpha = Math.max(0, Math.min(255, (distance / 8) * 255))
        data[i + 3] = Math.min(data[i + 3], alpha)
      }
    }
  }

  private static calculateDistanceTransform(
    mask: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    const distance = new Uint8Array(width * height)
    
    // Initialize distance map
    for (let i = 0; i < mask.length; i++) {
      distance[i] = mask[i] > 128 ? 0 : 255
    }
    
    // Forward pass
    for (let y = 1; y < height; y++) {
      for (let x = 1; x < width; x++) {
        const idx = y * width + x
        if (distance[idx] > 0) {
          const neighbors = [
            distance[(y-1) * width + (x-1)] + 1.4, // diagonal
            distance[(y-1) * width + x] + 1,       // up
            distance[(y-1) * width + (x+1)] + 1.4, // diagonal
            distance[y * width + (x-1)] + 1        // left
          ]
          distance[idx] = Math.min(distance[idx], ...neighbors)
        }
      }
    }
    
    // Backward pass
    for (let y = height - 2; y >= 0; y--) {
      for (let x = width - 2; x >= 0; x--) {
        const idx = y * width + x
        if (distance[idx] > 0) {
          const neighbors = [
            distance[(y+1) * width + (x+1)] + 1.4, // diagonal
            distance[(y+1) * width + x] + 1,       // down
            distance[(y+1) * width + (x-1)] + 1.4, // diagonal
            distance[y * width + (x+1)] + 1        // right
          ]
          distance[idx] = Math.min(distance[idx], ...neighbors)
        }
      }
    }
    
    return distance
  }

  private static applyAlphaSmoothing(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    smoothing: number
  ): void {
    const smoothedAlpha = new Uint8ClampedArray(width * height)
    const radius = Math.ceil(smoothing / 4)
    
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

  // Specialized algorithms for different content types
  private static async portraitBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Portrait-specific algorithm focusing on skin detection and hair
    const skinMask = this.createSkinMask(data, width, height)
    const hairMask = this.createHairMask(data, width, height)
    const clothingMask = this.createClothingMask(data, width, height)
    
    // Combine portrait-specific masks
    const portraitMask = new Uint8Array(width * height)
    for (let i = 0; i < portraitMask.length; i++) {
      const isSkin = skinMask[i] > 128
      const isHair = hairMask[i] > 128
      const isClothing = clothingMask[i] > 128
      
      portraitMask[i] = (isSkin || isHair || isClothing) ? 0 : 255
    }
    
    this.applyBackgroundMask(data, portraitMask, width, height, options)
  }

  private static createSkinMask(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Enhanced skin tone detection
      if (this.isSkinTone(r, g, b)) {
        mask[pixelIdx] = 255
      }
    }
    
    // Apply morphological operations to clean up skin mask
    this.applyMorphologicalOperations(mask, width, height)
    
    return mask
  }

  private static createHairMask(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Hair detection (typically darker colors with texture)
      const brightness = (r + g + b) / 3
      const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
      
      if (brightness < 120 && saturation < 0.6) {
        // Check for hair texture in surrounding area
        const x = pixelIdx % width
        const y = Math.floor(pixelIdx / width)
        
        if (this.hasHairTexture(data, x, y, width, height)) {
          mask[pixelIdx] = 255
        }
      }
    }
    
    return mask
  }

  private static hasHairTexture(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) return false
    
    let textureVariation = 0
    const centerIdx = (y * width + x) * 4
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    // Check 5x5 neighborhood for texture
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nIdx = ((y + dy) * width + (x + dx)) * 4
        const neighborBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
        textureVariation += Math.abs(centerBrightness - neighborBrightness)
      }
    }
    
    // Hair has moderate texture variation
    return textureVariation > 200 && textureVariation < 800
  }

  private static createClothingMask(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Clothing detection (typically more saturated colors)
      const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
      const brightness = (r + g + b) / 3
      
      // Common clothing color ranges
      if (saturation > 0.2 && brightness > 30 && brightness < 220) {
        const x = pixelIdx % width
        const y = Math.floor(pixelIdx / width)
        
        // Check if in typical clothing area (lower 2/3 of image)
        if (y > height * 0.33) {
          mask[pixelIdx] = 255
        }
      }
    }
    
    return mask
  }

  private static async objectBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Object-specific algorithm focusing on shape and contrast
    const shapeMask = this.createShapeMask(data, width, height)
    const contrastMask = this.createContrastMask(data, width, height, options.sensitivity || 25)
    
    // Combine masks
    const objectMask = new Uint8Array(width * height)
    for (let i = 0; i < objectMask.length; i++) {
      const hasShape = shapeMask[i] > 128
      const hasContrast = contrastMask[i] > 128
      
      objectMask[i] = (hasShape && hasContrast) ? 0 : 255
    }
    
    this.applyBackgroundMask(data, objectMask, width, height, options)
  }

  private static createShapeMask(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    // Detect coherent shapes using connected components
    const visited = new Uint8Array(width * height)
    const components: Array<{ size: number; avgColor: [number, number, number] }> = []
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (visited[idx]) continue
        
        const component = this.floodFillComponent(data, visited, x, y, width, height)
        if (component.size > 100) { // Minimum component size
          components.push(component)
        }
      }
    }
    
    // Mark largest components as foreground
    components.sort((a, b) => b.size - a.size)
    const foregroundComponents = components.slice(0, 3) // Top 3 largest
    
    // Create mask based on foreground components
    for (let i = 0; i < mask.length; i++) {
      mask[i] = 255 // Default to background
    }
    
    // This is a simplified version - in practice you'd need to track which pixels belong to which component
    return mask
  }

  private static floodFillComponent(
    data: Uint8ClampedArray,
    visited: Uint8Array,
    startX: number,
    startY: number,
    width: number,
    height: number
  ): { size: number; avgColor: [number, number, number] } {
    const queue: Array<[number, number]> = [[startX, startY]]
    const startIdx = (startY * width + startX) * 4
    const targetColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2]]
    
    let size = 0
    let totalR = 0, totalG = 0, totalB = 0
    const threshold = 30
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      const idx = y * width + x
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue
      
      const pixelIdx = idx * 4
      const colorDistance = Math.sqrt(
        Math.pow(data[pixelIdx] - targetColor[0], 2) +
        Math.pow(data[pixelIdx + 1] - targetColor[1], 2) +
        Math.pow(data[pixelIdx + 2] - targetColor[2], 2)
      )
      
      if (colorDistance > threshold) continue
      
      visited[idx] = 1
      size++
      totalR += data[pixelIdx]
      totalG += data[pixelIdx + 1]
      totalB += data[pixelIdx + 2]
      
      // Add 4-connected neighbors
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    
    return {
      size,
      avgColor: [
        Math.round(totalR / size),
        Math.round(totalG / size),
        Math.round(totalB / size)
      ]
    }
  }

  private static createContrastMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    sensitivity: number
  ): Uint8Array {
    const mask = new Uint8Array(width * height)
    const threshold = sensitivity * 2
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        let maxContrast = 0
        
        // Calculate local contrast
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const contrast = Math.abs(data[pixelIdx] - data[nIdx]) +
                           Math.abs(data[pixelIdx + 1] - data[nIdx + 1]) +
                           Math.abs(data[pixelIdx + 2] - data[nIdx + 2])
            maxContrast = Math.max(maxContrast, contrast)
          }
        }
        
        mask[idx] = maxContrast > threshold ? 255 : 0
      }
    }
    
    return mask
  }

  private static async animalBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Animal-specific algorithm focusing on fur/texture detection
    const furMask = this.createFurTextureMask(data, width, height)
    const edgeMask = this.createEdgeBasedMask(data, width, height, options.sensitivity || 25)
    
    // Combine masks for animal detection
    const animalMask = new Uint8Array(width * height)
    for (let i = 0; i < animalMask.length; i++) {
      const hasFur = furMask[i] > 128
      const hasEdge = edgeMask[i] < 128 // Inverted for foreground
      
      animalMask[i] = (hasFur || hasEdge) ? 0 : 255
    }
    
    this.applyBackgroundMask(data, animalMask, width, height, options)
  }

  private static createFurTextureMask(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    // Detect fur-like textures
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        // Calculate local texture variance
        let variance = 0
        const centerBrightness = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3
        
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const neighborBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
            variance += Math.pow(centerBrightness - neighborBrightness, 2)
          }
        }
        
        variance /= 25 // 5x5 neighborhood
        
        // Fur has moderate to high texture variance
        mask[idx] = (variance > 100 && variance < 2000) ? 255 : 0
      }
    }
    
    return mask
  }

  private static async productBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // Product-specific algorithm focusing on clean edges and uniform backgrounds
    const uniformityMask = this.createUniformityMask(data, width, height)
    const edgeMask = this.createEdgeBasedMask(data, width, height, options.sensitivity || 25)
    
    // Products typically have clean edges against uniform backgrounds
    const productMask = new Uint8Array(width * height)
    for (let i = 0; i < productMask.length; i++) {
      const isUniform = uniformityMask[i] > 128
      const hasCleanEdge = edgeMask[i] < 128
      
      productMask[i] = (isUniform && !hasCleanEdge) ? 255 : 0
    }
    
    this.applyBackgroundMask(data, productMask, width, height, options)
  }

  private static createUniformityMask(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    for (let y = 3; y < height - 3; y++) {
      for (let x = 3; x < width - 3; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        let uniformity = 0
        const centerColor = [data[pixelIdx], data[pixelIdx + 1], data[pixelIdx + 2]]
        
        // Check 7x7 neighborhood for uniformity
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4
            const distance = Math.sqrt(
              Math.pow(data[nIdx] - centerColor[0], 2) +
              Math.pow(data[nIdx + 1] - centerColor[1], 2) +
              Math.pow(data[nIdx + 2] - centerColor[2], 2)
            )
            
            if (distance < 20) uniformity++
          }
        }
        
        // High uniformity indicates background
        mask[idx] = uniformity > 35 ? 255 : 0 // 35 out of 49 pixels
      }
    }
    
    return mask
  }

  private static async generalBackgroundRemoval(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    // General-purpose algorithm using multiple techniques
    await this.improvedAutoBackgroundRemoval(data, width, height, options)
  }
}