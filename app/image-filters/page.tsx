"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Palette } from "lucide-react"
import { ImageProcessor } from "@/lib/processors/image-processor"

const filterOptions = [
  {
    key: "brightness",
    label: "Brightness",
    type: "slider" as const,
    defaultValue: 100,
    min: 0,
    max: 200,
    step: 5,
    section: "Adjustments",
  },
  {
    key: "contrast",
    label: "Contrast",
    type: "slider" as const,
    defaultValue: 100,
    min: 0,
    max: 200,
    step: 5,
    section: "Adjustments",
  },
  {
    key: "saturation",
    label: "Saturation",
    type: "slider" as const,
    defaultValue: 100,
    min: 0,
    max: 200,
    step: 5,
    section: "Adjustments",
  },
  {
    key: "blur",
    label: "Blur",
    type: "slider" as const,
    defaultValue: 0,
    min: 0,
    max: 20,
    step: 1,
    section: "Effects",
  },
  {
    key: "sepia",
    label: "Sepia Effect",
    type: "checkbox" as const,
    defaultValue: false,
    section: "Effects",
  },
  {
    key: "grayscale",
    label: "Grayscale",
    type: "checkbox" as const,
    defaultValue: false,
    section: "Effects",
  },
  {
    key: "outputFormat",
    label: "Output Format",
    type: "select" as const,
    defaultValue: "png",
    selectOptions: [
      { value: "png", label: "PNG" },
      { value: "jpeg", label: "JPEG" },
      { value: "webp", label: "WebP" },
    ],
    section: "Output",
  },
  {
    key: "quality",
    label: "Quality",
    type: "slider" as const,
    defaultValue: 95,
    min: 10,
    max: 100,
    step: 5,
    section: "Output",
  },
]

async function applyFilters(files: any[], options: any) {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: "No files to process",
      }
    }
    
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const filterOptions = {
          filters: {
            brightness: Math.max(0, Math.min(300, options.brightness || 100)),
            contrast: Math.max(0, Math.min(300, options.contrast || 100)),
            saturation: Math.max(0, Math.min(300, options.saturation || 100)),
            blur: Math.max(0, Math.min(50, options.blur || 0)),
            sepia: Boolean(options.sepia),
            grayscale: Boolean(options.grayscale),
          },
          outputFormat: options.outputFormat || "png",
          quality: Math.max(10, Math.min(100, options.quality || 95))
        }
        
        const processedBlob = await ImageProcessor.applyFilters(
          file.originalFile || file.file,
          filterOptions
        )

        const processedUrl = URL.createObjectURL(processedBlob)
        
        const outputFormat = options.outputFormat || "png"
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_filtered.${outputFormat}`

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
      error: error instanceof Error ? error.message : "Failed to apply filters",
    }
  }
}

export default function ImageFiltersPage() {
  return (
    <ImageToolsLayout
      title="Image Filters"
      description="Apply professional filters and adjustments to your images. Adjust brightness, contrast, saturation, and add artistic effects."
      icon={Palette}
      toolType="filters"
      processFunction={applyFilters}
      options={filterOptions}
      maxFiles={15}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["png", "jpeg", "webp"]}
    />
  )
}