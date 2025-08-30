"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { ZoomIn } from "lucide-react"
import { UltimateImageUpscaler } from "@/lib/processors/ultimate-upscaler"

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
      { value: "3.0", label: "3x (300%)" },
      { value: "4.0", label: "4x (400%) - Small Images Only" },
    ],
    section: "Scale Settings",
  },
  {
    key: "primaryAlgorithm",
    label: "Primary AI Algorithm",
    type: "select" as const,
    defaultValue: "auto",
    selectOptions: [
      { value: "auto", label: "Auto (Recommended)" },
      { value: "esrgan", label: "ESRGAN (Photos)" },
      { value: "real-esrgan", label: "Real-ESRGAN (Compressed Photos)" },
      { value: "waifu2x", label: "Waifu2x (Anime/Art)" },
      { value: "srcnn", label: "SRCNN (Noise Reduction)" },
      { value: "edsr", label: "EDSR (High Quality)" },
      { value: "lanczos", label: "Lanczos (Text/Sharp)" },
    ],
    section: "Primary AI Model",
  },
  {
    key: "secondaryAlgorithm",
    label: "Secondary Algorithm",
    type: "select" as const,
    defaultValue: "bicubic",
    selectOptions: [
      { value: "lanczos", label: "Lanczos" },
      { value: "bicubic", label: "Bicubic" },
      { value: "mitchell", label: "Mitchell" },
      { value: "catmull-rom", label: "Catmull-Rom" },
    ],
    section: "Secondary Algorithm",
  },
  {
    key: "hybridMode",
    label: "Hybrid Processing",
    type: "checkbox" as const,
    defaultValue: true,
    section: "AI Models",
  },
  {
    key: "enableContentAnalysis",
    label: "Content Analysis",
    type: "checkbox" as const,
    defaultValue: true,
    section: "AI Models",
  },
  {
    key: "contentType",
    label: "Content Type",
    type: "select" as const,
    defaultValue: "auto",
    selectOptions: [
      { value: "auto", label: "Auto Detect" },
      { value: "photo", label: "Photograph" },
      { value: "art", label: "Art/Anime" },
      { value: "text", label: "Text/Graphics" },
      { value: "mixed", label: "Mixed Content" },
    ],
    section: "Content Analysis",
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
    label: "Sharpening Amount",
    type: "slider" as const,
    defaultValue: 25,
    min: 0,
    max: 100,
    step: 5,
    section: "Enhancement",
  },
  {
    key: "colorEnhancement",
    label: "Color Enhancement",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Enhancement",
  },
  {
    key: "contrastBoost",
    label: "Contrast Boost",
    type: "slider" as const,
    defaultValue: 10,
    min: 0,
    max: 50,
    step: 5,
    section: "Enhancement",
  },
  {
    key: "multiPass",
    label: "Multi-Pass Processing",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Quality",
  },
  {
    key: "chunkProcessing",
    label: "Memory Optimized",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Performance",
  },
  {
    key: "quality",
    label: "Output Quality",
    type: "slider" as const,
    defaultValue: 95,
    min: 80,
    max: 100,
    step: 5,
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

    // Enhanced safety checks for upscaling
    const largeFiles = files.filter((f: any) => f.file.size > 15 * 1024 * 1024)
    if (largeFiles.length > 0) {
      return {
        success: false,
        error: `${largeFiles.length} file(s) are too large. Please use images smaller than 15MB.`,
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
          
          const ultimateOptions = {
            scaleFactor,
            maxOutputDimension: 4096,
            primaryAlgorithm: options.primaryAlgorithm || "auto",
            secondaryAlgorithm: options.secondaryAlgorithm || "bicubic",
            hybridMode: options.hybridMode !== false,
            enableContentAnalysis: options.enableContentAnalysis !== false,
            contentType: options.contentType || "auto",
            enhanceDetails: options.enhanceDetails !== false,
            reduceNoise: options.reduceNoise !== false,
            sharpenAmount: options.sharpenAmount || 25,
            colorEnhancement: options.colorEnhancement !== false,
            contrastBoost: options.contrastBoost || 10,
            multiPass: options.multiPass !== false,
            memoryOptimized: true,
            chunkProcessing: options.chunkProcessing !== false,
            outputFormat: "png",
            quality: options.quality || 95,
            progressCallback: (progress: number, stage: string) => {
              console.log(`Ultimate Upscaling: ${Math.round(progress)}% - ${stage}`)
            },
            debugMode: false
          }

          const result = await UltimateImageUpscaler.upscaleImage(
            file.originalFile || file.file,
            ultimateOptions
          )

          const processedUrl = URL.createObjectURL(result.processedBlob)
        
          const baseName = file.name.split(".")[0]
          const newName = `${baseName}_${result.actualScaleFactor}x_ultimate_upscaled.png`

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
      description="Ultimate AI-powered image upscaling with multiple algorithms, content analysis, and professional-grade enhancement. Supports photos, art, text, and mixed content."
      icon={ZoomIn}
      toolType="upscale"
      processFunction={upscaleImages}
      options={upscaleOptions}
      maxFiles={3}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["png", "jpeg", "webp"]}
    />
  )
}