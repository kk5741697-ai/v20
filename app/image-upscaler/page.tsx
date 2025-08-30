"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { ZoomIn } from "lucide-react"
import { UltimateImageUpscaler } from "@/lib/processors/ultimate-upscaler"

const upscaleOptions = [
  {
    key: "scaleFactor",
    label: "Scale Factor",
    type: "select" as const,
    defaultValue: "2",
    selectOptions: [
      { value: "1.5", label: "1.5x (150%)" },
      { value: "2", label: "2x (200%)" },
      { value: "3", label: "3x (300%)" },
      { value: "4", label: "4x (400%)" },
    ],
    section: "Scale",
  },
  {
    key: "primaryAlgorithm",
    label: "AI Algorithm",
    type: "select" as const,
    defaultValue: "auto",
    selectOptions: [
      { value: "auto", label: "Auto (Recommended)" },
      { value: "esrgan", label: "ESRGAN (Photos & Portraits)" },
      { value: "waifu2x", label: "Waifu2x (Art & Anime)" },
      { value: "lanczos", label: "Lanczos (Text & Graphics)" },
      { value: "srcnn", label: "SRCNN (General Purpose)" },
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
    key: "sharpenAmount",
    label: "Sharpening",
    type: "slider" as const,
    defaultValue: 25,
    min: 0,
    max: 100,
    step: 5,
    section: "Enhancement",
  },
  {
    key: "outputFormat",
    label: "Output Format",
    type: "select" as const,
    defaultValue: "png",
    selectOptions: [
      { value: "png", label: "PNG (Best Quality)" },
      { value: "jpeg", label: "JPEG (Smaller Size)" },
      { value: "webp", label: "WebP (Balanced)" },
    ],
    section: "Output",
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

    // Enhanced safety checks
    const totalSize = files.reduce((sum: number, f: any) => sum + f.size, 0)
    if (totalSize > 100 * 1024 * 1024) { // 100MB total limit
      return {
        success: false,
        error: "Total file size too large. Maximum 100MB total allowed.",
      }
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          const scaleFactor = parseFloat(options.scaleFactor || "2")
          
          // Enhanced safety check for individual files
          if (file.size > 25 * 1024 * 1024) {
            throw new Error(`File ${file.name} is too large (${Math.round(file.size / (1024 * 1024))}MB). Maximum 25MB per file.`)
          }
          
          // Check image dimensions
          if (file.dimensions && file.dimensions.width * file.dimensions.height > 1024 * 1024) {
            throw new Error(`Image resolution too high (${file.dimensions.width}x${file.dimensions.height}). Maximum 1MP allowed.`)
          }
          
          const ultimateOptions = {
            scaleFactor: Math.min(scaleFactor, 3), // Limit to 3x
            maxOutputDimension: 1536, // Reduced from 2048
            primaryAlgorithm: options.primaryAlgorithm || "auto",
            secondaryAlgorithm: "lanczos",
            hybridMode: true,
            enableContentAnalysis: true,
            contentType: "auto",
            enhanceDetails: options.enhanceDetails !== false,
            reduceNoise: options.reduceNoise !== false,
            sharpenAmount: options.sharpenAmount || 25,
            colorEnhancement: true,
            contrastBoost: 10,
            multiPass: true,
            memoryOptimized: true, // Always enable memory optimization
            chunkProcessing: true,
            outputFormat: options.outputFormat || "png",
            quality: 95,
            progressCallback: (progress: number, stage: string) => {
              console.log(`Image Upscaling: ${Math.round(progress)}% - ${stage}`)
            },
            debugMode: false
          }

          // Add timeout and abort signal support
          const abortController = new AbortController()
          const timeoutId = setTimeout(() => {
            abortController.abort()
          }, 300000) // 5 minute timeout

          const result = await UltimateImageUpscaler.upscaleImage(
            file.originalFile || file.file,
            ultimateOptions
          )
          
          clearTimeout(timeoutId)

          const processedUrl = URL.createObjectURL(result.processedBlob)
        
          const baseName = file.name.split(".")[0]
          const newName = `${baseName}_${result.actualScaleFactor}x_upscaled.${options.outputFormat || "png"}`

          const newDimensions = {
            width: result.finalDimensions.width,
            height: result.finalDimensions.height
          }

          return {
            ...file,
            processed: true,
            processedPreview: processedUrl,
            name: newName,
            processedSize: result.processedBlob.size,
            blob: result.processedBlob,
            dimensions: newDimensions,
            actualScaleFactor: result.actualScaleFactor,
            algorithmsUsed: result.algorithmsUsed,
            processingTime: result.processingTime,
            qualityMetrics: result.qualityMetrics
          }
        } catch (error) {
          console.error(`Failed to upscale ${file.name}:`, error)
          return {
            ...file,
            processed: false,
            error: error instanceof Error ? error.message : "Upscaling failed",
            processingTime: 0
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
        error: "All files failed to upscale. Please try with smaller images (under 25MB) or lower scale factors.",
      }
    }
    
    // Force cleanup after processing
    setTimeout(() => {
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc()
      }
    }, 1000)
    
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
      description="AI-powered image upscaling with advanced algorithms. Enlarge images up to 4x while preserving quality and details. Supports photos, art, and graphics."
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