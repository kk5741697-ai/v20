"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { ZoomIn } from "lucide-react"
import { ImageProcessor } from "@/lib/processors/image-processor"

const upscaleOptions = [
  {
    key: "scaleFactor",
    label: "Scale Factor",
    type: "select" as const,
    defaultValue: "2x",
    selectOptions: [
      { value: "1.5x", label: "1.5x (150%)" },
      { value: "2x", label: "2x (200%)" },
      { value: "3x", label: "3x (300%)" },
      { value: "4x", label: "4x (400%)" },
    ],
    section: "Scaling",
  },
  {
    key: "algorithm",
    label: "Upscaling Algorithm",
    type: "select" as const,
    defaultValue: "lanczos",
    selectOptions: [
      { value: "nearest", label: "Nearest Neighbor (Fast)" },
      { value: "bilinear", label: "Bilinear (Balanced)" },
      { value: "bicubic", label: "Bicubic (High Quality)" },
      { value: "lanczos", label: "Lanczos (Best Quality)" },
    ],
    section: "Quality",
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
    key: "autoOptimize",
    label: "Auto Optimize",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Enhancement",
  },
  {
    key: "quality",
    label: "Output Quality",
    type: "slider" as const,
    defaultValue: 98,
    min: 80,
    max: 100,
    step: 1,
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

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        // Parse scale factor
        const scaleFactorStr = options.scaleFactor || "2x"
        const scaleFactor = parseFloat(scaleFactorStr.replace('x', ''))
        
        const upscaleOptions = {
          scaleFactor,
          algorithm: options.algorithm || "bicubic",
          enhanceDetails: Boolean(options.enhanceDetails),
          reduceNoise: Boolean(options.reduceNoise),
          sharpen: options.sharpen || 0,
          autoOptimize: Boolean(options.autoOptimize),
          outputFormat: "png", // Always PNG for best quality
        }

        const processedBlob = await ImageProcessor.upscaleImage(
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
      description="Enlarge images with AI-enhanced quality using advanced algorithms. Increase resolution while preserving details and reducing artifacts."
      icon={ZoomIn}
      toolType="upscale"
      processFunction={upscaleImages}
      options={upscaleOptions}
      maxFiles={5}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["png"]}
    />
  )
}