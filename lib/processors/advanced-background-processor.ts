// Professional background removal processor with object detection and specialized models
export interface BackgroundRemovalOptions {
  algorithm?: "auto" | "portrait" | "object" | "animal" | "product" | "general"
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
  detectedObjects?: Array<{
    type: string
    confidence: number
    bbox: { x: number; y: number; width: number; height: number }
  }>
}

export class AdvancedBackgroundProcessor {
  private static readonly MAX_SAFE_PIXELS = 2048 * 2048 // Increased for better quality
  
  static async removeBackground(
    file: File, 
    options: BackgroundRemovalOptions = {}
  ): Promise<ProcessingResult> {
    const { progressCallback } = options
    
    try {
      progressCallback?.(5, "Loading image...")
      
      // Enhanced file size limits
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
      progressCallback?.(15, "Analyzing image content...")
      
      // Enhanced dimension calculation
      const { workingWidth, workingHeight } = this.calculateOptimalDimensions(
        img.naturalWidth, 
        img.naturalHeight,
        options.maxDimensions
      )
      
      canvas.width = workingWidth
      canvas.height = workingHeight
      
      // Draw image at optimal resolution
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, workingWidth, workingHeight)
      
      progressCallback?.(25, "Detecting objects and subjects...")
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, workingWidth, workingHeight)
      
      // Detect objects first for better algorithm selection
      const detectedObjects = await this.detectObjects(imageData, options.algorithm)
      
      progressCallback?.(40, "Applying specialized background removal...")
      
      // Apply model-specific background removal
      await this.processWithSpecializedModel(imageData, options, detectedObjects, progressCallback)
      
      progressCallback?.(80, "Refining edges and transparency...")
      
      // Enhanced post-processing
      await this.applyAdvancedPostProcessing(imageData, options)
      
      // Put processed data back
      ctx.putImageData(imageData, 0, 0)
      
      progressCallback?.(95, "Finalizing...")
      
      // Create final blob with better quality
      const processedBlob = await this.canvasToBlob(canvas, `image/${options.outputFormat || "png"}`, 0.98)
      
      progressCallback?.(100, "Complete!")
      
      return {
        processedBlob,
        detectedObjects
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

  private static calculateOptimalDimensions(
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

  private static async detectObjects(
    imageData: ImageData,
    modelType?: string
  ): Promise<Array<{
    type: string
    confidence: number
    bbox: { x: number; y: number; width: number; height: number }
  }>> {
    const { data, width, height } = imageData
    const detectedObjects = []
    
    // Enhanced object detection based on color patterns and shapes
    const analysis = this.analyzeImageContent(data, width, height)
    
    // Detect human/portrait
    if (analysis.skinToneRatio > 0.03 || analysis.faceFeatures > 0.02) {
      detectedObjects.push({
        type: "person",
        confidence: Math.min(0.95, analysis.skinToneRatio * 20 + analysis.faceFeatures * 30),
        bbox: this.findPersonBoundingBox(data, width, height)
      })
    }
    
    // Detect animals (fur patterns, eyes)
    if (analysis.furTexture > 0.05 || analysis.animalFeatures > 0.03) {
      detectedObjects.push({
        type: "animal",
        confidence: Math.min(0.9, analysis.furTexture * 15 + analysis.animalFeatures * 25),
        bbox: this.findAnimalBoundingBox(data, width, height)
      })
    }
    
    // Detect products (geometric shapes, consistent colors)
    if (analysis.geometricShapes > 0.1 && analysis.colorConsistency > 0.6) {
      detectedObjects.push({
        type: "product",
        confidence: Math.min(0.85, analysis.geometricShapes * 8 + analysis.colorConsistency * 0.5),
        bbox: this.findProductBoundingBox(data, width, height)
      })
    }
    
    // Detect vehicles
    if (analysis.metallicSurfaces > 0.08 || analysis.vehicleFeatures > 0.05) {
      detectedObjects.push({
        type: "vehicle",
        confidence: Math.min(0.8, analysis.metallicSurfaces * 10 + analysis.vehicleFeatures * 15),
        bbox: this.findVehicleBoundingBox(data, width, height)
      })
    }
    
    return detectedObjects
  }

  private static analyzeImageContent(data: Uint8ClampedArray, width: number, height: number) {
    let skinPixels = 0
    let furPixels = 0
    let metallicPixels = 0
    let geometricEdges = 0
    let faceFeatures = 0
    let animalFeatures = 0
    let vehicleFeatures = 0
    let colorVariations = 0
    
    const totalPixels = width * height
    const sampleRate = Math.max(1, Math.floor(totalPixels / 5000))
    
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const pixelIndex = i / 4
      const x = pixelIndex % width
      const y = Math.floor(pixelIndex / width)
      
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Enhanced skin tone detection
      if (this.isAdvancedSkinTone(r, g, b)) {
        skinPixels++
        
        // Check for facial features nearby
        if (this.detectFacialFeatures(data, x, y, width, height)) {
          faceFeatures++
        }
      }
      
      // Fur texture detection
      if (this.isFurTexture(data, x, y, width, height)) {
        furPixels++
      }
      
      // Metallic surface detection
      if (this.isMetallicSurface(r, g, b, data, x, y, width, height)) {
        metallicPixels++
      }
      
      // Geometric shape detection
      if (this.isGeometricEdge(data, x, y, width, height)) {
        geometricEdges++
      }
      
      // Animal feature detection
      if (this.detectAnimalFeatures(data, x, y, width, height)) {
        animalFeatures++
      }
      
      // Vehicle feature detection
      if (this.detectVehicleFeatures(data, x, y, width, height)) {
        vehicleFeatures++
      }
      
      // Color variation analysis
      const variation = Math.max(r, g, b) - Math.min(r, g, b)
      colorVariations += variation
    }
    
    const sampledPixels = Math.floor(totalPixels / sampleRate)
    
    return {
      skinToneRatio: skinPixels / sampledPixels,
      furTexture: furPixels / sampledPixels,
      metallicSurfaces: metallicPixels / sampledPixels,
      geometricShapes: geometricEdges / sampledPixels,
      faceFeatures: faceFeatures / sampledPixels,
      animalFeatures: animalFeatures / sampledPixels,
      vehicleFeatures: vehicleFeatures / sampledPixels,
      colorConsistency: 1 - (colorVariations / sampledPixels / 255),
      hasComplexSubject: (skinPixels + furPixels + metallicPixels) / sampledPixels > 0.1
    }
  }

  private static isAdvancedSkinTone(r: number, g: number, b: number): boolean {
    // Enhanced skin tone detection with better accuracy
    if (r < 80 || g < 50 || b < 30) return false
    if (r <= g || r <= b) return false
    
    // Check skin tone ratios
    const rg = r - g
    const rb = r - b
    const gb = g - b
    
    if (rg < 10 || rb < 15) return false
    if (gb < -15 || gb > 25) return false
    
    // Additional checks for different skin tones
    const brightness = (r + g + b) / 3
    if (brightness < 60 || brightness > 220) return false
    
    // Check saturation
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const saturation = (max - min) / max
    
    return saturation >= 0.15 && saturation <= 0.7
  }

  private static detectFacialFeatures(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Look for eye-like patterns (dark horizontal regions)
    const eyePattern = this.detectEyePattern(data, x, y, width, height)
    const mouthPattern = this.detectMouthPattern(data, x, y, width, height)
    const nosePattern = this.detectNosePattern(data, x, y, width, height)
    
    return eyePattern || mouthPattern || nosePattern
  }

  private static detectEyePattern(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Check for horizontal dark regions that could be eyes
    const searchRadius = 8
    let darkHorizontalPixels = 0
    let totalChecked = 0
    
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      const nx = x + dx
      if (nx >= 0 && nx < width) {
        const idx = (y * width + nx) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (brightness < 80) darkHorizontalPixels++
        totalChecked++
      }
    }
    
    return totalChecked > 0 && (darkHorizontalPixels / totalChecked) > 0.6
  }

  private static detectMouthPattern(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Look for curved dark regions that could be mouth
    const searchRadius = 6
    let darkCurvedPixels = 0
    let totalChecked = 0
    
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
          
          // Check for curved pattern
          const distanceFromCenter = Math.abs(dx)
          const expectedBrightness = 120 - (distanceFromCenter * 10)
          
          if (brightness < expectedBrightness) darkCurvedPixels++
          totalChecked++
        }
      }
    }
    
    return totalChecked > 0 && (darkCurvedPixels / totalChecked) > 0.4
  }

  private static detectNosePattern(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Look for vertical highlight patterns
    const searchRadius = 4
    let highlightPixels = 0
    let totalChecked = 0
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      const ny = y + dy
      if (ny >= 0 && ny < height) {
        const idx = (ny * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (brightness > 140) highlightPixels++
        totalChecked++
      }
    }
    
    return totalChecked > 0 && (highlightPixels / totalChecked) > 0.5
  }

  private static isFurTexture(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Detect fur-like textures with high frequency patterns
    if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) return false
    
    let textureVariation = 0
    let edgeCount = 0
    
    // Check 5x5 neighborhood for texture patterns
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4
        const centerIdx = (y * width + x) * 4
        
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
        
        const diff = Math.abs(brightness - centerBrightness)
        textureVariation += diff
        
        if (diff > 30) edgeCount++
      }
    }
    
    // Fur has high texture variation and many small edges
    return textureVariation > 500 && edgeCount > 8
  }

  private static isMetallicSurface(
    r: number,
    g: number,
    b: number,
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Metallic surfaces have high reflectivity and specific color characteristics
    const brightness = (r + g + b) / 3
    const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b)
    
    // Check for metallic color range
    if (saturation > 0.3) return false // Metals are usually low saturation
    if (brightness < 100) return false // Metals are usually bright
    
    // Check for reflective patterns in neighborhood
    let reflectivePixels = 0
    const searchRadius = 3
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          const nBrightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
          
          if (nBrightness > 180) reflectivePixels++
        }
      }
    }
    
    const totalChecked = (searchRadius * 2 + 1) ** 2
    return (reflectivePixels / totalChecked) > 0.3
  }

  private static isGeometricEdge(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) return false
    
    // Check for straight lines and geometric patterns
    const centerIdx = (y * width + x) * 4
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    // Check horizontal line
    const leftIdx = (y * width + (x - 1)) * 4
    const rightIdx = (y * width + (x + 1)) * 4
    const leftBrightness = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3
    const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3
    
    const horizontalGradient = Math.abs(leftBrightness - rightBrightness)
    
    // Check vertical line
    const topIdx = ((y - 1) * width + x) * 4
    const bottomIdx = ((y + 1) * width + x) * 4
    const topBrightness = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3
    const bottomBrightness = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3
    
    const verticalGradient = Math.abs(topBrightness - bottomBrightness)
    
    // Strong edge in one direction indicates geometric shape
    return horizontalGradient > 50 || verticalGradient > 50
  }

  private static detectAnimalFeatures(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Look for animal-specific features like eyes, nose patterns
    const eyePattern = this.detectAnimalEyes(data, x, y, width, height)
    const nosePattern = this.detectAnimalNose(data, x, y, width, height)
    const earPattern = this.detectAnimalEars(data, x, y, width, height)
    
    return eyePattern || nosePattern || earPattern
  }

  private static detectAnimalEyes(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Animal eyes are often reflective and circular
    const searchRadius = 5
    let reflectivePixels = 0
    let darkPixels = 0
    let totalChecked = 0
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance > searchRadius) continue
        
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
          
          if (distance < 2 && brightness > 200) reflectivePixels++ // Center highlight
          if (distance > 2 && distance < 4 && brightness < 50) darkPixels++ // Dark iris
          totalChecked++
        }
      }
    }
    
    return reflectivePixels > 0 && darkPixels > 3
  }

  private static detectAnimalNose(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Animal noses are often dark and triangular
    const idx = (y * width + x) * 4
    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
    
    if (brightness > 80) return false // Noses are usually dark
    
    // Check for triangular pattern
    let triangularPattern = 0
    const checkPoints = [
      [0, -3], [-2, 2], [2, 2] // Triangle points
    ]
    
    checkPoints.forEach(([dx, dy]) => {
      const nx = x + dx
      const ny = y + dy
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = (ny * width + nx) * 4
        const nBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
        
        if (nBrightness < 100) triangularPattern++
      }
    })
    
    return triangularPattern >= 2
  }

  private static detectAnimalEars(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Look for ear-like protrusions above potential head area
    if (y < height * 0.2) { // Only check upper portion
      const furTexture = this.isFurTexture(data, x, y, width, height)
      const edgeStrength = this.calculateEdgeStrength(data, x, y, width)
      
      return furTexture && edgeStrength > 40
    }
    
    return false
  }

  private static detectVehicleFeatures(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Detect vehicle-specific features like wheels, windows, grilles
    const wheelPattern = this.detectWheelPattern(data, x, y, width, height)
    const windowPattern = this.detectWindowPattern(data, x, y, width, height)
    const grillPattern = this.detectGrillPattern(data, x, y, width, height)
    
    return wheelPattern || windowPattern || grillPattern
  }

  private static detectWheelPattern(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Wheels are circular and often dark
    const radius = 8
    let circularPattern = 0
    let darkCenter = 0
    
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
      const dx = Math.round(radius * Math.cos(angle))
      const dy = Math.round(radius * Math.sin(angle))
      const nx = x + dx
      const ny = y + dy
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (brightness < 100) circularPattern++
      }
    }
    
    // Check center for dark hub
    const centerIdx = (y * width + x) * 4
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    if (centerBrightness < 60) darkCenter = 1
    
    return circularPattern > 6 && darkCenter > 0
  }

  private static detectWindowPattern(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Windows are often reflective and rectangular
    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    
    // Check for blue/reflective tint
    const blueTint = b > r && b > g && b > 120
    const brightness = (r + g + b) / 3
    const isReflective = brightness > 150
    
    if (!blueTint && !isReflective) return false
    
    // Check for rectangular pattern
    return this.isPartOfRectangularRegion(data, x, y, width, height)
  }

  private static detectGrillPattern(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Grills have repeating horizontal or vertical patterns
    let patternCount = 0
    
    // Check horizontal pattern
    for (let dx = -6; dx <= 6; dx += 2) {
      const nx = x + dx
      if (nx >= 0 && nx < width) {
        const idx = (y * width + nx) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (brightness < 80) patternCount++
      }
    }
    
    return patternCount > 3
  }

  private static isPartOfRectangularRegion(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Check if pixel is part of a rectangular region
    const horizontalConsistency = this.checkHorizontalConsistency(data, x, y, width, height)
    const verticalConsistency = this.checkVerticalConsistency(data, x, y, width, height)
    
    return horizontalConsistency > 0.7 && verticalConsistency > 0.7
  }

  private static checkHorizontalConsistency(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const centerIdx = (y * width + x) * 4
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    let consistentPixels = 0
    let totalChecked = 0
    
    for (let dx = -5; dx <= 5; dx++) {
      const nx = x + dx
      if (nx >= 0 && nx < width) {
        const idx = (y * width + nx) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (Math.abs(brightness - centerBrightness) < 30) consistentPixels++
        totalChecked++
      }
    }
    
    return totalChecked > 0 ? consistentPixels / totalChecked : 0
  }

  private static checkVerticalConsistency(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const centerIdx = (y * width + x) * 4
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    let consistentPixels = 0
    let totalChecked = 0
    
    for (let dy = -5; dy <= 5; dy++) {
      const ny = y + dy
      if (ny >= 0 && ny < height) {
        const idx = (ny * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (Math.abs(brightness - centerBrightness) < 30) consistentPixels++
        totalChecked++
      }
    }
    
    return totalChecked > 0 ? consistentPixels / totalChecked : 0
  }

  private static findPersonBoundingBox(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number } {
    let minX = width, maxX = 0, minY = height, maxY = 0
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        if (this.isAdvancedSkinTone(r, g, b)) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    // Expand bounding box to include clothing and hair
    const padding = Math.min(width, height) * 0.1
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.min(width, maxX - minX + padding * 2),
      height: Math.min(height, maxY - minY + padding * 2)
    }
  }

  private static findAnimalBoundingBox(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number } {
    let minX = width, maxX = 0, minY = height, maxY = 0
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.isFurTexture(data, x, y, width, height) || 
            this.detectAnimalFeatures(data, x, y, width, height)) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    const padding = Math.min(width, height) * 0.05
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.min(width, maxX - minX + padding * 2),
      height: Math.min(height, maxY - minY + padding * 2)
    }
  }

  private static findProductBoundingBox(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number } {
    // Find the main object by detecting edges and consistent regions
    const edges = this.detectProductEdges(data, width, height)
    let minX = width, maxX = 0, minY = height, maxY = 0
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (edges[idx] > 0.3) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    return {
      x: Math.max(0, minX),
      y: Math.max(0, minY),
      width: Math.min(width, maxX - minX),
      height: Math.min(height, maxY - minY)
    }
  }

  private static findVehicleBoundingBox(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number } {
    // Vehicles are usually large and in the center-bottom area
    let minX = width, maxX = 0, minY = height, maxY = 0
    
    for (let y = Math.floor(height * 0.3); y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.detectVehicleFeatures(data, x, y, width, height)) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    const padding = Math.min(width, height) * 0.05
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.min(width, maxX - minX + padding * 2),
      height: Math.min(height, maxY - minY + padding * 2)
    }
  }

  private static detectProductEdges(data: Uint8ClampedArray, width: number, height: number): Float32Array {
    const edges = new Float32Array(width * height)
    
    // Enhanced edge detection for products
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        
        // Calculate gradient magnitude
        let gx = 0, gy = 0
        
        // Sobel operator
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
        
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

  private static async processWithSpecializedModel(
    imageData: ImageData,
    options: BackgroundRemovalOptions,
    detectedObjects: any[],
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<void> {
    const algorithm = options.algorithm || "auto"
    
    // Auto-select best algorithm based on detected objects
    let selectedAlgorithm = algorithm
    if (algorithm === "auto" && detectedObjects.length > 0) {
      const primaryObject = detectedObjects.reduce((prev, current) => 
        current.confidence > prev.confidence ? current : prev
      )
      
      switch (primaryObject.type) {
        case "person":
          selectedAlgorithm = "portrait"
          break
        case "animal":
          selectedAlgorithm = "animal"
          break
        case "product":
          selectedAlgorithm = "product"
          break
        case "vehicle":
          selectedAlgorithm = "object"
          break
        default:
          selectedAlgorithm = "general"
      }
    }
    
    progressCallback?.(45, `Applying ${selectedAlgorithm} model...`)
    
    // Apply specialized processing based on selected algorithm
    switch (selectedAlgorithm) {
      case "portrait":
        await this.processPortraitModel(imageData, options, progressCallback)
        break
      case "animal":
        await this.processAnimalModel(imageData, options, progressCallback)
        break
      case "product":
        await this.processProductModel(imageData, options, progressCallback)
        break
      case "object":
        await this.processObjectModel(imageData, options, progressCallback)
        break
      default:
        await this.processGeneralModel(imageData, options, progressCallback)
    }
  }

  private static async processPortraitModel(
    imageData: ImageData,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<void> {
    const { data, width, height } = imageData
    
    progressCallback?.(50, "Analyzing portrait features...")
    
    // Create advanced subject probability map for portraits
    const subjectMap = new Float32Array(width * height)
    const centerX = width / 2
    const centerY = height / 2
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const pixelIdx = y * width + x
        
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        let subjectProbability = 0
        
        // Enhanced skin tone detection
        if (this.isAdvancedSkinTone(r, g, b)) {
          subjectProbability += 0.9
        }
        
        // Hair detection (improved)
        const hairWeight = this.detectAdvancedHair(data, x, y, width, height)
        subjectProbability += hairWeight * 0.8
        
        // Clothing detection in portrait context
        const clothingWeight = this.detectPortraitClothing(data, x, y, width, height, centerX, centerY)
        subjectProbability += clothingWeight * 0.7
        
        // Face feature detection
        const faceWeight = this.detectFacialFeatures(data, x, y, width, height) ? 0.95 : 0
        subjectProbability += faceWeight
        
        // Position weight for portraits (subjects usually centered)
        const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
        const maxDistance = Math.min(width, height) * 0.4
        const positionWeight = Math.max(0, 1 - distanceFromCenter / maxDistance) * 0.3
        subjectProbability += positionWeight
        
        subjectMap[pixelIdx] = Math.min(1, subjectProbability)
      }
    }
    
    progressCallback?.(65, "Refining portrait edges...")
    
    // Apply advanced smoothing for portraits
    this.gaussianBlurFloat32(subjectMap, width, height, 2)
    
    // Apply background removal with portrait-specific thresholds
    for (let i = 0; i < width * height; i++) {
      const probability = subjectMap[i]
      const pixelIdx = i * 4
      
      if (probability < 0.2) {
        // Definitely background
        data[pixelIdx + 3] = 0
      } else if (probability < 0.8) {
        // Edge area - apply smooth transition with portrait-optimized curve
        const alpha = this.portraitAlphaCurve(probability)
        data[pixelIdx + 3] = Math.min(data[pixelIdx + 3], alpha)
      }
      // Else keep original alpha (definitely subject)
    }
  }

  private static async processAnimalModel(
    imageData: ImageData,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<void> {
    const { data, width, height } = imageData
    
    progressCallback?.(50, "Analyzing animal features...")
    
    const subjectMap = new Float32Array(width * height)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = y * width + x
        let subjectProbability = 0
        
        // Fur texture detection
        if (this.isFurTexture(data, x, y, width, height)) {
          subjectProbability += 0.8
        }
        
        // Animal feature detection
        if (this.detectAnimalFeatures(data, x, y, width, height)) {
          subjectProbability += 0.9
        }
        
        // Eye detection for animals
        if (this.detectAnimalEyes(data, x, y, width, height)) {
          subjectProbability += 0.95
        }
        
        // Nose/snout detection
        if (this.detectAnimalNose(data, x, y, width, height)) {
          subjectProbability += 0.85
        }
        
        // Ear detection
        if (this.detectAnimalEars(data, x, y, width, height)) {
          subjectProbability += 0.7
        }
        
        subjectMap[pixelIdx] = Math.min(1, subjectProbability)
      }
    }
    
    progressCallback?.(65, "Refining animal edges...")
    
    // Apply smoothing optimized for animal fur
    this.gaussianBlurFloat32(subjectMap, width, height, 1.5)
    
    // Apply background removal with animal-specific thresholds
    for (let i = 0; i < width * height; i++) {
      const probability = subjectMap[i]
      const pixelIdx = i * 4
      
      if (probability < 0.15) {
        data[pixelIdx + 3] = 0
      } else if (probability < 0.75) {
        const alpha = this.animalAlphaCurve(probability)
        data[pixelIdx + 3] = Math.min(data[pixelIdx + 3], alpha)
      }
    }
  }

  private static async processProductModel(
    imageData: ImageData,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<void> {
    const { data, width, height } = imageData
    
    progressCallback?.(50, "Analyzing product edges...")
    
    // Product-specific processing focuses on clean edges and geometric shapes
    const edges = this.detectProductEdges(data, width, height)
    const backgroundMask = this.floodFillProductBackground(data, edges, width, height)
    
    progressCallback?.(65, "Applying product-optimized removal...")
    
    // Apply removal with sharp, clean edges for products
    for (let i = 0; i < width * height; i++) {
      const isBackground = backgroundMask[i]
      const pixelIdx = i * 4
      
      if (isBackground > 0.9) {
        data[pixelIdx + 3] = 0
      } else if (isBackground > 0.1) {
        // Sharper transitions for products
        const alpha = Math.round((1 - isBackground) * 255)
        data[pixelIdx + 3] = Math.min(data[pixelIdx + 3], alpha)
      }
    }
  }

  private static async processObjectModel(
    imageData: ImageData,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<void> {
    const { data, width, height } = imageData
    
    progressCallback?.(50, "Detecting object boundaries...")
    
    // General object detection with enhanced edge analysis
    const edges = this.detectAdvancedEdges(data, width, height)
    const objectMask = this.createObjectMask(data, edges, width, height, options.sensitivity || 25)
    
    progressCallback?.(65, "Applying object-aware removal...")
    
    // Apply removal with balanced edge handling
    for (let i = 0; i < width * height; i++) {
      const isObject = objectMask[i]
      const pixelIdx = i * 4
      
      if (isObject < 0.3) {
        data[pixelIdx + 3] = 0
      } else if (isObject < 0.7) {
        const alpha = Math.round(isObject * 255)
        data[pixelIdx + 3] = Math.min(data[pixelIdx + 3], alpha)
      }
    }
  }

  private static async processGeneralModel(
    imageData: ImageData,
    options: BackgroundRemovalOptions,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<void> {
    const { data, width, height } = imageData
    
    progressCallback?.(50, "Applying general background removal...")
    
    // Hybrid approach combining multiple techniques
    const backgroundColors = this.sampleBackgroundColors(data, width, height)
    const dominantBg = this.findDominantBackgroundColor(backgroundColors)
    const sensitivity = options.sensitivity || 25
    
    // Create background probability map
    const backgroundMap = new Float32Array(width * height)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const pixelIdx = y * width + x
        
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        // Enhanced color similarity calculation
        const colorDistance = this.calculatePerceptualDistance({ r, g, b }, dominantBg)
        const colorWeight = Math.max(0, 1 - colorDistance / (sensitivity * 4))
        
        // Edge proximity
        const edgeWeight = 1 - Math.min(1, this.calculateEdgeStrength(data, x, y, width) / 60)
        
        // Position weight (backgrounds more likely at edges)
        const positionWeight = this.calculateEdgeProximity(x, y, width, height)
        
        // Texture uniformity
        const textureWeight = this.calculateTextureUniformity(data, x, y, width, height)
        
        const backgroundProbability = 
          colorWeight * 0.4 +
          edgeWeight * 0.25 +
          positionWeight * 0.2 +
          textureWeight * 0.15
        
        backgroundMap[pixelIdx] = Math.max(0, Math.min(1, backgroundProbability))
      }
    }
    
    progressCallback?.(65, "Smoothing transitions...")
    
    // Apply smoothing
    this.gaussianBlurFloat32(backgroundMap, width, height, 2)
    
    // Apply removal
    for (let i = 0; i < width * height; i++) {
      const backgroundProb = backgroundMap[i]
      const pixelIdx = i * 4
      
      if (backgroundProb > 0.8) {
        data[pixelIdx + 3] = 0
      } else if (backgroundProb > 0.2) {
        const alpha = Math.round((1 - backgroundProb) * 255)
        data[pixelIdx + 3] = Math.min(data[pixelIdx + 3], alpha)
      }
    }
  }

  private static portraitAlphaCurve(probability: number): number {
    // Smooth S-curve for portrait edges
    const t = (probability - 0.2) / 0.6
    const smoothed = t * t * (3 - 2 * t)
    return Math.round(smoothed * 255)
  }

  private static animalAlphaCurve(probability: number): number {
    // Softer curve for animal fur edges
    const t = (probability - 0.15) / 0.6
    const smoothed = Math.sin(t * Math.PI / 2)
    return Math.round(smoothed * 255)
  }

  private static detectAdvancedHair(
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
    
    // Hair detection with better color analysis
    const brightness = (r + g + b) / 3
    if (brightness > 120) return 0 // Hair is usually darker
    
    // Check for hair-like texture patterns
    const textureScore = this.calculateHairTexture(data, x, y, width, height)
    
    // Look for nearby skin tones
    const skinProximity = this.findNearbySkinTones(data, x, y, width, height)
    
    // Hair color analysis
    const isHairColor = this.isTypicalHairColor(r, g, b)
    
    return Math.min(1, textureScore * 0.4 + skinProximity * 0.4 + (isHairColor ? 0.2 : 0))
  }

  private static calculateHairTexture(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    let textureVariation = 0
    let edgeCount = 0
    const radius = 3
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 4
          const centerIdx = (y * width + x) * 4
          
          const nBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
          const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
          
          const diff = Math.abs(nBrightness - centerBrightness)
          textureVariation += diff
          
          if (diff > 25) edgeCount++
        }
      }
    }
    
    const totalChecked = (radius * 2 + 1) ** 2
    const avgVariation = textureVariation / totalChecked
    const edgeRatio = edgeCount / totalChecked
    
    // Hair has moderate variation and many small edges
    return Math.min(1, (avgVariation / 50) * 0.6 + edgeRatio * 0.4)
  }

  private static findNearbySkinTones(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    let skinPixels = 0
    let totalChecked = 0
    const searchRadius = 20
    
    for (let dy = -searchRadius; dy <= searchRadius; dy += 3) {
      for (let dx = -searchRadius; dx <= searchRadius; dx += 3) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 4
          if (this.isAdvancedSkinTone(data[nIdx], data[nIdx + 1], data[nIdx + 2])) {
            skinPixels++
          }
          totalChecked++
        }
      }
    }
    
    return totalChecked > 0 ? skinPixels / totalChecked : 0
  }

  private static isTypicalHairColor(r: number, g: number, b: number): boolean {
    const brightness = (r + g + b) / 3
    
    // Black hair
    if (brightness < 60 && Math.max(r, g, b) - Math.min(r, g, b) < 30) return true
    
    // Brown hair
    if (r > g && r > b && g > b && brightness < 120) return true
    
    // Blonde hair
    if (r > 150 && g > 130 && b < 120 && brightness > 120) return true
    
    // Red hair
    if (r > g * 1.3 && r > b * 1.5 && brightness > 80) return true
    
    // Gray/white hair
    if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && brightness > 120) return true
    
    return false
  }

  private static detectPortraitClothing(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number,
    centerX: number,
    centerY: number
  ): number {
    // Clothing is typically in the lower-center region of portraits
    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
    const maxDistance = Math.min(width, height) * 0.4
    
    // Focus on lower portion where clothing typically appears
    const isInClothingRegion = y > height * 0.5 && distanceFromCenter < maxDistance
    
    if (!isInClothingRegion) return 0
    
    // Check for fabric-like textures and consistent colors
    const fabricTexture = this.detectFabricTexture(data, x, y, width, height)
    const colorConsistency = this.calculateLocalColorConsistency(data, x, y, width, height)
    
    return Math.min(1, fabricTexture * 0.6 + colorConsistency * 0.4)
  }

  private static detectFabricTexture(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    // Fabric has moderate texture variation (less than fur, more than skin)
    let textureScore = 0
    const radius = 4
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 4
          const centerIdx = (y * width + x) * 4
          
          const nBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
          const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
          
          const diff = Math.abs(nBrightness - centerBrightness)
          textureScore += diff
        }
      }
    }
    
    const avgTexture = textureScore / ((radius * 2 + 1) ** 2)
    
    // Fabric texture is in the middle range
    if (avgTexture > 15 && avgTexture < 40) {
      return Math.min(1, avgTexture / 30)
    }
    
    return 0
  }

  private static calculateLocalColorConsistency(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const colors = []
    const radius = 6
    
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
    
    if (colors.length === 0) return 0
    
    // Calculate color variance
    const avgR = colors.reduce((sum, c) => sum + c.r, 0) / colors.length
    const avgG = colors.reduce((sum, c) => sum + c.g, 0) / colors.length
    const avgB = colors.reduce((sum, c) => sum + c.b, 0) / colors.length
    
    const variance = colors.reduce((sum, c) => {
      return sum + Math.pow(c.r - avgR, 2) + Math.pow(c.g - avgG, 2) + Math.pow(c.b - avgB, 2)
    }, 0) / colors.length
    
    return Math.max(0, 1 - variance / 5000)
  }

  private static floodFillProductBackground(
    data: Uint8ClampedArray,
    edges: Float32Array,
    width: number,
    height: number
  ): Float32Array {
    const backgroundMap = new Float32Array(width * height)
    const visited = new Uint8Array(width * height)
    const queue: Array<[number, number]> = []
    
    // Start from all edge points for better coverage
    const edgePoints = []
    
    // Top and bottom edges
    for (let x = 0; x < width; x += 5) {
      edgePoints.push([x, 0])
      edgePoints.push([x, height - 1])
    }
    
    // Left and right edges
    for (let y = 0; y < height; y += 5) {
      edgePoints.push([0, y])
      edgePoints.push([width - 1, y])
    }
    
    edgePoints.forEach(([x, y]) => {
      if (edges[y * width + x] < 0.3) {
        queue.push([x, y])
      }
    })
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      const idx = y * width + x
      
      if (visited[idx] || edges[idx] > 0.4) continue
      
      visited[idx] = 1
      backgroundMap[idx] = 1
      
      // Add 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx
            if (!visited[nIdx] && edges[nIdx] <= 0.4) {
              queue.push([nx, ny])
            }
          }
        }
      }
    }
    
    return backgroundMap
  }

  private static detectAdvancedEdges(data: Uint8ClampedArray, width: number, height: number): Float32Array {
    const edges = new Float32Array(width * height)
    
    // Multi-scale edge detection
    const scales = [1, 2, 3]
    
    scales.forEach(scale => {
      for (let y = scale; y < height - scale; y++) {
        for (let x = scale; x < width - scale; x++) {
          const idx = y * width + x
          
          let gx = 0, gy = 0
          
          // Scaled Sobel operator
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const pixelIdx = ((y + dy * scale) * width + (x + dx * scale)) * 4
              const intensity = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3
              
              // Sobel kernels
              const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
              const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
              const kernelIdx = (dy + 1) * 3 + (dx + 1)
              
              gx += intensity * sobelX[kernelIdx]
              gy += intensity * sobelY[kernelIdx]
            }
          }
          
          const magnitude = Math.sqrt(gx * gx + gy * gy) / scale
          edges[idx] = Math.max(edges[idx], Math.min(1, magnitude / 255))
        }
      }
    })
    
    return edges
  }

  private static createObjectMask(
    data: Uint8ClampedArray,
    edges: Float32Array,
    width: number,
    height: number,
    sensitivity: number
  ): Float32Array {
    const objectMask = new Float32Array(width * height)
    
    // Use watershed-like algorithm for object segmentation
    const seeds = this.findObjectSeeds(data, edges, width, height)
    const regions = this.growRegions(data, seeds, width, height, sensitivity)
    
    // Classify regions as object or background
    regions.forEach(region => {
      const isObject = this.classifyRegion(region, data, width, height)
      region.pixels.forEach(pixelIdx => {
        objectMask[pixelIdx] = isObject ? 1 : 0
      })
    })
    
    return objectMask
  }

  private static findObjectSeeds(
    data: Uint8ClampedArray,
    edges: Float32Array,
    width: number,
    height: number
  ): Array<{ x: number; y: number; type: "object" | "background" }> {
    const seeds = []
    
    // Background seeds from edges
    const edgePoints = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)]
    ]
    
    edgePoints.forEach(([x, y]) => {
      if (edges[y * width + x] < 0.2) {
        seeds.push({ x, y, type: "background" })
      }
    })
    
    // Object seeds from center regions with low edge activity
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)
    const searchRadius = Math.min(width, height) * 0.2
    
    for (let y = centerY - searchRadius; y <= centerY + searchRadius; y += 10) {
      for (let x = centerX - searchRadius; x <= centerX + searchRadius; x += 10) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = y * width + x
          if (edges[idx] < 0.1) {
            seeds.push({ x, y, type: "object" })
          }
        }
      }
    }
    
    return seeds
  }

  private static growRegions(
    data: Uint8ClampedArray,
    seeds: Array<{ x: number; y: number; type: "object" | "background" }>,
    width: number,
    height: number,
    sensitivity: number
  ): Array<{ pixels: number[]; type: "object" | "background"; avgColor: { r: number; g: number; b: number } }> {
    const regions = []
    const visited = new Uint8Array(width * height)
    
    seeds.forEach(seed => {
      if (visited[seed.y * width + seed.x]) return
      
      const region = {
        pixels: [] as number[],
        type: seed.type,
        avgColor: { r: 0, g: 0, b: 0 }
      }
      
      const queue = [[seed.x, seed.y]]
      const seedIdx = (seed.y * width + seed.x) * 4
      const seedColor = {
        r: data[seedIdx],
        g: data[seedIdx + 1],
        b: data[seedIdx + 2]
      }
      
      while (queue.length > 0) {
        const [x, y] = queue.shift()!
        const idx = y * width + x
        
        if (visited[idx]) continue
        
        const pixelIdx = idx * 4
        const pixelColor = {
          r: data[pixelIdx],
          g: data[pixelIdx + 1],
          b: data[pixelIdx + 2]
        }
        
        const colorDistance = this.calculatePerceptualDistance(pixelColor, seedColor)
        if (colorDistance > sensitivity * 2) continue
        
        visited[idx] = 1
        region.pixels.push(idx)
        
        // Add neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx
              if (!visited[nIdx]) {
                queue.push([nx, ny])
              }
            }
          }
        }
      }
      
      // Calculate average color
      if (region.pixels.length > 0) {
        let totalR = 0, totalG = 0, totalB = 0
        region.pixels.forEach(pixelIdx => {
          const idx = pixelIdx * 4
          totalR += data[idx]
          totalG += data[idx + 1]
          totalB += data[idx + 2]
        })
        
        region.avgColor = {
          r: totalR / region.pixels.length,
          g: totalG / region.pixels.length,
          b: totalB / region.pixels.length
        }
        
        regions.push(region)
      }
    })
    
    return regions
  }

  private static classifyRegion(
    region: { pixels: number[]; type: "object" | "background"; avgColor: { r: number; g: number; b: number } },
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): boolean {
    // If region was seeded as object, it's likely object
    if (region.type === "object") return true
    
    // Analyze region characteristics
    const regionSize = region.pixels.length
    const totalPixels = width * height
    const sizeRatio = regionSize / totalPixels
    
    // Large regions are more likely to be background
    if (sizeRatio > 0.6) return false
    
    // Check if region is at image edges
    const edgePixels = region.pixels.filter(pixelIdx => {
      const x = pixelIdx % width
      const y = Math.floor(pixelIdx / width)
      return x === 0 || x === width - 1 || y === 0 || y === height - 1
    }).length
    
    const edgeRatio = edgePixels / regionSize
    
    // Regions touching edges are more likely background
    if (edgeRatio > 0.1) return false
    
    // Small, central regions are more likely objects
    return sizeRatio < 0.3
  }

  private static sampleBackgroundColors(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ r: number; g: number; b: number }> {
    const samples = []
    const margin = Math.min(width, height) * 0.03
    
    // Enhanced sampling from edges
    for (let i = 0; i < 50; i++) {
      // Top edge
      const topX = Math.floor(Math.random() * width)
      const topY = Math.floor(Math.random() * margin)
      let idx = (topY * width + topX) * 4
      samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] })
      
      // Bottom edge
      const bottomX = Math.floor(Math.random() * width)
      const bottomY = height - 1 - Math.floor(Math.random() * margin)
      idx = (bottomY * width + bottomX) * 4
      samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] })
      
      // Left edge
      const leftX = Math.floor(Math.random() * margin)
      const leftY = Math.floor(Math.random() * height)
      idx = (leftY * width + leftX) * 4
      samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] })
      
      // Right edge
      const rightX = width - 1 - Math.floor(Math.random() * margin)
      const rightY = Math.floor(Math.random() * height)
      idx = (rightY * width + rightX) * 4
      samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] })
    }
    
    return samples
  }

  private static findDominantBackgroundColor(
    colors: Array<{ r: number; g: number; b: number }>
  ): { r: number; g: number; b: number } {
    // Enhanced clustering for background color detection
    const clusters = this.performKMeansClustering(colors, 4)
    
    // Find the cluster most likely to be background
    let bestCluster = clusters[0]
    let bestScore = 0
    
    clusters.forEach(cluster => {
      // Score based on frequency and edge presence
      const frequency = cluster.count / colors.length
      const edgeAffinity = this.calculateBackgroundAffinity(cluster.centroid)
      const score = frequency * 0.7 + edgeAffinity * 0.3
      
      if (score > bestScore) {
        bestScore = score
        bestCluster = cluster
      }
    })
    
    return bestCluster.centroid
  }

  private static performKMeansClustering(
    colors: Array<{ r: number; g: number; b: number }>,
    k: number
  ): Array<{ centroid: { r: number; g: number; b: number }; count: number }> {
    // Initialize centroids
    const centroids = []
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
    
    // Return clusters with counts
    return centroids.map((centroid, index) => ({
      centroid,
      count: colors.filter(color => {
        const distances = centroids.map(c => this.calculatePerceptualDistance(color, c))
        const minIndex = distances.indexOf(Math.min(...distances))
        return minIndex === index
      }).length
    }))
  }

  private static calculateBackgroundAffinity(color: { r: number; g: number; b: number }): number {
    const brightness = (color.r + color.g + color.b) / 3
    const saturation = (Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)) / Math.max(color.r, color.g, color.b)
    
    // Backgrounds are often bright and low saturation
    const brightnessScore = brightness / 255
    const saturationScore = 1 - saturation
    
    return (brightnessScore * 0.6 + saturationScore * 0.4)
  }

  private static calculatePerceptualDistance(
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number }
  ): number {
    // Enhanced perceptual color distance
    const deltaR = color1.r - color2.r
    const deltaG = color1.g - color2.g
    const deltaB = color1.b - color2.b
    
    // Weighted RGB distance (closer to human perception)
    return Math.sqrt(
      deltaR * deltaR * 0.3 +
      deltaG * deltaG * 0.59 +
      deltaB * deltaB * 0.11
    )
  }

  private static calculateEdgeStrength(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number
  ): number {
    if (x < 1 || x >= width - 1 || y < 1) return 0
    
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

  private static calculateEdgeProximity(x: number, y: number, width: number, height: number): number {
    const distanceFromEdge = Math.min(x, y, width - x, height - y)
    const maxDistance = Math.min(width, height) * 0.2
    
    return Math.max(0, 1 - distanceFromEdge / maxDistance)
  }

  private static calculateTextureUniformity(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const colors = []
    const radius = 4
    
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
    
    if (colors.length === 0) return 0
    
    const avgR = colors.reduce((sum, c) => sum + c.r, 0) / colors.length
    const avgG = colors.reduce((sum, c) => sum + c.g, 0) / colors.length
    const avgB = colors.reduce((sum, c) => sum + c.b, 0) / colors.length
    
    const variance = colors.reduce((sum, c) => {
      return sum + Math.pow(c.r - avgR, 2) + Math.pow(c.g - avgG, 2) + Math.pow(c.b - avgB, 2)
    }, 0) / colors.length
    
    return Math.max(0, 1 - variance / 8000)
  }

  private static async applyAdvancedPostProcessing(
    imageData: ImageData,
    options: BackgroundRemovalOptions
  ): Promise<void> {
    const { data, width, height } = imageData
    
    // Apply morphological operations
    this.applyMorphologicalOperations(data, width, height)
    
    // Apply edge refinement
    if (options.featherEdges !== false) {
      this.applyAdvancedFeathering(data, width, height, options.smoothing || 3)
    }
    
    // Remove noise and small artifacts
    this.removeSmallArtifacts(data, width, height)
    
    // Enhance edge quality
    if (options.preserveDetails !== false) {
      this.enhanceEdgeQuality(data, width, height)
    }
  }

  private static applyMorphologicalOperations(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    // Apply opening (erosion followed by dilation) to remove noise
    const radius = 1
    const tempAlpha = new Uint8ClampedArray(width * height)
    
    // Extract alpha channel
    for (let i = 0; i < width * height; i++) {
      tempAlpha[i] = data[i * 4 + 3]
    }
    
    // Erosion
    const eroded = new Uint8ClampedArray(tempAlpha)
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = y * width + x
        let minAlpha = 255
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nIdx = (y + dy) * width + (x + dx)
            minAlpha = Math.min(minAlpha, tempAlpha[nIdx])
          }
        }
        
        eroded[idx] = minAlpha
      }
    }
    
    // Dilation
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = y * width + x
        let maxAlpha = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nIdx = (y + dy) * width + (x + dx)
            maxAlpha = Math.max(maxAlpha, eroded[nIdx])
          }
        }
        
        tempAlpha[idx] = maxAlpha
      }
    }
    
    // Apply result back
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 3] = tempAlpha[i]
    }
  }

  private static applyAdvancedFeathering(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    smoothing: number
  ): void {
    const radius = Math.ceil(smoothing)
    const smoothed = new Uint8ClampedArray(width * height)
    
    // Advanced bilateral filtering for alpha channel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        const centerAlpha = data[idx * 4 + 3]
        
        let weightSum = 0
        let alphaSum = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx
              const neighborAlpha = data[nIdx * 4 + 3]
              
              // Spatial weight
              const spatialDistance = Math.sqrt(dx * dx + dy * dy)
              const spatialWeight = Math.exp(-spatialDistance / (radius * 0.5))
              
              // Alpha similarity weight
              const alphaDiff = Math.abs(centerAlpha - neighborAlpha)
              const alphaWeight = Math.exp(-alphaDiff / 50)
              
              const weight = spatialWeight * alphaWeight
              weightSum += weight
              alphaSum += neighborAlpha * weight
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

  private static removeSmallArtifacts(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const visited = new Uint8Array(width * height)
    const minRegionSize = Math.floor(width * height * 0.0005) // 0.05% of image
    
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

  private static enhanceEdgeQuality(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    // Enhance alpha channel edges for better quality
    const enhanced = new Uint8ClampedArray(width * height)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const centerAlpha = data[idx * 4 + 3]
        
        // Calculate local alpha gradient
        let maxGradient = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nIdx = (y + dy) * width + (x + dx)
            const neighborAlpha = data[nIdx * 4 + 3]
            const gradient = Math.abs(centerAlpha - neighborAlpha)
            maxGradient = Math.max(maxGradient, gradient)
          }
        }
        
        // Enhance edges
        if (maxGradient > 50 && centerAlpha > 0) {
          enhanced[idx] = Math.min(255, centerAlpha * 1.1)
        } else {
          enhanced[idx] = centerAlpha
        }
      }
    }
    
    // Apply enhanced alpha
    for (let i = 1; i < width - 1; i++) {
      for (let j = 1; j < height - 1; j++) {
        const idx = j * width + i
        data[idx * 4 + 3] = enhanced[idx]
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