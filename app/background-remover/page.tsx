"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Scissors } from "lucide-react"
import { AdvancedImageProcessor } from "@/lib/processors/advanced-image-processor"

const backgroundRemovalOptions = [
  {
    key: "sensitivity",
    label: "Edge Sensitivity",
    type: "slider" as const,
    defaultValue: 25,
    min: 10,
    max: 100,
    step: 5,
  },
  {
    key: "smoothing",
    label: "Edge Smoothing",
    type: "slider" as const,
    defaultValue: 3,
    min: 0,
    max: 10,
    step: 1,
  },
  {
    key: "featherEdges",
    label: "Feather Edges",
    type: "checkbox" as const,
    defaultValue: true,
  },
  {
    key: "preserveDetails",
    label: "Preserve Fine Details",
    type: "checkbox" as const,
    defaultValue: true,
  },
  {
    key: "algorithm",
    label: "Detection Algorithm",
    type: "select" as const,
    defaultValue: "u2net-like",
    selectOptions: [
      { value: "u2net-like", label: "U²Net-like (Best Quality)" },
      { value: "modnet-like", label: "MODNet-like (Portraits)" },
      { value: "hybrid", label: "Hybrid (Balanced)" },
      { value: "edge-detection", label: "Edge Detection" },
    ],
  },
  {
    key: "memoryOptimized",
    label: "Memory Optimized (Large Images)",
    type: "checkbox" as const,
    defaultValue: true,
  },
]

async function removeBackground(files: any[], options: any) {
  try {
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const processedBlob = await AdvancedImageProcessor.removeBackgroundAdvanced(file.originalFile || file.file, {
          sensitivity: options.sensitivity || 25,
          featherEdges: Boolean(options.featherEdges),
          preserveDetails: Boolean(options.preserveDetails),
          smoothing: options.smoothing || 3,
          algorithm: options.algorithm || "u2net-like",
          maxDimensions: { width: 2048, height: 2048 },
          memoryOptimized: Boolean(options.memoryOptimized),
        })

        const processedUrl = URL.createObjectURL(processedBlob)
        
        // Always PNG for transparency
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_no_bg.png`

        return {
          ...file,
          processed: true,
          processedPreview: processedUrl,
          name: newName,
          size: processedBlob.size,
          blob: processedBlob
        }
      }),
    )

    return {
      success: true,
      processedFiles,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove background",
    }
  }
}

export default function BackgroundRemoverPage() {
  return (
    <ImageToolsLayout
      title="Background Remover"
      description="Remove backgrounds from images automatically using advanced edge detection. Perfect for product photos, portraits, and creating transparent images."
      icon={Scissors}
      toolType="background"
      processFunction={removeBackground}
      options={backgroundRemovalOptions}
      maxFiles={5}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["png", "webp"]}
    />
  )
}
