"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Eraser } from "lucide-react"
import { AdvancedBackgroundProcessor } from "@/lib/processors/advanced-background-processor"

const backgroundOptions = [
  {
    key: "model",
    label: "AI Model",
    type: "select" as const,
    defaultValue: "auto",
    selectOptions: [
      { value: "auto", label: "Auto (Recommended)" },
      { value: "portrait", label: "Portrait Model" },
      { value: "object", label: "Object Detection Model" },
      { value: "animal", label: "Animal Detection Model" },
      { value: "product", label: "Product Photography Model" },
      { value: "general", label: "General Purpose Model" },
    ],
    section: "AI Model",
  },
  {
    key: "sensitivity",
    label: "Edge Sensitivity",
    type: "slider" as const,
    defaultValue: 25,
    min: 5,
    max: 50,
    step: 5,
    section: "Detection",
  },
  {
    key: "featherEdges",
    label: "Feather Edges",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Detection",
  },
  {
    key: "preserveDetails",
    label: "Preserve Fine Details",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Detection",
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

    // Enhanced safety checks
    const largeFiles = files.filter((f: any) => f.file.size > 8 * 1024 * 1024)
    if (largeFiles.length > 0) {
      return {
        success: false,
        error: `${largeFiles.length} file(s) are too large. Please use images smaller than 8MB.`,
      }
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        try {
        const backgroundOptions = {
          algorithm: options.model || "auto",
          sensitivity: options.sensitivity || 25,
          featherEdges: options.featherEdges !== false,
          preserveDetails: options.preserveDetails !== false,
          smoothing: 4,
          outputFormat: options.outputFormat || "png",
            maxDimensions: { width: 1024, height: 1024 },
          maxDimensions: { width: 1536, height: 1536 },
          progressCallback: (progress: number, stage: string) => {
            console.log(`Processing: ${Math.round(progress)}% - ${stage}`)
          }
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
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error)
          return {
            ...file,
            processed: false,
            error: error instanceof Error ? error.message : "Processing failed"
          }
        }
      })
    )

    // Filter out failed files
    const successfulFiles = processedFiles.filter(f => f.processed)
    const failedFiles = processedFiles.filter(f => !f.processed)
    
    if (failedFiles.length > 0) {
      console.warn(`${failedFiles.length} files failed to process`)
    }
    
    if (successfulFiles.length === 0) {
      return {
        success: false,
        error: "All files failed to process. Please try with smaller images or different settings.",
      }
    }
    return {
      success: true,
      processedFiles: successfulFiles,
    }
  } catch (error) {
    console.error("Background removal batch failed:", error)
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
      description="Remove image backgrounds with advanced AI models. Choose from specialized models for portraits, objects, animals, and products for best results."
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