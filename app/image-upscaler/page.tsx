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
      { value: "1.5", label: "1.5x (150%)" },
      { value: "2.0", label: "2x (200%)" },
      { value: "2.5", label: "2.5x (250%)" },
      { value: "3.0", label: "3x (300%)" },
      { value: "4.0", label: "4x (400%)" },
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
    defaultValue: 25,
    min: 0,
    max: 100,
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

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const scaleFactor = parseFloat(options.scaleFactor || "2.0")
        
        const upscaleOptions = {
          scaleFactor,
          algorithm: options.algorithm || "auto",
          enhanceDetails: options.enhanceDetails !== false,
          reduceNoise: options.reduceNoise !== false,
          sharpen: options.sharpen || 25,
          quality: options.quality || 95,
          autoOptimize: options.algorithm === "auto",
          maxDimensions: { width: 3072, height: 3072 },
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
      })
    )

    return {
      success: true,
      processedFiles,
    }
  } catch (error) {
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