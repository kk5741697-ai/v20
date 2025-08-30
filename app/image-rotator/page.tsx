"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { RotateCw } from "lucide-react"
import { ImageProcessor } from "@/lib/processors/image-processor"

const rotateOptions = [
  {
    key: "customAngle",
    label: "Custom Angle (degrees)",
    type: "slider" as const,
    defaultValue: 0,
    min: -180,
    max: 180,
    step: 1,
  },
]

async function rotateImages(files: any[], options: any) {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: "No files to process",
      }
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const angle = options.customAngle || 0
        
        const processedBlob = await ImageProcessor.rotateImage(file.originalFile || file.file, {
          customRotation: angle,
          outputFormat: "png",
        })

        const processedUrl = URL.createObjectURL(processedBlob)
        
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_rotated.png`
        
        // Calculate new dimensions for 90° and 270° rotations
        const shouldSwapDimensions = Math.abs(angle) === 90 || Math.abs(angle) === 270
        const newDimensions = shouldSwapDimensions
          ? { width: file.dimensions.height, height: file.dimensions.width }
          : file.dimensions
        return {
          ...file,
          processed: true,
          processedPreview: processedUrl,
          name: newName,
          processedSize: processedBlob.size,
          blob: processedBlob,
          dimensions: newDimensions,
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
      error: error instanceof Error ? error.message : "Failed to rotate images",
    }
  }
}

export default function ImageRotatorPage() {
  return (
    <ImageToolsLayout
      title="Image Rotator"
      description="Rotate images by 90°, 180°, 270°, or any custom angle. Perfect for fixing orientation and creating artistic effects."
      icon={RotateCw}
      toolType="rotate"
      processFunction={rotateImages}
      options={rotateOptions}
      maxFiles={10}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["jpeg", "png", "webp"]}
    />
  )
}
