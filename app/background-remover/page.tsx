"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Eraser } from "lucide-react"
import { AdvancedBackgroundProcessor } from "@/lib/processors/advanced-background-processor"

// Simplified options - fully automatic
const backgroundOptions = [
  {
    key: "outputFormat",
    label: "Output Format",
    type: "select" as const,
    defaultValue: "png",
    selectOptions: [
      { value: "png", label: "PNG (Transparent)" },
      { value: "webp", label: "WebP (Smaller)" },
    ],
    section: "Settings",
  },
]

async function removeBackgrounds(files: any[], options: any) {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: "No files to process",
      }
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const backgroundOptions = {
          algorithm: "auto", // Always use auto for best results
          sensitivity: 25, // Optimal default
          featherEdges: true,
          preserveDetails: true,
          smoothing: 3,
          outputFormat: options.outputFormat || "png",
          memoryOptimized: true,
          maxDimensions: { width: 1024, height: 1024 }, // Safer limits
        }

        const result = await AdvancedBackgroundProcessor.removeBackground(
          file.originalFile || file.file,
          backgroundOptions
        )

        const processedUrl = URL.createObjectURL(result.processedBlob)
        
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_no_bg.${options.outputFormat || "png"}`

        return {
          ...file,
          processed: true,
          processedPreview: processedUrl,
          name: newName,
          processedSize: result.processedBlob.size,
          blob: result.processedBlob
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
      error: error instanceof Error ? error.message : "Failed to remove backgrounds",
    }
  }
}

export default function BackgroundRemoverPage() {
  return (
    <ImageToolsLayout
      title="Background Remover"
      description="Remove image backgrounds automatically with smart AI detection. Optimized for portraits, products, and objects with professional results."
      icon={Eraser}
      toolType="background-removal"
      processFunction={removeBackgrounds}
      options={backgroundOptions}
      maxFiles={3}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["png", "webp"]}
    />
  )
}