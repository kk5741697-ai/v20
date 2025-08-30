"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Archive } from "lucide-react"
import { ImageProcessor } from "@/lib/processors/image-processor"

const compressionOptions = [
  {
    key: "quality",
    label: "Quality",
    type: "slider" as const,
    defaultValue: 70,
    min: 10,
    max: 100,
    step: 5,
  },
  {
    key: "compressionLevel",
    label: "Compression Level",
    type: "select" as const,
    defaultValue: "medium",
    selectOptions: [
      { value: "low", label: "Low Compression (High Quality)" },
      { value: "medium", label: "Medium Compression (Balanced)" },
      { value: "high", label: "High Compression (Small Size)" },
      { value: "maximum", label: "Maximum Compression (Smallest)" },
    ],
  },
  {
    key: "outputFormat",
    label: "Output Format",
    type: "select" as const,
    defaultValue: "jpeg",
    selectOptions: [
      { value: "jpeg", label: "JPEG" },
      { value: "png", label: "PNG" },
      { value: "webp", label: "WebP" },
    ],
  },
]

async function compressImages(files: any[], options: any) {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: "No files to process",
      }
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const quality = parseFloat(options.quality || 70)
        const processedBlob = await ImageProcessor.compressImage(file.originalFile || file.file, {
          quality,
          compressionLevel: options.compressionLevel,
          outputFormat: options.outputFormat,
        })

        const processedUrl = URL.createObjectURL(processedBlob)
        
        const outputFormat = options.outputFormat || "jpeg"
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_compressed.${outputFormat}`

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
      error: error instanceof Error ? error.message : "Failed to compress images",
    }
  }
}

export default function ImageCompressorPage() {
  return (
    <ImageToolsLayout
      title="Image Compressor"
      description="Reduce image file size while maintaining quality. Perfect for web optimization and storage."
      icon={Archive}
      toolType="compress"
      processFunction={compressImages}
      options={compressionOptions}
      maxFiles={15}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["jpeg", "png", "webp"]}
    />
  )
}