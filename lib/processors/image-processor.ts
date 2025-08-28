// Enhanced image processing utilities with full functionality
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
  scaleFactor?: string
  algorithm?: string
  enhanceDetails?: boolean
  reduceNoise?: boolean
  sharpen?: number
  autoOptimize?: boolean
  removeMetadata?: boolean
  resizeWidth?: number
  resizeHeight?: number
  customRotation?: number
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
  static async resizeImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
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
          let { width: targetWidth, height: targetHeight } = options
          const { naturalWidth: originalWidth, naturalHeight: originalHeight } = img

          // Handle resize width/height from options
          if (options.resizeWidth && options.resizeWidth > 0) {
            targetWidth = options.resizeWidth
          }
          if (options.resizeHeight && options.resizeHeight > 0) {
            targetHeight = options.resizeHeight
          }

          // Calculate dimensions based on resize mode
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

          // Apply background color if needed
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

          // Handle rotation (including custom rotation)
          const rotationAngle = options.customRotation !== undefined ? options.customRotation : (options.rotation || 0)
          if (rotationAngle) {
            const angle = (rotationAngle * Math.PI) / 180
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate(angle)
            ctx.translate(-canvas.width / 2, -canvas.height / 2)
          }

          // Apply filters if specified
          if (options.filters) {
            const filters = []
            const { brightness, contrast, saturation, blur, sepia, grayscale } = options.filters

            if (brightness !== undefined && brightness !== 100) filters.push(`brightness(${brightness}%)`)
            if (contrast !== undefined && contrast !== 100) filters.push(`contrast(${contrast}%)`)
            if (saturation !== undefined && saturation !== 100) filters.push(`saturate(${saturation}%)`)
            if (blur !== undefined && blur > 0) filters.push(`blur(${blur}px)`)
            if (sepia) filters.push("sepia(100%)")
            if (grayscale) filters.push("grayscale(100%)")

            if (filters.length > 0) {
              ctx.filter = filters.join(" ")
            }
          }

          // Enhanced image rendering with better quality
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          ctx.restore()

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
      img.src = URL.createObjectURL(file)
    })
  }

  static async compressImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
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
          let canvasWidth = img.naturalWidth
          let canvasHeight = img.naturalHeight

          // Apply compression level scaling
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

          // Apply background color for JPEG
          if (options.outputFormat === "jpeg") {
            ctx.fillStyle = options.backgroundColor || "#ffffff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          // Enhanced rendering for better compression
          ctx.imageSmoothingEnabled = options.compressionLevel !== "maximum"
          ctx.imageSmoothingQuality = options.compressionLevel === "maximum" ? "low" : "high"
          
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)

          // Calculate quality based on compression level
          let quality = (options.quality || 80) * qualityMultiplier
          
          // Ensure minimum quality bounds
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
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          // Better crop area validation and handling
          let validCropArea
          
          if (cropArea && typeof cropArea === 'object') {
            validCropArea = {
              x: Math.max(0, Math.min(95, cropArea.x || 10)),
              y: Math.max(0, Math.min(95, cropArea.y || 10)),
              width: Math.max(5, Math.min(90, cropArea.width || 80)),
              height: Math.max(5, Math.min(90, cropArea.height || 80))
            }
          } else {
            // Default crop area if none provided
            validCropArea = { x: 10, y: 10, width: 80, height: 80 }
          }

          // Ensure crop area doesn't exceed image bounds
          if (validCropArea.x + validCropArea.width > 100) {
            validCropArea.width = 100 - validCropArea.x
          }
          if (validCropArea.y + validCropArea.height > 100) {
            validCropArea.height = 100 - validCropArea.y
          }

          // Convert percentage to pixels
          const cropX = (validCropArea.x / 100) * img.naturalWidth
          const cropY = (validCropArea.y / 100) * img.naturalHeight
          const cropWidth = (validCropArea.width / 100) * img.naturalWidth
          const cropHeight = (validCropArea.height / 100) * img.naturalHeight

          // Ensure crop dimensions are valid and within image bounds
          const finalCropX = Math.max(0, Math.min(img.naturalWidth - 1, cropX))
          const finalCropY = Math.max(0, Math.min(img.naturalHeight - 1, cropY))
          const finalCropWidth = Math.min(cropWidth, img.naturalWidth - finalCropX)
          const finalCropHeight = Math.min(cropHeight, img.naturalHeight - finalCropY)

          if (finalCropWidth <= 0 || finalCropHeight <= 0) {
            reject(new Error("Invalid crop area - dimensions too small"))
            return
          }

          canvas.width = Math.max(1, Math.floor(finalCropWidth))
          canvas.height = Math.max(1, Math.floor(finalCropHeight))

          // Fill background if specified
          if (options.backgroundColor) {
            ctx.fillStyle = options.backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          // Enhanced cropping with better quality
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          // Draw cropped image
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
      img.src = URL.createObjectURL(file)
    })
  }

  static async rotateImage(file: File, options: ImageProcessingOptions): Promise<Blob> {
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
          // Handle custom rotation properly
          const angle = options.customRotation !== undefined ? 
            (options.customRotation * Math.PI) / 180 : 
            ((options.rotation || 0) * Math.PI) / 180
            
          const { naturalWidth: width, naturalHeight: height } = img

          // Calculate new canvas dimensions after rotation
          const cos = Math.abs(Math.cos(angle))
          const sin = Math.abs(Math.sin(angle))
          const newWidth = Math.ceil(width * cos + height * sin)
          const newHeight = Math.ceil(width * sin + height * cos)

          canvas.width = newWidth
          canvas.height = newHeight

          // Fill background if specified
          if (options.backgroundColor) {
            ctx.fillStyle = options.backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          // Enhanced rotation with better quality
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          // Move to center and rotate
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
      img.src = URL.createObjectURL(file)
    })
  }

  static async addWatermark(file: File, watermarkText: string, options: ImageProcessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx || !watermarkText) {
        reject(new Error("Canvas not supported or watermark text not specified"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight

          ctx.drawImage(img, 0, 0)

          // Better font size calculation
          const baseFontSize = Math.min(canvas.width, canvas.height) * 0.08
          const fontSizeMultiplier = (options.quality || 50) / 50
          const fontSize = Math.max(12, baseFontSize * fontSizeMultiplier)
          
          ctx.font = `bold ${fontSize}px Arial`
          ctx.fillStyle = options.textColor || "#ffffff"
          ctx.globalAlpha = Math.max(0.1, Math.min(1.0, options.watermarkOpacity || 0.5))

          // Position watermark
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
              ctx.save()
              ctx.translate(canvas.width / 2, canvas.height / 2)
              ctx.rotate(-Math.PI / 4)
              x = 0
              y = 0
              ctx.textAlign = "center"
              break
            default: // center
              ctx.textAlign = "center"
              break
          }

          ctx.textBaseline = "middle"

          // Add text shadow if enabled
          if (options.shadowEnabled) {
            ctx.shadowColor = "rgba(0, 0, 0, 0.8)"
            ctx.shadowBlur = 6
            ctx.shadowOffsetX = 3
            ctx.shadowOffsetY = 3
          }

          ctx.fillText(watermarkText, x, y)

          if (options.position === "diagonal") {
            ctx.restore()
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
      img.src = URL.createObjectURL(file)
    })
  }

  static async removeBackground(file: File, options: ImageProcessingOptions): Promise<Blob> {
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

          // Enhanced background removal with proper sensitivity handling
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Sample multiple edge pixels to determine background color
          const samplePoints = [
            [0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1],
            [Math.floor(canvas.width / 2), 0], [Math.floor(canvas.width / 2), canvas.height - 1],
            [0, Math.floor(canvas.height / 2)], [canvas.width - 1, Math.floor(canvas.height / 2)]
          ]

          const bgColors = samplePoints.map(([x, y]) => {
            const index = (y * canvas.width + x) * 4
            return [data[index], data[index + 1], data[index + 2]]
          })

          // Find most common background color
          const bgColor = bgColors[0] // Simplified - use corner color

          // Enhanced sensitivity and smoothing with proper ranges
          const sensitivity = Math.max(10, Math.min(100, options.sensitivity || 30))
          const threshold = sensitivity * 3.5
          const smoothing = Math.max(0, Math.min(10, options.smoothing || 2))

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]

            const colorDistance = Math.sqrt(
              Math.pow(r - bgColor[0], 2) + Math.pow(g - bgColor[1], 2) + Math.pow(b - bgColor[2], 2),
            )

            if (colorDistance < threshold) {
              // Apply feathering for smoother edges if enabled
              if (options.featherEdges) {
                const fadeDistance = threshold * 0.4
                if (colorDistance > threshold - fadeDistance) {
                  const alpha = ((colorDistance - (threshold - fadeDistance)) / fadeDistance) * 255
                  data[i + 3] = Math.min(255, alpha)
                } else {
                  data[i + 3] = 0 // Make transparent
                }
              } else {
                data[i + 3] = 0 // Make transparent
              }
            } else {
              // Preserve original alpha for non-background pixels
              if (options.preserveDetails) {
                data[i + 3] = Math.min(255, data[i + 3])
              }
            }
          }

          // Apply smoothing if enabled
          if (smoothing > 0) {
            this.applyEdgeSmoothing(data, canvas.width, canvas.height, smoothing)
          }

          ctx.putImageData(imageData, 0, 0)

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Failed to create blob"))
            }
          }, "image/png") // Always use PNG for transparency
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(file)
    })
  }

  private static applyEdgeSmoothing(data: Uint8ClampedArray, width: number, height: number, intensity: number): void {
    const smoothedData = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = (y * width + x) * 4
        
        // Only smooth alpha channel for edge pixels
        if (data[index + 3] > 0 && data[index + 3] < 255) {
          let alphaSum = 0
          let count = 0
          
          // Sample surrounding pixels
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const neighborIndex = ((y + dy) * width + (x + dx)) * 4
              alphaSum += data[neighborIndex + 3]
              count++
            }
          }
          
          const avgAlpha = alphaSum / count
          const smoothingFactor = intensity / 10
          smoothedData[index + 3] = Math.round(data[index + 3] * (1 - smoothingFactor) + avgAlpha * smoothingFactor)
        }
      }
    }
    
    // Copy smoothed data back
    for (let i = 0; i < data.length; i++) {
      data[i] = smoothedData[i]
    }
  }

  static async convertFormat(file: File, outputFormat: "jpeg" | "png" | "webp", options: ImageProcessingOptions): Promise<Blob> {
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
          let { width: targetWidth, height: targetHeight } = options
          const { naturalWidth: originalWidth, naturalHeight: originalHeight } = img

          // Handle resizing during conversion
          if (options.resizeWidth && options.resizeWidth > 0) {
            targetWidth = options.resizeWidth
          }
          if (options.resizeHeight && options.resizeHeight > 0) {
            targetHeight = options.resizeHeight
          }

          if (targetWidth && targetHeight) {
            if (options.maintainAspectRatio) {
              const aspectRatio = originalWidth / originalHeight
              if (targetWidth / targetHeight > aspectRatio) {
                targetWidth = targetHeight * aspectRatio
              } else {
                targetHeight = targetWidth / aspectRatio
              }
            }
          } else {
            targetWidth = originalWidth
            targetHeight = originalHeight
          }

          canvas.width = Math.max(1, Math.floor(targetWidth))
          canvas.height = Math.max(1, Math.floor(targetHeight))

          // Add background color for formats that don't support transparency
          if (options.backgroundColor && outputFormat !== "png") {
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

          // Handle rotation (including custom rotation)
          const rotationAngle = options.customRotation !== undefined ? options.customRotation : (options.rotation || 0)
          if (rotationAngle) {
            const rotAngle = (rotationAngle * Math.PI) / 180
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate(rotAngle)
            ctx.translate(-canvas.width / 2, -canvas.height / 2)
          }

          // Apply filters if specified
          if (options.filters) {
            const filters = []
            const { brightness, contrast, saturation, blur, sepia, grayscale } = options.filters

            if (brightness !== undefined && brightness !== 100) filters.push(`brightness(${brightness}%)`)
            if (contrast !== undefined && contrast !== 100) filters.push(`contrast(${contrast}%)`)
            if (saturation !== undefined && saturation !== 100) filters.push(`saturate(${saturation}%)`)
            if (blur !== undefined && blur > 0) filters.push(`blur(${blur}px)`)
            if (sepia) filters.push("sepia(100%)")
            if (grayscale) filters.push("grayscale(100%)")

            if (filters.length > 0) {
              ctx.filter = filters.join(" ")
            }
          }

          // Enhanced rendering
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          ctx.restore()

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
      img.src = URL.createObjectURL(file)
    })
  }

  static async applyFilters(file: File, options: ImageProcessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx || !options.filters) {
        reject(new Error("Canvas not supported or no filters specified"))
        return
      }

      const img = new Image()
      img.onload = () => {
        try {
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight

          // Enhanced filter application
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

          // Enhanced rendering
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
      img.src = URL.createObjectURL(file)
    })
  }
}