"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Droplets } from "lucide-react"
import { ImageProcessor } from "@/lib/processors/image-processor"

const watermarkOptions = [
  {
    key: "watermarkText",
    label: "Watermark Text",
    type: "text" as const,
    defaultValue: "© Your Brand",
  },
  {
    key: "useImageWatermark",
    label: "Use Image Watermark",
    type: "checkbox" as const,
    defaultValue: false,
  },
  {
    key: "watermarkImageUrl",
    label: "Watermark Image URL",
    type: "text" as const,
    defaultValue: "",
    condition: (options) => options.useImageWatermark,
  },
  {
    key: "fontSize",
    label: "Font Size",
    type: "slider" as const,
    defaultValue: 48,
    min: 12,
    max: 120,
    step: 5,
    condition: (options) => !options.useImageWatermark,
  },
  {
    key: "opacity",
    label: "Opacity",
    type: "slider" as const,
    defaultValue: 50,
    min: 10,
    max: 100,
    step: 5,
  },
  {
    key: "position",
    label: "Position",
    type: "select" as const,
    defaultValue: "center",
    selectOptions: [
      { value: "center", label: "Center" },
      { value: "top-left", label: "Top Left" },
      { value: "top-right", label: "Top Right" },
      { value: "bottom-left", label: "Bottom Left" },
      { value: "bottom-right", label: "Bottom Right" },
      { value: "diagonal", label: "Diagonal" },
    ],
  },
  {
    key: "textColor",
    label: "Text Color",
    type: "color" as const,
    defaultValue: "#ffffff",
    condition: (options) => !options.useImageWatermark,
  },
]

async function addWatermarkToImages(files: any[], options: any) {
  try {
    if (!options.useImageWatermark && (!options.watermarkText || options.watermarkText.trim() === "")) {
      return {
        success: false,
        error: "Please provide watermark text or image",
      }
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const watermarkOptions = {
          watermarkOpacity: options.opacity / 100,
          outputFormat: "png",
          position: options.position,
          textColor: options.textColor,
          fontSize: options.fontSize,
          useImageWatermark: options.useImageWatermark,
          watermarkImageUrl: options.watermarkImageUrl,
          watermarkImage: options.useImageWatermark ? options.watermarkImageUrl : undefined,
        }
        
        const processedBlob = await ImageProcessor.addWatermark(
          file.originalFile || file.file, 
          options.watermarkText, 
          watermarkOptions
        )

        const processedUrl = URL.createObjectURL(processedBlob)
        
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_watermarked.png`

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
      error: error instanceof Error ? error.message : "Failed to add watermark",
    }
  }
}

export default function ImageWatermarkPage() {
  return (
    <ImageToolsLayout
      title="Image Watermark"
      description="Add text watermarks to your images for copyright protection and branding. Customize opacity, position, size, and color."
      icon={Droplets}
      toolType="watermark"
      processFunction={addWatermarkToImages}
      options={watermarkOptions}
      maxFiles={10}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["jpeg", "png", "webp"]}
    />
  )
}
