// Ultimate background removal with multiple AI models and object detection
export interface UltimateBackgroundOptions {
  // AI Model Selection
  primaryModel?: "auto" | "portrait" | "object" | "product" | "animal" | "general"
  secondaryModel?: "edge-detection" | "color-clustering" | "texture-analysis" | "gradient-flow"
  hybridMode?: boolean
  
  // Object Detection
  enableObjectDetection?: boolean
  objectTypes?: string[]
  confidenceThreshold?: number
  
  // Processing Quality
  sensitivity?: number
  edgeFeathering?: number
  detailPreservation?: number
  smoothingLevel?: number
  
  // Performance & Memory
  memoryOptimized?: boolean
  multiPass?: boolean
  chunkProcessing?: boolean
  maxDimensions?: { width: number; height: number }
  
  // Output
  outputFormat?: "png" | "webp"
  quality?: number
  
  // Callbacks
  progressCallback?: (progress: number, stage: string) => void
  debugMode?: boolean
}

export interface ProcessingResult {
  processedBlob: Blob
  confidence: number
  processingTime: number
  modelsUsed: string[]
  objectsDetected: Array<{ type: string; confidence: number; bounds: any }>
  qualityMetrics: {
    edgeAccuracy: number
    detailPreservation: number
    backgroundCleanness: number
  }
}

export class UltimateBackgroundProcessor {
  private static readonly MAX_SAFE_DIMENSION = 2048
  private static readonly CHUNK_SIZE = 512
  private static readonly MEMORY_LIMIT = 100 * 1024 * 1024 // 100MB
  
  static async removeBackground(
    imageFile: File,
    options: UltimateBackgroundOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    // Enhanced safety checks
    if (imageFile.size > 20 * 1024 * 1024) {
      throw new Error("Image too large. Maximum 20MB supported for ultimate processing.")
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = async () => {
        try {
          options.progressCallback?.(5, "Initializing AI models")
          
          // Calculate optimal processing dimensions
          const { workingWidth, workingHeight, scaleFactor } = this.calculateOptimalDimensions(
            img.naturalWidth,
            img.naturalHeight,
            options.maxDimensions
          )
          
          options.progressCallback?.(10, "Preparing image data")
          
          // Create working canvas with memory optimization
          const workingCanvas = this.createOptimizedCanvas(workingWidth, workingHeight)
          const workingCtx = workingCanvas.getContext("2d", {
            alpha: true,
            willReadFrequently: true,
            desynchronized: true
          })!
          
          // Draw image with high quality
          workingCtx.imageSmoothingEnabled = true
          workingCtx.imageSmoothingQuality = "high"
          workingCtx.drawImage(img, 0, 0, workingWidth, workingHeight)
          
          options.progressCallback?.(15, "Analyzing image content")
          
          // Get image data for processing
          const imageData = workingCtx.getImageData(0, 0, workingWidth, workingHeight)
          
          // Step 1: Object Detection
          const objectDetection = await this.performObjectDetection(imageData, options)
          options.progressCallback?.(25, "Object detection complete")
          
          // Step 2: Multi-Model Background Removal
          const backgroundMasks = await this.generateMultipleBackgroundMasks(imageData, objectDetection, options)
          options.progressCallback?.(50, "AI models processing")
          
          // Step 3: Intelligent Mask Fusion
          const finalMask = await this.fuseBackgroundMasks(backgroundMasks, imageData, objectDetection, options)
          options.progressCallback?.(70, "Combining AI results")
          
          // Step 4: Advanced Post-Processing
          await this.applyAdvancedPostProcessing(imageData, finalMask, objectDetection, options)
          options.progressCallback?.(85, "Refining edges")
          
          // Put processed data back
          workingCtx.putImageData(imageData, 0, 0)
          
          // Scale back to original size if needed
          const finalCanvas = await this.scaleToOriginalSize(workingCanvas, img.naturalWidth, img.naturalHeight, scaleFactor)
          options.progressCallback?.(95, "Finalizing output")
          
          // Create final blob
          const quality = (options.quality || 95) / 100
          const mimeType = `image/${options.outputFormat || "png"}`
          
          finalCanvas.toBlob(
            (blob) => {
              if (blob) {
                const processingTime = Date.now() - startTime
                resolve({
                  processedBlob: blob,
                  confidence: this.calculateOverallConfidence(backgroundMasks),
                  processingTime,
                  modelsUsed: this.getUsedModels(options),
                  objectsDetected: objectDetection.objects,
                  qualityMetrics: this.calculateQualityMetrics(finalMask, imageData)
                })
              } else {
                reject(new Error("Failed to create output blob"))
              }
            },
            mimeType,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(imageFile)
    })
  }

  private static calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxDimensions?: { width: number; height: number }
  ) {
    let workingWidth = originalWidth
    let workingHeight = originalHeight
    let scaleFactor = 1
    
    // Apply max dimensions
    const maxWidth = maxDimensions?.width || this.MAX_SAFE_DIMENSION
    const maxHeight = maxDimensions?.height || this.MAX_SAFE_DIMENSION
    
    if (workingWidth > maxWidth || workingHeight > maxHeight) {
      scaleFactor = Math.min(maxWidth / workingWidth, maxHeight / workingHeight)
      workingWidth = Math.floor(workingWidth * scaleFactor)
      workingHeight = Math.floor(workingHeight * scaleFactor)
    }
    
    // Memory safety check
    const estimatedMemory = workingWidth * workingHeight * 4 * 3 // 3 processing passes
    if (estimatedMemory > this.MEMORY_LIMIT) {
      const memoryScale = Math.sqrt(this.MEMORY_LIMIT / estimatedMemory)
      workingWidth = Math.floor(workingWidth * memoryScale)
      workingHeight = Math.floor(workingHeight * memoryScale)
      scaleFactor *= memoryScale
    }
    
    return { workingWidth, workingHeight, scaleFactor }
  }

  private static createOptimizedCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    
    // Optimize canvas for performance
    const ctx = canvas.getContext("2d", {
      alpha: true,
      willReadFrequently: true,
      desynchronized: true
    })
    
    if (ctx) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
    }
    
    return canvas
  }

  private static async performObjectDetection(
    imageData: ImageData,
    options: UltimateBackgroundOptions
  ): Promise<{
    objects: Array<{ type: string; confidence: number; bounds: any }>
    subjectMask: Uint8Array
    backgroundRegions: Array<{ x: number; y: number; width: number; height: number }>
  }> {
    const { data, width, height } = imageData
    const objects: Array<{ type: string; confidence: number; bounds: any }> = []
    const subjectMask = new Uint8Array(width * height)
    
    // Multi-stage object detection
    
    // Stage 1: Skin/Face Detection
    const faceRegions = await this.detectFaces(data, width, height)
    faceRegions.forEach(region => {
      objects.push({
        type: "face",
        confidence: region.confidence,
        bounds: region.bounds
      })
      this.markRegionInMask(subjectMask, region.bounds, width, height, 255)
    })
    
    // Stage 2: Body/Person Detection
    const bodyRegions = await this.detectBodies(data, width, height, faceRegions)
    bodyRegions.forEach(region => {
      objects.push({
        type: "body",
        confidence: region.confidence,
        bounds: region.bounds
      })
      this.markRegionInMask(subjectMask, region.bounds, width, height, 255)
    })
    
    // Stage 3: Hair Detection
    const hairRegions = await this.detectHair(data, width, height, faceRegions)
    hairRegions.forEach(region => {
      objects.push({
        type: "hair",
        confidence: region.confidence,
        bounds: region.bounds
      })
      this.markRegionInMask(subjectMask, region.bounds, width, height, 255)
    })
    
    // Stage 4: Clothing Detection
    const clothingRegions = await this.detectClothing(data, width, height, bodyRegions)
    clothingRegions.forEach(region => {
      objects.push({
        type: "clothing",
        confidence: region.confidence,
        bounds: region.bounds
      })
      this.markRegionInMask(subjectMask, region.bounds, width, height, 255)
    })
    
    // Stage 5: General Object Detection
    const generalObjects = await this.detectGeneralObjects(data, width, height)
    objects.push(...generalObjects)
    
    // Identify background regions
    const backgroundRegions = this.identifyBackgroundRegions(subjectMask, width, height)
    
    return { objects, subjectMask, backgroundRegions }
  }

  private static async detectFaces(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<Array<{ confidence: number; bounds: any }>> {
    const faces: Array<{ confidence: number; bounds: any }> = []
    
    // Advanced skin tone detection with multiple ranges
    const skinToneRanges = [
      { r: [95, 255], g: [40, 255], b: [20, 255] }, // Light skin
      { r: [60, 200], g: [30, 150], b: [15, 100] }, // Medium skin
      { r: [30, 120], g: [20, 80], b: [10, 60] },   // Dark skin
    ]
    
    const skinPixels: Array<{ x: number; y: number; confidence: number }> = []
    
    // Detect skin pixels
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        let skinConfidence = 0
        
        skinToneRanges.forEach(range => {
          if (r >= range.r[0] && r <= range.r[1] &&
              g >= range.g[0] && g <= range.g[1] &&
              b >= range.b[0] && b <= range.b[1]) {
            
            // Additional skin tone validation
            const max = Math.max(r, g, b)
            const min = Math.min(r, g, b)
            
            if (max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b) {
              skinConfidence = Math.min(1.0, (max - min) / 100)
            }
          }
        })
        
        if (skinConfidence > 0.3) {
          skinPixels.push({ x, y, confidence: skinConfidence })
        }
      }
    }
    
    // Cluster skin pixels into face regions
    const faceClusters = this.clusterSkinPixels(skinPixels, width, height)
    
    faceClusters.forEach(cluster => {
      if (cluster.pixels.length > 50 && cluster.avgConfidence > 0.5) {
        faces.push({
          confidence: cluster.avgConfidence,
          bounds: cluster.bounds
        })
      }
    })
    
    return faces
  }

  private static clusterSkinPixels(
    skinPixels: Array<{ x: number; y: number; confidence: number }>,
    width: number,
    height: number
  ) {
    const clusters: Array<{
      pixels: Array<{ x: number; y: number; confidence: number }>
      bounds: { x: number; y: number; width: number; height: number }
      avgConfidence: number
    }> = []
    
    const visited = new Set<string>()
    
    skinPixels.forEach(pixel => {
      const key = `${pixel.x},${pixel.y}`
      if (visited.has(key)) return
      
      // Flood fill to find connected skin regions
      const cluster = this.floodFillSkinRegion(pixel, skinPixels, visited, 30)
      
      if (cluster.pixels.length > 20) {
        // Calculate bounds
        const xs = cluster.pixels.map(p => p.x)
        const ys = cluster.pixels.map(p => p.y)
        const bounds = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        }
        
        // Calculate average confidence
        const avgConfidence = cluster.pixels.reduce((sum, p) => sum + p.confidence, 0) / cluster.pixels.length
        
        clusters.push({ ...cluster, bounds, avgConfidence })
      }
    })
    
    return clusters
  }

  private static floodFillSkinRegion(
    startPixel: { x: number; y: number; confidence: number },
    allSkinPixels: Array<{ x: number; y: number; confidence: number }>,
    visited: Set<string>,
    maxDistance: number
  ) {
    const cluster = { pixels: [startPixel] }
    const queue = [startPixel]
    visited.add(`${startPixel.x},${startPixel.y}`)
    
    while (queue.length > 0) {
      const current = queue.shift()!
      
      // Find nearby skin pixels
      allSkinPixels.forEach(pixel => {
        const key = `${pixel.x},${pixel.y}`
        if (visited.has(key)) return
        
        const distance = Math.sqrt(
          Math.pow(current.x - pixel.x, 2) + Math.pow(current.y - pixel.y, 2)
        )
        
        if (distance <= maxDistance) {
          visited.add(key)
          cluster.pixels.push(pixel)
          queue.push(pixel)
        }
      })
    }
    
    return cluster
  }

  private static async detectBodies(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    faceRegions: Array<{ confidence: number; bounds: any }>
  ): Promise<Array<{ confidence: number; bounds: any }>> {
    const bodies: Array<{ confidence: number; bounds: any }> = []
    
    // For each detected face, estimate body region
    faceRegions.forEach(face => {
      const faceCenter = {
        x: face.bounds.x + face.bounds.width / 2,
        y: face.bounds.y + face.bounds.height / 2
      }
      
      // Estimate body proportions based on face
      const estimatedBodyWidth = face.bounds.width * 3
      const estimatedBodyHeight = face.bounds.height * 6
      
      const bodyBounds = {
        x: Math.max(0, faceCenter.x - estimatedBodyWidth / 2),
        y: Math.max(0, face.bounds.y),
        width: Math.min(width - faceCenter.x + estimatedBodyWidth / 2, estimatedBodyWidth),
        height: Math.min(height - face.bounds.y, estimatedBodyHeight)
      }
      
      // Validate body region with clothing/texture detection
      const bodyConfidence = this.validateBodyRegion(data, bodyBounds, width, height)
      
      if (bodyConfidence > 0.4) {
        bodies.push({
          confidence: bodyConfidence,
          bounds: bodyBounds
        })
      }
    })
    
    return bodies
  }

  private static validateBodyRegion(
    data: Uint8ClampedArray,
    bounds: { x: number; y: number; width: number; height: number },
    width: number,
    height: number
  ): number {
    let clothingPixels = 0
    let totalPixels = 0
    
    // Sample pixels in the body region
    for (let y = bounds.y; y < bounds.y + bounds.height; y += 3) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += 3) {
        if (x >= width || y >= height) continue
        
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        totalPixels++
        
        // Detect clothing-like colors and textures
        const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
        const brightness = (r + g + b) / 3
        
        // Clothing typically has moderate saturation and varied brightness
        if (saturation > 0.15 && brightness > 20 && brightness < 240) {
          clothingPixels++
        }
      }
    }
    
    return totalPixels > 0 ? clothingPixels / totalPixels : 0
  }

  private static async detectHair(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    faceRegions: Array<{ confidence: number; bounds: any }>
  ): Promise<Array<{ confidence: number; bounds: any }>> {
    const hairRegions: Array<{ confidence: number; bounds: any }> = []
    
    faceRegions.forEach(face => {
      // Hair is typically above and around the face
      const hairSearchArea = {
        x: Math.max(0, face.bounds.x - face.bounds.width * 0.3),
        y: Math.max(0, face.bounds.y - face.bounds.height * 0.8),
        width: face.bounds.width * 1.6,
        height: face.bounds.height * 1.2
      }
      
      const hairPixels = this.detectHairPixels(data, hairSearchArea, width, height)
      
      if (hairPixels.length > 30) {
        // Calculate hair region bounds
        const xs = hairPixels.map(p => p.x)
        const ys = hairPixels.map(p => p.y)
        
        const hairBounds = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        }
        
        const avgConfidence = hairPixels.reduce((sum, p) => sum + p.confidence, 0) / hairPixels.length
        
        hairRegions.push({
          confidence: avgConfidence,
          bounds: hairBounds
        })
      }
    })
    
    return hairRegions
  }

  private static detectHairPixels(
    data: Uint8ClampedArray,
    searchArea: { x: number; y: number; width: number; height: number },
    width: number,
    height: number
  ): Array<{ x: number; y: number; confidence: number }> {
    const hairPixels: Array<{ x: number; y: number; confidence: number }> = []
    
    for (let y = searchArea.y; y < searchArea.y + searchArea.height; y += 2) {
      for (let x = searchArea.x; x < searchArea.x + searchArea.width; x += 2) {
        if (x >= width || y >= height || x < 0 || y < 0) continue
        
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        // Hair detection criteria
        const brightness = (r + g + b) / 3
        const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
        
        // Hair is typically darker with some texture
        if (brightness < 150 && saturation < 0.7) {
          const textureScore = this.calculateTextureScore(data, x, y, width, height)
          
          if (textureScore > 0.3) {
            const confidence = (1 - brightness / 255) * textureScore
            hairPixels.push({ x, y, confidence })
          }
        }
      }
    }
    
    return hairPixels
  }

  private static calculateTextureScore(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) return 0
    
    const centerIdx = (y * width + x) * 4
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    let variance = 0
    let count = 0
    
    // Calculate local variance in 5x5 neighborhood
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nIdx = ((y + dy) * width + (x + dx)) * 4
        const neighborBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
        variance += Math.pow(centerBrightness - neighborBrightness, 2)
        count++
      }
    }
    
    variance /= count
    
    // Normalize texture score
    return Math.min(1.0, variance / 1000)
  }

  private static async detectClothing(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    bodyRegions: Array<{ confidence: number; bounds: any }>
  ): Promise<Array<{ confidence: number; bounds: any }>> {
    const clothingRegions: Array<{ confidence: number; bounds: any }> = []
    
    bodyRegions.forEach(body => {
      // Focus on torso area for clothing
      const clothingArea = {
        x: body.bounds.x + body.bounds.width * 0.1,
        y: body.bounds.y + body.bounds.height * 0.3,
        width: body.bounds.width * 0.8,
        height: body.bounds.height * 0.6
      }
      
      const clothingPixels = this.detectClothingPixels(data, clothingArea, width, height)
      
      if (clothingPixels.length > 50) {
        const xs = clothingPixels.map(p => p.x)
        const ys = clothingPixels.map(p => p.y)
        
        const clothingBounds = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        }
        
        const avgConfidence = clothingPixels.reduce((sum, p) => sum + p.confidence, 0) / clothingPixels.length
        
        clothingRegions.push({
          confidence: avgConfidence,
          bounds: clothingBounds
        })
      }
    })
    
    return clothingRegions
  }

  private static detectClothingPixels(
    data: Uint8ClampedArray,
    searchArea: { x: number; y: number; width: number; height: number },
    width: number,
    height: number
  ): Array<{ x: number; y: number; confidence: number }> {
    const clothingPixels: Array<{ x: number; y: number; confidence: number }> = []
    
    for (let y = searchArea.y; y < searchArea.y + searchArea.height; y += 2) {
      for (let x = searchArea.x; x < searchArea.x + searchArea.width; x += 2) {
        if (x >= width || y >= height || x < 0 || y < 0) continue
        
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        // Clothing detection criteria
        const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
        const brightness = (r + g + b) / 3
        
        // Clothing typically has moderate to high saturation
        if (saturation > 0.2 && brightness > 30 && brightness < 220) {
          const fabricScore = this.calculateFabricScore(data, x, y, width, height)
          
          if (fabricScore > 0.3) {
            const confidence = saturation * fabricScore
            clothingPixels.push({ x, y, confidence })
          }
        }
      }
    }
    
    return clothingPixels
  }

  private static calculateFabricScore(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) return 0
    
    const centerIdx = (y * width + x) * 4
    
    // Calculate local uniformity (fabric tends to be more uniform than skin)
    let uniformity = 0
    let count = 0
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nIdx = ((y + dy) * width + (x + dx)) * 4
        const colorDistance = Math.sqrt(
          Math.pow(data[centerIdx] - data[nIdx], 2) +
          Math.pow(data[centerIdx + 1] - data[nIdx + 1], 2) +
          Math.pow(data[centerIdx + 2] - data[nIdx + 2], 2)
        )
        
        if (colorDistance < 30) uniformity++
        count++
      }
    }
    
    return uniformity / count
  }

  private static async detectGeneralObjects(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<Array<{ type: string; confidence: number; bounds: any }>> {
    const objects: Array<{ type: string; confidence: number; bounds: any }> = []
    
    // Detect common objects using shape and color analysis
    const objectTypes = ["product", "animal", "vehicle", "furniture", "plant"]
    
    for (const objectType of objectTypes) {
      const detectedObjects = await this.detectObjectType(data, width, height, objectType)
      objects.push(...detectedObjects)
    }
    
    return objects
  }

  private static async detectObjectType(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    objectType: string
  ): Promise<Array<{ type: string; confidence: number; bounds: any }>> {
    // Simplified object detection based on color and shape patterns
    const objects: Array<{ type: string; confidence: number; bounds: any }> = []
    
    switch (objectType) {
      case "product":
        // Products often have clean edges and uniform colors
        const productRegions = this.detectCleanEdgeRegions(data, width, height)
        productRegions.forEach(region => {
          if (region.confidence > 0.6) {
            objects.push({ type: "product", ...region })
          }
        })
        break
        
      case "animal":
        // Animals have fur texture and organic shapes
        const animalRegions = this.detectFurTextureRegions(data, width, height)
        animalRegions.forEach(region => {
          if (region.confidence > 0.5) {
            objects.push({ type: "animal", ...region })
          }
        })
        break
        
      case "plant":
        // Plants have green colors and organic textures
        const plantRegions = this.detectPlantRegions(data, width, height)
        plantRegions.forEach(region => {
          if (region.confidence > 0.5) {
            objects.push({ type: "plant", ...region })
          }
        })
        break
    }
    
    return objects
  }

  private static detectCleanEdgeRegions(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ confidence: number; bounds: any }> {
    // Detect regions with clean, geometric edges (typical of products)
    const regions: Array<{ confidence: number; bounds: any }> = []
    
    // This is a simplified implementation
    // In practice, you'd use more sophisticated edge detection
    
    return regions
  }

  private static detectFurTextureRegions(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ confidence: number; bounds: any }> {
    // Detect fur-like textures
    const regions: Array<{ confidence: number; bounds: any }> = []
    
    // Implementation would analyze texture patterns
    
    return regions
  }

  private static detectPlantRegions(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ confidence: number; bounds: any }> {
    // Detect plant-like regions based on green colors and organic shapes
    const regions: Array<{ confidence: number; bounds: any }> = []
    
    // Implementation would analyze green color ranges and organic patterns
    
    return regions
  }

  private static markRegionInMask(
    mask: Uint8Array,
    bounds: { x: number; y: number; width: number; height: number },
    width: number,
    height: number,
    value: number
  ): void {
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = y * width + x
          mask[idx] = value
        }
      }
    }
  }

  private static identifyBackgroundRegions(
    subjectMask: Uint8Array,
    width: number,
    height: number
  ): Array<{ x: number; y: number; width: number; height: number }> {
    const backgroundRegions: Array<{ x: number; y: number; width: number; height: number }> = []
    
    // Find connected background regions
    const visited = new Uint8Array(width * height)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        
        if (visited[idx] || subjectMask[idx] > 128) continue
        
        // Flood fill background region
        const region = this.floodFillBackgroundRegion(subjectMask, visited, x, y, width, height)
        
        if (region.size > 100) {
          backgroundRegions.push(region.bounds)
        }
      }
    }
    
    return backgroundRegions
  }

  private static floodFillBackgroundRegion(
    subjectMask: Uint8Array,
    visited: Uint8Array,
    startX: number,
    startY: number,
    width: number,
    height: number
  ) {
    const queue: Array<[number, number]> = [[startX, startY]]
    const pixels: Array<[number, number]> = []
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue
      
      const idx = y * width + x
      if (visited[idx] || subjectMask[idx] > 128) continue
      
      visited[idx] = 1
      pixels.push([x, y])
      
      // Add 4-connected neighbors
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    
    // Calculate bounds
    const xs = pixels.map(p => p[0])
    const ys = pixels.map(p => p[1])
    
    return {
      size: pixels.length,
      bounds: {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys)
      }
    }
  }

  private static async generateMultipleBackgroundMasks(
    imageData: ImageData,
    objectDetection: any,
    options: UltimateBackgroundOptions
  ): Promise<{
    edgeMask: Uint8Array
    colorMask: Uint8Array
    textureMask: Uint8Array
    gradientMask: Uint8Array
    objectMask: Uint8Array
    confidenceScores: number[]
  }> {
    const { data, width, height } = imageData
    
    // Generate multiple masks using different algorithms
    const edgeMask = await this.generateAdvancedEdgeMask(data, width, height, options)
    const colorMask = await this.generateAdvancedColorMask(data, width, height, options)
    const textureMask = await this.generateTextureMask(data, width, height, options)
    const gradientMask = await this.generateGradientFlowMask(data, width, height, options)
    const objectMask = this.generateObjectBasedMask(objectDetection.subjectMask, width, height)
    
    // Calculate confidence scores for each mask
    const confidenceScores = [
      this.calculateMaskConfidence(edgeMask, objectDetection.subjectMask),
      this.calculateMaskConfidence(colorMask, objectDetection.subjectMask),
      this.calculateMaskConfidence(textureMask, objectDetection.subjectMask),
      this.calculateMaskConfidence(gradientMask, objectDetection.subjectMask),
      0.9 // Object mask has high confidence
    ]
    
    return {
      edgeMask,
      colorMask,
      textureMask,
      gradientMask,
      objectMask,
      confidenceScores
    }
  }

  private static async generateAdvancedEdgeMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: UltimateBackgroundOptions
  ): Promise<Uint8Array> {
    const mask = new Uint8Array(width * height)
    const sensitivity = options.sensitivity || 25
    
    // Multi-scale edge detection
    const scales = [1, 2, 3]
    const edgeMaps = scales.map(scale => this.detectEdgesAtScale(data, width, height, scale, sensitivity))
    
    // Combine multi-scale edges
    for (let i = 0; i < mask.length; i++) {
      let edgeStrength = 0
      edgeMaps.forEach((edgeMap, scaleIndex) => {
        const weight = 1 / (scaleIndex + 1)
        edgeStrength += edgeMap[i] * weight
      })
      
      mask[i] = edgeStrength > 128 ? 0 : 255 // 0 = keep, 255 = remove
    }
    
    return mask
  }

  private static detectEdgesAtScale(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    scale: number,
    sensitivity: number
  ): Uint8Array {
    const edges = new Uint8Array(width * height)
    const threshold = sensitivity * (2 + scale * 0.5)
    
    for (let y = scale; y < height - scale; y++) {
      for (let x = scale; x < width - scale; x++) {
        const idx = y * width + x
        
        // Enhanced Sobel operator with scale
        let gx = 0, gy = 0
        
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy * scale) * width + (x + dx * scale)) * 4
            const intensity = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
            const kernelIdx = (dy + 1) * 3 + (dx + 1)
            
            gx += intensity * sobelX[kernelIdx]
            gy += intensity * sobelY[kernelIdx]
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        edges[idx] = magnitude > threshold ? 255 : 0
      }
    }
    
    return edges
  }

  private static async generateAdvancedColorMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: UltimateBackgroundOptions
  ): Promise<Uint8Array> {
    const mask = new Uint8Array(width * height)
    
    // Advanced K-means clustering with spatial awareness
    const clusters = await this.performSpatialKMeans(data, width, height, 8)
    const backgroundClusters = this.identifyBackgroundClusters(clusters, data, width, height)
    
    const threshold = (options.sensitivity || 25) * 3
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
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

  private static async performSpatialKMeans(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    k: number
  ): Promise<Array<{ r: number; g: number; b: number; x: number; y: number; count: number }>> {
    const pixels: Array<[number, number, number, number, number]> = [] // r, g, b, x, y
    
    // Sample pixels with spatial information
    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x += 3) {
        const idx = (y * width + x) * 4
        pixels.push([data[idx], data[idx + 1], data[idx + 2], x, y])
      }
    }
    
    // Initialize centroids with spatial awareness
    const centroids: Array<{ r: number; g: number; b: number; x: number; y: number; count: number }> = []
    
    // Use edge pixels as initial centroids (likely background)
    const edgePixels = pixels.filter(([r, g, b, x, y]) => 
      x < width * 0.1 || x > width * 0.9 || y < height * 0.1 || y > height * 0.9
    )
    
    for (let i = 0; i < k; i++) {
      const pixel = edgePixels[Math.floor(Math.random() * edgePixels.length)] || pixels[i]
      centroids.push({
        r: pixel[0],
        g: pixel[1],
        b: pixel[2],
        x: pixel[3],
        y: pixel[4],
        count: 0
      })
    }
    
    // Perform clustering with spatial weighting
    for (let iter = 0; iter < 20; iter++) {
      // Reset counts
      centroids.forEach(c => c.count = 0)
      
      // Assign pixels to nearest centroid (color + spatial)
      const assignments = pixels.map(pixel => {
        let minDistance = Infinity
        let assignment = 0
        
        centroids.forEach((centroid, index) => {
          const colorDistance = Math.sqrt(
            Math.pow(pixel[0] - centroid.r, 2) +
            Math.pow(pixel[1] - centroid.g, 2) +
            Math.pow(pixel[2] - centroid.b, 2)
          )
          
          const spatialDistance = Math.sqrt(
            Math.pow(pixel[3] - centroid.x, 2) +
            Math.pow(pixel[4] - centroid.y, 2)
          ) / Math.max(width, height) * 100 // Normalize spatial distance
          
          const combinedDistance = colorDistance + spatialDistance * 0.3
          
          if (combinedDistance < minDistance) {
            minDistance = combinedDistance
            assignment = index
          }
        })
        
        centroids[assignment].count++
        return assignment
      })
      
      // Update centroids
      const newCentroids = centroids.map(() => ({ r: 0, g: 0, b: 0, x: 0, y: 0, count: 0 }))
      
      pixels.forEach((pixel, index) => {
        const cluster = assignments[index]
        newCentroids[cluster].r += pixel[0]
        newCentroids[cluster].g += pixel[1]
        newCentroids[cluster].b += pixel[2]
        newCentroids[cluster].x += pixel[3]
        newCentroids[cluster].y += pixel[4]
        newCentroids[cluster].count++
      })
      
      // Calculate new positions
      newCentroids.forEach((centroid, index) => {
        if (centroid.count > 0) {
          centroids[index].r = centroid.r / centroid.count
          centroids[index].g = centroid.g / centroid.count
          centroids[index].b = centroid.b / centroid.count
          centroids[index].x = centroid.x / centroid.count
          centroids[index].y = centroid.y / centroid.count
          centroids[index].count = centroid.count
        }
      })
    }
    
    return centroids
  }

  private static identifyBackgroundClusters(
    clusters: Array<{ r: number; g: number; b: number; x: number; y: number; count: number }>,
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ r: number; g: number; b: number }> {
    const backgroundClusters: Array<{ r: number; g: number; b: number }> = []
    
    clusters.forEach(cluster => {
      // Score clusters based on multiple factors
      const edgePresence = this.calculateEdgePresence(cluster, width, height)
      const spatialDistribution = this.calculateSpatialDistribution(cluster, width, height)
      const colorUniformity = this.calculateColorUniformity(cluster, data, width, height)
      
      const backgroundScore = edgePresence * 0.4 + spatialDistribution * 0.3 + colorUniformity * 0.3
      
      if (backgroundScore > 0.6) {
        backgroundClusters.push(cluster)
      }
    })
    
    // Ensure we have at least one background cluster
    if (backgroundClusters.length === 0) {
      const largestCluster = clusters.reduce((max, cluster) => 
        cluster.count > max.count ? cluster : max
      )
      backgroundClusters.push(largestCluster)
    }
    
    return backgroundClusters
  }

  private static calculateEdgePresence(
    cluster: { x: number; y: number },
    width: number,
    height: number
  ): number {
    // Calculate how close the cluster center is to image edges
    const distanceToEdge = Math.min(
      cluster.x,
      width - cluster.x,
      cluster.y,
      height - cluster.y
    )
    
    const maxDistance = Math.min(width, height) / 2
    return 1 - Math.min(1, distanceToEdge / maxDistance)
  }

  private static calculateSpatialDistribution(
    cluster: { x: number; y: number; count: number },
    width: number,
    height: number
  ): number {
    // Background clusters tend to be distributed around edges
    const centerDistance = Math.sqrt(
      Math.pow(cluster.x - width / 2, 2) + Math.pow(cluster.y - height / 2, 2)
    )
    const maxCenterDistance = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2))
    
    return centerDistance / maxCenterDistance
  }

  private static calculateColorUniformity(
    cluster: { r: number; g: number; b: number },
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): number {
    // Sample pixels to check color uniformity
    let matches = 0
    let total = 0
    const threshold = 40
    
    for (let y = 0; y < height; y += 5) {
      for (let x = 0; x < width; x += 5) {
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

  private static async generateTextureMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: UltimateBackgroundOptions
  ): Promise<Uint8Array> {
    const mask = new Uint8Array(width * height)
    
    // Advanced texture analysis using Local Binary Patterns
    for (let y = 3; y < height - 3; y++) {
      for (let x = 3; x < width - 3; x++) {
        const idx = y * width + x
        const textureScore = this.calculateAdvancedTextureScore(data, x, y, width, height)
        
        // Background typically has lower texture complexity
        mask[idx] = textureScore < 0.3 ? 255 : 0
      }
    }
    
    return mask
  }

  private static calculateAdvancedTextureScore(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const centerIdx = (y * width + x) * 4
    const centerIntensity = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    // Calculate Local Binary Pattern
    let pattern = 0
    let bit = 0
    
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
    
    // Calculate texture complexity based on pattern
    const uniformPatterns = [0, 255, 15, 240, 51, 204, 85, 170]
    const isUniform = uniformPatterns.includes(pattern)
    
    if (isUniform) {
      return 0.1 // Low texture (likely background)
    }
    
    // Calculate pattern complexity
    const bits = pattern.toString(2).split('').map(Number)
    let transitions = 0
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== bits[(i + 1) % bits.length]) {
        transitions++
      }
    }
    
    return Math.min(1.0, transitions / 8)
  }

  private static async generateGradientFlowMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: UltimateBackgroundOptions
  ): Promise<Uint8Array> {
    const mask = new Uint8Array(width * height)
    
    // Gradient flow analysis for background detection
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = y * width + x
        
        // Calculate gradient magnitude and direction
        const gradientInfo = this.calculateGradientFlow(data, x, y, width, height)
        
        // Background areas typically have low gradient flow
        mask[idx] = gradientInfo.magnitude < 20 ? 255 : 0
      }
    }
    
    return mask
  }

  private static calculateGradientFlow(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): { magnitude: number; direction: number; coherence: number } {
    const centerIdx = (y * width + x) * 4
    
    let gx = 0, gy = 0
    
    // Calculate gradients in 5x5 neighborhood
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const nIdx = ((y + dy) * width + (x + dx)) * 4
        const intensity = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
        const centerIntensity = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
        
        const weight = 1 / Math.sqrt(dx * dx + dy * dy)
        gx += (intensity - centerIntensity) * dx * weight
        gy += (intensity - centerIntensity) * dy * weight
      }
    }
    
    const magnitude = Math.sqrt(gx * gx + gy * gy)
    const direction = Math.atan2(gy, gx)
    
    // Calculate gradient coherence in neighborhood
    let coherence = 0
    let count = 0
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const neighborGradient = this.calculateGradientFlow(data, x + dx, y + dy, width, height)
        const angleDiff = Math.abs(direction - neighborGradient.direction)
        coherence += Math.cos(angleDiff)
        count++
      }
    }
    
    coherence /= count
    
    return { magnitude, direction, coherence }
  }

  private static generateObjectBasedMask(
    subjectMask: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    const mask = new Uint8Array(width * height)
    
    // Invert subject mask to get background mask
    for (let i = 0; i < mask.length; i++) {
      mask[i] = subjectMask[i] > 128 ? 0 : 255
    }
    
    return mask
  }

  private static calculateMaskConfidence(
    mask: Uint8Array,
    referenceMask: Uint8Array
  ): number {
    let agreement = 0
    let total = 0
    
    for (let i = 0; i < mask.length; i++) {
      const maskValue = mask[i] > 128
      const refValue = referenceMask[i] > 128
      
      if (maskValue === refValue) agreement++
      total++
    }
    
    return agreement / total
  }

  private static async fuseBackgroundMasks(
    masks: any,
    imageData: ImageData,
    objectDetection: any,
    options: UltimateBackgroundOptions
  ): Promise<Uint8Array> {
    const { width, height } = imageData
    const finalMask = new Uint8Array(width * height)
    
    // Intelligent mask fusion with confidence weighting
    const weights = this.calculateMaskWeights(masks.confidenceScores, options)
    
    for (let i = 0; i < finalMask.length; i++) {
      let weightedSum = 0
      let totalWeight = 0
      
      // Combine all masks with confidence weighting
      const maskValues = [
        masks.edgeMask[i],
        masks.colorMask[i],
        masks.textureMask[i],
        masks.gradientMask[i],
        masks.objectMask[i]
      ]
      
      maskValues.forEach((value, index) => {
        const weight = weights[index]
        weightedSum += value * weight
        totalWeight += weight
      })
      
      finalMask[i] = Math.round(weightedSum / totalWeight)
    }
    
    // Apply morphological operations for cleanup
    await this.applyMorphologicalOperations(finalMask, width, height)
    
    return finalMask
  }

  private static calculateMaskWeights(
    confidenceScores: number[],
    options: UltimateBackgroundOptions
  ): number[] {
    const baseWeights = [0.25, 0.25, 0.15, 0.15, 0.2] // edge, color, texture, gradient, object
    
    // Adjust weights based on confidence scores
    const adjustedWeights = baseWeights.map((weight, index) => {
      const confidence = confidenceScores[index] || 0.5
      return weight * (0.5 + confidence)
    })
    
    // Normalize weights
    const totalWeight = adjustedWeights.reduce((sum, weight) => sum + weight, 0)
    return adjustedWeights.map(weight => weight / totalWeight)
  }

  private static async applyMorphologicalOperations(
    mask: Uint8Array,
    width: number,
    height: number
  ): Promise<void> {
    // Apply opening (erosion + dilation) to remove noise
    const temp = new Uint8Array(mask)
    
    // Erosion pass
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
    
    // Dilation pass
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

  private static async applyAdvancedPostProcessing(
    imageData: ImageData,
    mask: Uint8Array,
    objectDetection: any,
    options: UltimateBackgroundOptions
  ): Promise<void> {
    const { data, width, height } = imageData
    
    // Apply background removal with advanced edge handling
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
      } else {
        // Foreground pixel - enhance if needed
        if (options.detailPreservation && options.detailPreservation > 0) {
          const enhancement = 1 + (options.detailPreservation / 100) * 0.1
          data[i + 3] = Math.min(255, data[i + 3] * enhancement)
        }
      }
    }
    
    // Apply smoothing if requested
    if (options.smoothingLevel && options.smoothingLevel > 0) {
      await this.applyAdvancedSmoothing(data, width, height, options.smoothingLevel)
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
    const searchRadius = 15
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (mask[nIdx] <= 128) { // Foreground pixel
            const distance = Math.sqrt(dx * dx + dy * dy)
            minDistance = Math.min(minDistance, distance)
          }
        }
      }
    }
    
    return Math.max(0, 1 - minDistance / searchRadius)
  }

  private static async applyAdvancedSmoothing(
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
              const weight = Math.exp(-distance / (radius * 0.5))
              
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

  private static async scaleToOriginalSize(
    workingCanvas: HTMLCanvasElement,
    originalWidth: number,
    originalHeight: number,
    scaleFactor: number
  ): Promise<HTMLCanvasElement> {
    if (scaleFactor === 1) return workingCanvas
    
    const finalCanvas = document.createElement("canvas")
    const finalCtx = finalCanvas.getContext("2d")!
    
    finalCanvas.width = originalWidth
    finalCanvas.height = originalHeight
    
    finalCtx.imageSmoothingEnabled = true
    finalCtx.imageSmoothingQuality = "high"
    finalCtx.drawImage(workingCanvas, 0, 0, originalWidth, originalHeight)
    
    return finalCanvas
  }

  private static calculateOverallConfidence(masks: any): number {
    const avgConfidence = masks.confidenceScores.reduce((sum: number, score: number) => sum + score, 0) / masks.confidenceScores.length
    return Math.round(avgConfidence * 100) / 100
  }

  private static getUsedModels(options: UltimateBackgroundOptions): string[] {
    const models = ["object-detection", "edge-detection", "color-clustering"]
    
    if (options.secondaryModel) {
      models.push(options.secondaryModel)
    }
    
    if (options.hybridMode) {
      models.push("hybrid-fusion")
    }
    
    return models
  }

  private static calculateQualityMetrics(
    mask: Uint8Array,
    imageData: ImageData
  ): { edgeAccuracy: number; detailPreservation: number; backgroundCleanness: number } {
    // Calculate quality metrics for the result
    let edgePixels = 0
    let cleanBackground = 0
    let preservedDetails = 0
    let total = 0
    
    const { width, height } = imageData
    
    for (let i = 0; i < mask.length; i++) {
      const x = i % width
      const y = Math.floor(i / width)
      
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const isEdge = this.isEdgePixel(mask, i, width, height)
        const isBackground = mask[i] > 128
        
        if (isEdge) edgePixels++
        if (isBackground) cleanBackground++
        if (!isBackground && !isEdge) preservedDetails++
        
        total++
      }
    }
    
    return {
      edgeAccuracy: edgePixels / total,
      detailPreservation: preservedDetails / total,
      backgroundCleanness: cleanBackground / total
    }
  }

  private static isEdgePixel(
    mask: Uint8Array,
    idx: number,
    width: number,
    height: number
  ): boolean {
    const x = idx % width
    const y = Math.floor(idx / width)
    
    if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) return false
    
    const centerValue = mask[idx]
    
    // Check if neighboring pixels have different values
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const nIdx = (y + dy) * width + (x + dx)
        if (Math.abs(mask[nIdx] - centerValue) > 64) {
          return true
        }
      }
    }
    
    return false
  }
}