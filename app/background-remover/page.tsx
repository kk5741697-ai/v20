"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Eraser } from "lucide-react"
import { AdvancedBackgroundProcessor } from "@/lib/processors/advanced-background-processor"

const backgroundOptions = [
  {
    key: "algorithm",
    label: "Algorithm",
    type: "select" as const,
    defaultValue: "auto",
    selectOptions: [
      { value: "auto", label: "Auto (Recommended)" },
      { value: "portrait", label: "Portrait Mode" },
      { value: "object", label: "Object Detection" },
      { value: "precise", label: "Precise Edge" },
    ],
    section: "Detection",
  },
  {
    key: "sensitivity",
    label: "Edge Sensitivity",
    type: "slider" as const,
    defaultValue: 25,
    min: 10,
    max: 50,
    step: 5,
    section: "Detection",
  },
  {
    key: "featherEdges",
    label: "Feather Edges",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Refinement",
  },
  {
    key: "preserveDetails",
    label: "Preserve Details",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Refinement",
  },
  {
    key: "smoothing",
    label: "Edge Smoothing",
    type: "slider" as const,
    defaultValue: 2,
    min: 0,
    max: 10,
    step: 1,
    section: "Refinement",
  },
  {
    key: "outputFormat",
    label: "Output Format",
    type: "select" as const,
    defaultValue: "png",
    selectOptions: [
      { value: "png", label: "PNG (Transparent)" },
      { value: "webp", label: "WebP (Smaller)" },
    ],
    section: "Output",
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
          algorithm: options.algorithm || "auto",
          sensitivity: options.sensitivity || 25,
          featherEdges: options.featherEdges !== false,
          preserveDetails: options.preserveDetails !== false,
          smoothing: options.smoothing || 2,
          outputFormat: options.outputFormat || "png",
          memoryOptimized: true,
          maxDimensions: { width: 2048, height: 2048 },
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
      description="Remove image backgrounds automatically with AI-powered edge detection. Perfect for product photos and portraits."
      icon={Eraser}
      toolType="background-removal"
      processFunction={removeBackgrounds}
      options={backgroundOptions}
      maxFiles={5}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["png", "webp"]}
    />
  )
}