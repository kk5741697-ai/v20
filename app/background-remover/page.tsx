"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Eraser } from "lucide-react"
import { UltimateBackgroundProcessor } from "@/lib/processors/ultimate-background-processor"

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
    section: "Primary AI Model",
  },
  {
    key: "secondaryModel",
    label: "Secondary Model",
    type: "select" as const,
    defaultValue: "edge-detection",
    selectOptions: [
      { value: "edge-detection", label: "Edge Detection" },
      { value: "color-clustering", label: "Color Clustering" },
      { value: "texture-analysis", label: "Texture Analysis" },
      { value: "gradient-flow", label: "Gradient Flow" },
    ],
    section: "Secondary AI Model",
  },
  {
    key: "hybridMode",
    label: "Hybrid Processing",
    type: "checkbox" as const,
    defaultValue: true,
    section: "AI Models",
  },
  {
    key: "enableObjectDetection",
    label: "Object Detection",
    type: "checkbox" as const,
    defaultValue: true,
    section: "AI Models",
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
    key: "edgeFeathering",
    label: "Edge Feathering",
    type: "slider" as const,
    defaultValue: 50,
    min: 0,
    max: 100,
    step: 10,
    section: "Detection",
  },
  {
    key: "detailPreservation",
    label: "Detail Preservation",
    type: "slider" as const,
    defaultValue: 80,
    min: 0,
    max: 100,
    step: 10,
    section: "Detection",
  },
  {
    key: "smoothingLevel",
    label: "Smoothing Level",
    type: "slider" as const,
    defaultValue: 20,
    min: 0,
    max: 50,
    step: 5,
    section: "Post-Processing",
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
  {
    key: "quality",
    label: "Output Quality",
    type: "slider" as const,
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
          const ultimateOptions = {
            primaryModel: options.model || "auto",
            secondaryModel: options.secondaryModel || "edge-detection",
            hybridMode: options.hybridMode !== false,
            enableObjectDetection: options.enableObjectDetection !== false,
            sensitivity: options.sensitivity || 25,
            edgeFeathering: options.edgeFeathering || 50,
            detailPreservation: options.detailPreservation || 80,
            smoothingLevel: options.smoothingLevel || 20,
            memoryOptimized: options.chunkProcessing !== false,
            multiPass: options.multiPass !== false,
            chunkProcessing: options.chunkProcessing !== false,
            maxDimensions: { width: 2048, height: 2048 },
            outputFormat: options.outputFormat || "png",
            quality: options.quality || 95,
            progressCallback: (progress: number, stage: string) => {
              console.log(`Ultimate Processing: ${Math.round(progress)}% - ${stage}`)
            },
            debugMode: false
          }

          const result = await UltimateBackgroundProcessor.removeBackground(
            file.originalFile || file.file,
            ultimateOptions
          )

          const processedUrl = URL.createObjectURL(result.processedBlob)
        
          const baseName = file.name.split(".")[0]
          const newName = `${baseName}_ultimate_bg_removed.${options.outputFormat || "png"}`

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