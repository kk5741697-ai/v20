"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { RefreshCw } from "lucide-react"
import { ImageProcessor } from "@/lib/processors/image-processor"

const convertOptions = [
  {
    key: "outputFormat",
    label: "Output Format",
    type: "select" as const,
    defaultValue: "png",
    selectOptions: [
      { value: "jpeg", label: "JPEG" },
      { value: "png", label: "PNG" },
      { value: "webp", label: "WebP" },
    ],
  },
]

async function convertImages(files: any[], options: any) {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: "No files to process",
      }
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {

        const processedBlob = await ImageProcessor.convertFormat(
          file.originalFile || file.file,
          options.outputFormat as "jpeg" | "png" | "webp",
          {
            outputFormat: options.outputFormat as "jpeg" | "png" | "webp",
          }
        )

        const processedUrl = URL.createObjectURL(processedBlob)
        
        // Update file name with correct extension
        const outputFormat = options.outputFormat || "png"
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}.${outputFormat}`

        return {
          ...file,
          processed: true,
          processedPreview: processedUrl,
          name: newName,
          processedSize: processedBlob.size,
          blob: processedBlob
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
      error: error instanceof Error ? error.message : "Failed to convert images",
    }
  }
}

export default function ImageConverterPage() {
  return (
    <ImageToolsLayout
      title="Image Converter"
      description="Convert images between different formats including JPEG, PNG, and WebP. Apply rotation, flipping, and adjustments during conversion."
      icon={RefreshCw}
      toolType="convert"
      processFunction={convertImages}
      options={convertOptions}
      maxFiles={15}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/gif", "image/webp"]}
      outputFormats={["jpeg", "png", "webp"]}
    />
  )
}