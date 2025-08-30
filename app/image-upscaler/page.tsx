"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { ZoomIn } from "lucide-react"
import { AdvancedImageProcessor } from "@/lib/processors/advanced-image-processor"

const upscaleOptions = [
  {
    key: "scaleFactor",
    label: "Scale Factor",
    type: "select" as const,
    defaultValue: "2.0",
    selectOptions: [
      { value: "1.25", label: "1.25x (125%)" },
      { value: "1.5", label: "1.5x (150%)" },
      { value: "2.0", label: "2x (200%)" },
      { value: "2.5", label: "2.5x (250%) - Small Images Only" },
    ],
    section: "Settings",
  },
  {
    key: "algorithm",
    label: "Upscaling Algorithm",
    type: "select" as const,
    defaultValue: "auto",
    selectOptions: [
      { value: "auto", label: "Auto (Recommended)" },
      { value: "lanczos", label: "Lanczos (Sharp Details)" },
      { value: "bicubic", label: "Bicubic (Smooth)" },
      { value: "super-resolution", label: "Super Resolution (Best Quality)" },
      { value: "waifu2x", label: "Waifu2x (Anime/Art)" },
      { value: "esrgan", label: "ESRGAN (Photo Enhancement)" },
    ],
    section: "Algorithm",
  },
  {
    key: "enhanceDetails",
    label: "Enhance Details",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Enhancement",
  },
  {
    key: "reduceNoise",
    label: "Reduce Noise",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Enhancement",
  },
  {
    key: "sharpen",
    label: "Sharpening",
    type: "slider" as const,
    defaultValue: 20,
    min: 0,
    max: 50,
    step: 5,
    section: "Enhancement",
  },
  {
    key: "quality",
    label: "Output Quality",
    type: "slider" as const,
    defaultValue: 95,
    min: 70,
    max: 100,
    step: 5,
    section: "Settings",
  },
]

async function upscaleImages(files: any[], options: any) {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: "No files to process",
      }
    }

    // Enhanced safety checks for upscaling
    const largeFiles = files.filter((f: any) => f.file.size > 8 * 1024 * 1024)
    if (largeFiles.length > 0) {
      return {
        success: false,
        error: `${largeFiles.length} file(s) are too large for upscaling. Please use images smaller than 8MB.`,
      }
    }
    
    const scaleFactor = parseFloat(options.scaleFactor || "2.0")
    const veryLargeFiles = files.filter((f: any) => {
      const estimatedSize = f.dimensions ? f.dimensions.width * f.dimensions.height * scaleFactor * scaleFactor : 0
      return estimatedSize > 1536 * 1536
    })
    
    if (veryLargeFiles.length > 0 && scaleFactor > 2) {
      return {
        success: false,
        error: `Scale factor too high for image size. Please use 2x or lower for large images.`,
      }
    }
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          const scaleFactor = parseFloat(options.scaleFactor || "2.0")
        
          const upscaleOptions = {
            scaleFactor,
            algorithm: options.algorithm || "auto",
            enhanceDetails: options.enhanceDetails !== false,
            reduceNoise: options.reduceNoise !== false,
            sharpen: Math.min(options.sharpen || 20, 50), // Cap sharpening
            quality: options.quality || 95,
            autoOptimize: options.algorithm === "auto",
            maxDimensions: { width: 1536, height: 1536 }, // Reduced for stability
            memoryOptimized: true,
            progressCallback: (progress: number) => {
              console.log(`Upscaling: ${Math.round(progress)}%`)
            }
          }

          const processedBlob = await AdvancedImageProcessor.upscaleImageAdvanced(
            file.originalFile || file.file,
            upscaleOptions
          )

          const processedUrl = URL.createObjectURL(processedBlob)
        
          const baseName = file.name.split(".")[0]
          const newName = `${baseName}_${scaleFactor}x_upscaled.png`

          // Calculate new dimensions
          const newDimensions = file.dimensions ? {
            width: Math.round(file.dimensions.width * scaleFactor),
            height: Math.round(file.dimensions.height * scaleFactor)
          } : undefined

          return {
            ...file,
            processed: true,
            processedPreview: processedUrl,
            name: newName,
            processedSize: processedBlob.size,
            blob: processedBlob,
            dimensions: newDimensions
          }
        } catch (error) {
          console.error(`Failed to upscale ${file.name}:`, error)
          return {
            ...file,
            processed: false,
            error: error instanceof Error ? error.message : "Upscaling failed"
          }
        }
      })
    )

    // Filter out failed files
    const successfulFiles = processedFiles.filter(f => f.processed)
    const failedFiles = processedFiles.filter(f => !f.processed)
    
    if (failedFiles.length > 0) {
      console.warn(`${failedFiles.length} files failed to upscale`)
    }
    
    if (successfulFiles.length === 0) {
      return {
        success: false,
        error: "All files failed to upscale. Please try with smaller images or lower scale factors.",
      }
    }
    return {
      success: true,
      processedFiles: successfulFiles,
    }
  } catch (error) {
    console.error("Upscaling batch failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upscale images",
    }
  }
}

export default function ImageUpscalerPage() {
  return (
    <ImageToolsLayout
      title="Image Upscaler"
      description="Enlarge images with advanced AI algorithms. Choose from specialized models for different content types including photos, art, and graphics."
      icon={ZoomIn}
      toolType="upscale"
      processFunction={upscaleImages}
      options={upscaleOptions}
      maxFiles={5}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["png", "jpeg", "webp"]}
    />
  )
}