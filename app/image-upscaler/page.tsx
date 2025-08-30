"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { ZoomIn } from "lucide-react"
import { AdvancedImageProcessor } from "@/lib/processors/advanced-image-processor"

const upscaleOptions = [
  {
    key: "scaleFactor",
    label: "Scale Factor",
    type: "select" as const,
    defaultValue: "2x",
    selectOptions: [
      { value: "1.5x", label: "1.5x (150%)" },
      { value: "2x", label: "2x (200%)" },
      { value: "2.5x", label: "2.5x (250%)" },
    ],
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
        // Parse scale factor
        const scaleFactorStr = options.scaleFactor || "2x"
        const scaleFactor = parseFloat(scaleFactorStr.replace('x', ''))
        
        const upscaleOptions = {
          scaleFactor,
          algorithm: "auto", // Always use auto for best results
          enhanceDetails: true,
          reduceNoise: true,
          sharpen: 25,
          autoOptimize: true,
          maxDimensions: { width: 2048, height: 2048 }, // Safer limits
          memoryOptimized: true,
        }

        const processedBlob = await AdvancedImageProcessor.upscaleImageAdvanced(
          file.originalFile || file.file,
          upscaleOptions
        )

        const processedUrl = URL.createObjectURL(processedBlob)
        
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_${scaleFactorStr}_upscaled.png`

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
      description="Automatically enlarge images with AI-enhanced quality. Smart algorithm selection and automatic optimization for best results without complexity."
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