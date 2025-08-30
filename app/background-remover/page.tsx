"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Eraser } from "lucide-react"
import { UltimateBackgroundProcessor } from "@/lib/processors/ultimate-background-processor"

const backgroundOptions = [
  {
    key: "primaryModel",
    label: "Primary Model",
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
    label: "Detection Sensitivity",
    type: "slider" as const,
    defaultValue: 25,
    min: 10,
    max: 50,
    step: 5,
    section: "Detection",
  },
  {
    key: "edgeFeathering",
    label: "Edge Softness",
    type: "slider" as const,
    defaultValue: 30,
    min: 0,
    max: 100,
    step: 10,
    section: "Quality",
  },
  {
    key: "detailPreservation",
    label: "Detail Enhancement",
    type: "slider" as const,
    defaultValue: 50,
    min: 0,
    max: 100,
    step: 10,
    section: "Quality",
  },
  {
    key: "outputFormat",
    label: "Output Format",
    type: "select" as const,
    defaultValue: "png",
    defaultValue: 95,
    min: 70,
    max: 100,
    step: 5,
    section: "Output",
  },
]

async function removeBackgrounds(files: any[], options: any) {
  try {
    if (files.length === 0) {
    if (largeFiles.length > 0) {
      return {
        success: false,
        error: `${largeFiles.length} file(s) are too large. Please use images smaller than 8MB.`,
        try {
          const ultimateOptions = {
            primaryModel: options.primaryModel || "auto",
            sensitivity: options.sensitivity || 25,
            edgeFeathering: options.edgeFeathering || 50,
            detailPreservation: options.detailPreservation || 80,
            smoothingLevel: 20,
            memoryOptimized: true,
            multiPass: true,
            chunkProcessing: true,
            maxDimensions: { width: 1536, height: 1536 },
            outputFormat: options.outputFormat || "png",
            quality: 95,
            progressCallback: (progress: number, stage: string) => {
              console.log(`Background Removal: ${Math.round(progress)}% - ${stage}`)
            },
            debugMode: false
          }

          const result = await UltimateBackgroundProcessor.removeBackground(
            file.originalFile || file.file,
            ultimateOptions
          )

          const processedUrl = URL.createObjectURL(result.processedBlob)
        
          const baseName = file.name.split(".")[0]
          const newName = `${baseName}_bg_removed.${options.outputFormat || "png"}`

          return {
            ...file,
            processed: true,
            processedPreview: processedUrl,
            name: newName,
            processedSize: result.processedBlob.size,
            blob: result.processedBlob,
            confidence: result.confidence,
            processingTime: result.processingTime,
            modelsUsed: result.modelsUsed,
            objectsDetected: result.objectsDetected
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
        error: "All files failed to process. Please try with smaller images (under 50MB) or different settings.",
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
      description="Ultimate AI-powered background removal with multiple models, object detection, and professional-grade results. Supports portraits, objects, animals, and products."
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