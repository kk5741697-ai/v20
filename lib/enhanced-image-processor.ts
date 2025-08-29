// Enhanced image processing with advanced features and better performance
export interface EnhancedImageOptions {
  // Basic options
  quality?: number
  width?: number
  height?: number
  maintainAspectRatio?: boolean
  outputFormat?: "jpeg" | "png" | "webp" | "avif"
  backgroundColor?: string
  
  // Advanced processing
  smartResize?: boolean
  preserveExif?: boolean
  optimizeForWeb?: boolean
  progressive?: boolean
  
  // Filters and effects
  filters?: {
    brightness?: number
    contrast?: number
    saturation?: number
    hue?: number
    blur?: number
    sharpen?: number
    noise?: number
    vignette?: number
    sepia?: boolean
    grayscale?: boolean
    invert?: boolean
  }
  
  // Transformations
  rotation?: number
  flipHorizontal?: boolean
  flipVertical?: boolean
  
  // Cropping
  cropArea?: { x: number; y: number; width: number; height: number }
  cropMode?: "percentage" | "pixels"
  
  // Watermarking
  watermark?: {
    text?: string
    image?: string
    position?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "diagonal"
    opacity?: number
    fontSize?: number
    color?: string
    shadow?: boolean
  }
  
  // Background removal
  backgroundRemoval?: {
    enabled?: boolean
    sensitivity?: number
    featherEdges?: boolean
    preserveDetails?: boolean
  }
  
  // Compression
  compression?: {
    level?: "low" | "medium" | "high" | "maximum"
    lossless?: boolean
    effort?: number
  }
}

export class EnhancedImageProcessor {
  static async processImage(file: File, options: EnhancedImageOptions): Promise<Blob> {
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
      img.onload = () => {
        try {
          // Calculate target dimensions
          let targetWidth = options.width || img.naturalWidth
          let targetHeight = options.height || img.naturalHeight
          
          // Smart resize based on content
          if (options.smartResize) {
            const aspectRatio = img.naturalWidth / img.naturalHeight
            if (options.width && !options.height) {
              targetHeight = options.width / aspectRatio
            } else if (options.height && !options.width) {
              targetWidth = options.height * aspectRatio
            }
          }
          
          // Apply aspect ratio constraints
          if (options.maintainAspectRatio && options.width && options.height) {
            const aspectRatio = img.naturalWidth / img.naturalHeight
            if (targetWidth / targetHeight > aspectRatio) {
              targetWidth = targetHeight * aspectRatio
            } else {
              targetHeight = targetWidth / aspectRatio
            }
          }

          canvas.width = Math.max(1, Math.floor(targetWidth))
          canvas.height = Math.max(1, Math.floor(targetHeight))

          // Apply background color
          if (options.backgroundColor && options.outputFormat !== "png") {
            ctx.fillStyle = options.backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          // Apply transformations
          ctx.save()
          
          // Handle flipping
          let scaleX = 1, scaleY = 1
          if (options.flipHorizontal) scaleX = -1
          if (options.flipVertical) scaleY = -1
          
          if (scaleX !== 1 || scaleY !== 1) {
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.scale(scaleX, scaleY)
            ctx.translate(-canvas.width / 2, -canvas.height / 2)
          }

          // Handle rotation
          if (options.rotation) {
            const angle = (options.rotation * Math.PI) / 180
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate(angle)
            ctx.translate(-canvas.width / 2, -canvas.height / 2)
          }

          // Apply filters
          if (options.filters) {
            const filters = this.buildFilterString(options.filters)
            if (filters) {
              ctx.filter = filters
            }
          }

          // Enhanced rendering
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          
          // Handle cropping
          if (options.cropArea) {
            const crop = options.cropArea
            let sourceX, sourceY, sourceWidth, sourceHeight
            
            if (options.cropMode === "pixels") {
              sourceX = crop.x
              sourceY = crop.y
              sourceWidth = crop.width
              sourceHeight = crop.height
            } else {
              // Percentage mode (default)
              sourceX = (crop.x / 100) * img.naturalWidth
              sourceY = (crop.y / 100) * img.naturalHeight
              sourceWidth = (crop.width / 100) * img.naturalWidth
              sourceHeight = (crop.height / 100) * img.naturalHeight
            }
            
            ctx.drawImage(
              img,
              sourceX, sourceY, sourceWidth, sourceHeight,
              0, 0, canvas.width, canvas.height
            )
          } else {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          }
          
          ctx.restore()

          // Apply watermark if specified
          if (options.watermark?.text || options.watermark?.image) {
            this.applyWatermark(ctx, canvas, options.watermark)
          }

          // Apply post-processing effects
          if (options.filters?.sharpen && options.filters.sharpen > 0) {
            this.applySharpen(ctx, canvas, options.filters.sharpen)
          }

          if (options.filters?.noise && options.filters.noise > 0) {
            this.applyNoise(ctx, canvas, options.filters.noise)
          }

          if (options.filters?.vignette && options.filters.vignette > 0) {
            this.applyVignette(ctx, canvas, options.filters.vignette)
          }

          // Determine output quality
          let quality = (options.quality || 90) / 100
          
          if (options.compression) {
            switch (options.compression.level) {
              case "low": quality *= 0.95; break
              case "medium": quality *= 0.8; break
              case "high": quality *= 0.6; break
              case "maximum": quality *= 0.3; break
            }
          }

          quality = Math.max(0.1, Math.min(1.0, quality))
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

  private static buildFilterString(filters: NonNullable<EnhancedImageOptions["filters"]>): string {
    const filterArray = []
    
    if (filters.brightness !== undefined && filters.brightness !== 100) {
      filterArray.push(`brightness(${Math.max(0, Math.min(300, filters.brightness))}%)`)
    }
    if (filters.contrast !== undefined && filters.contrast !== 100) {
      filterArray.push(`contrast(${Math.max(0, Math.min(300, filters.contrast))}%)`)
    }
    if (filters.saturation !== undefined && filters.saturation !== 100) {
      filterArray.push(`saturate(${Math.max(0, Math.min(300, filters.saturation))}%)`)
    }
    if (filters.hue !== undefined && filters.hue !== 0) {
      filterArray.push(`hue-rotate(${filters.hue}deg)`)
    }
    if (filters.blur !== undefined && filters.blur > 0) {
      filterArray.push(`blur(${Math.max(0, Math.min(50, filters.blur))}px)`)
    }
    if (filters.sepia) {
      filterArray.push("sepia(100%)")
    }
    if (filters.grayscale) {
      filterArray.push("grayscale(100%)")
    }
    if (filters.invert) {
      filterArray.push("invert(100%)")
    }

    return filterArray.join(" ")
  }

  private static applyWatermark(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    watermark: NonNullable<EnhancedImageOptions["watermark"]>
  ): void {
    if (!watermark.text && !watermark.image) return

    ctx.save()
    ctx.globalAlpha = watermark.opacity || 0.5

    if (watermark.text) {
      const fontSize = watermark.fontSize || Math.min(canvas.width, canvas.height) * 0.05
      ctx.font = `bold ${fontSize}px Arial`
      ctx.fillStyle = watermark.color || "#ffffff"
      
      if (watermark.shadow) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)"
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
      }

      let x: number, y: number
      
      switch (watermark.position) {
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
        default: // center
          x = canvas.width / 2
          y = canvas.height / 2
          ctx.textAlign = "center"
          break
      }

      ctx.textBaseline = "middle"
      ctx.fillText(watermark.text, x, y)
    }

    ctx.restore()
  }

  private static applySharpen(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    intensity: number
  ): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = canvas.width
    const height = canvas.height
    
    // Sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]
    
    const factor = intensity / 100
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
          
          output[idx + c] = Math.max(0, Math.min(255, 
            data[idx + c] * (1 - factor) + sum * factor
          ))
        }
      }
    }
    
    ctx.putImageData(new ImageData(output, width, height), 0, 0)
  }

  private static applyNoise(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    intensity: number
  ): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const factor = intensity / 100
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 255 * factor
      data[i] = Math.max(0, Math.min(255, data[i] + noise))     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)) // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)) // B
    }
    
    ctx.putImageData(imageData, 0, 0)
  }

  private static applyVignette(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    intensity: number
  ): void {
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
    
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxDistance
    )
    
    const alpha = intensity / 100
    gradient.addColorStop(0, `rgba(0, 0, 0, 0)`)
    gradient.addColorStop(0.7, `rgba(0, 0, 0, ${alpha * 0.3})`)
    gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`)
    
    ctx.globalCompositeOperation = "multiply"
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = "source-over"
  }

  // Batch processing for multiple images
  static async batchProcess(
    files: File[], 
    options: EnhancedImageOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob[]> {
    const results: Blob[] = []
    
    for (let i = 0; i < files.length; i++) {
      try {
        const processed = await this.processImage(files[i], options)
        results.push(processed)
        
        if (onProgress) {
          onProgress(((i + 1) / files.length) * 100)
        }
      } catch (error) {
        console.error(`Failed to process ${files[i].name}:`, error)
        // Continue with other files
      }
    }
    
    return results
  }

  // Advanced background removal with AI-like edge detection
  static async removeBackgroundAdvanced(file: File, options: EnhancedImageOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          ctx.drawImage(img, 0, 0)

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Advanced edge detection and background removal
          const bgRemovalOptions = options.backgroundRemoval || {}
          const sensitivity = bgRemovalOptions.sensitivity || 30
          const featherEdges = bgRemovalOptions.featherEdges !== false
          const preserveDetails = bgRemovalOptions.preserveDetails !== false

          // Multi-point background sampling for better accuracy
          const samplePoints = this.getSamplePoints(canvas.width, canvas.height)
          const backgroundColors = samplePoints.map(([x, y]) => {
            const index = (y * canvas.width + x) * 4
            return [data[index], data[index + 1], data[index + 2]]
          })

          // Find dominant background color using clustering
          const dominantBgColor = this.findDominantColor(backgroundColors)
          
          // Apply advanced background removal
          this.removeBackgroundWithEdgeDetection(
            data, 
            canvas.width, 
            canvas.height, 
            dominantBgColor, 
            sensitivity,
            featherEdges,
            preserveDetails
          )

          ctx.putImageData(imageData, 0, 0)

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Failed to create blob"))
            }
          }, "image/png") // Always PNG for transparency
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file)
    })
  }

  private static getSamplePoints(width: number, height: number): Array<[number, number]> {
    return [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1], // corners
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1], // top/bottom center
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)], // left/right center
      [Math.floor(width / 4), 0], [Math.floor(3 * width / 4), 0], // additional edge points
      [0, Math.floor(height / 4)], [0, Math.floor(3 * height / 4)]
    ]
  }

  private static findDominantColor(colors: number[][]): number[] {
    // Simple clustering to find most common background color
    const colorCounts = new Map<string, { color: number[], count: number }>()
    
    colors.forEach(color => {
      const key = `${Math.floor(color[0] / 10)}-${Math.floor(color[1] / 10)}-${Math.floor(color[2] / 10)}`
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

  private static removeBackgroundWithEdgeDetection(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    bgColor: number[],
    sensitivity: number,
    featherEdges: boolean,
    preserveDetails: boolean
  ): void {
    const threshold = sensitivity * 3.5
    const edgeMap = new Uint8Array(width * height)
    
    // Edge detection pass
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        // Calculate color distance from background
        const colorDistance = Math.sqrt(
          Math.pow(data[pixelIdx] - bgColor[0], 2) +
          Math.pow(data[pixelIdx + 1] - bgColor[1], 2) +
          Math.pow(data[pixelIdx + 2] - bgColor[2], 2)
        )
        
        // Check neighboring pixels for edge detection
        let isEdge = false
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const neighborIdx = ((y + dy) * width + (x + dx)) * 4
            const neighborDistance = Math.sqrt(
              Math.pow(data[neighborIdx] - bgColor[0], 2) +
              Math.pow(data[neighborIdx + 1] - bgColor[1], 2) +
              Math.pow(data[neighborIdx + 2] - bgColor[2], 2)
            )
            
            if (Math.abs(colorDistance - neighborDistance) > threshold * 0.5) {
              isEdge = true
              break
            }
          }
          if (isEdge) break
        }
        
        edgeMap[idx] = isEdge ? 1 : 0
      }
    }
    
    // Apply background removal with edge awareness
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const x = pixelIdx % width
      const y = Math.floor(pixelIdx / width)
      
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      const colorDistance = Math.sqrt(
        Math.pow(r - bgColor[0], 2) + 
        Math.pow(g - bgColor[1], 2) + 
        Math.pow(b - bgColor[2], 2)
      )

      if (colorDistance < threshold) {
        if (featherEdges && edgeMap[pixelIdx]) {
          // Apply feathering for edge pixels
          const fadeDistance = threshold * 0.4
          if (colorDistance > threshold - fadeDistance) {
            const alpha = ((colorDistance - (threshold - fadeDistance)) / fadeDistance) * 255
            data[i + 3] = Math.min(255, alpha)
          } else {
            data[i + 3] = 0
          }
        } else {
          data[i + 3] = 0 // Make transparent
        }
      } else if (preserveDetails && edgeMap[pixelIdx]) {
        // Enhance edge details
        data[i + 3] = Math.min(255, data[i + 3] * 1.1)
      }
    }
  }

  // Image format optimization
  static async optimizeForFormat(blob: Blob, targetFormat: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = () => {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        
        // Format-specific optimizations
        switch (targetFormat) {
          case "webp":
            // WebP supports both lossy and lossless
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = "high"
            break
          case "avif":
            // AVIF has excellent compression
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = "high"
            break
          case "jpeg":
            // JPEG doesn't support transparency
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            break
        }
        
        ctx.drawImage(img, 0, 0)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Failed to optimize image"))
            }
          },
          `image/${targetFormat}`,
          0.9
        )
      }
      
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(blob)
    })
  }
}