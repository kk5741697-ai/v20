"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Crop } from "lucide-react"
import { ImageProcessor } from "@/lib/processors/image-processor"

const cropOptions = [
  {
    key: "aspectRatio",
    label: "Aspect Ratio",
    type: "select" as const,
    defaultValue: "custom",
    selectOptions: [
      { value: "custom", label: "Custom" },
      { value: "1:1", label: "Square (1:1)" },
      { value: "4:3", label: "Standard (4:3)" },
      { value: "3:2", label: "Classic (3:2)" },
      { value: "16:9", label: "Widescreen (16:9)" },
      { value: "9:16", label: "Portrait (9:16)" },
      { value: "3:4", label: "Portrait (3:4)" },
      { value: "2:3", label: "Portrait (2:3)" },
    ],
    section: "Crop Settings",
  },
  {
    key: "cropX",
    label: "X Position (%)",
    type: "slider" as const,
    defaultValue: 25,
    min: 0,
    max: 75,
    step: 1,
    section: "Position",
    condition: (options) => options.aspectRatio === "custom",
  },
  {
    key: "cropY",
    label: "Y Position (%)",
    type: "slider" as const,
    defaultValue: 25,
    min: 0,
    max: 75,
    step: 1,
    section: "Position",
    condition: (options) => options.aspectRatio === "custom",
  },
  {
    key: "cropWidth",
    label: "Width (%)",
    type: "slider" as const,
    defaultValue: 50,
    min: 10,
    max: 100,
    step: 1,
    section: "Dimensions",
    condition: (options) => options.aspectRatio === "custom",
  },
  {
    key: "cropHeight",
    label: "Height (%)",
    type: "slider" as const,
    defaultValue: 50,
    min: 10,
    max: 100,
    step: 1,
    section: "Dimensions",
    condition: (options) => options.aspectRatio === "custom",
  },
]

const cropPresets = [
  { name: "Instagram Post", values: { aspectRatio: "1:1" } },
  { name: "YouTube Thumbnail", values: { aspectRatio: "16:9" } },
  { name: "Facebook Cover", values: { aspectRatio: "16:9" } },
  { name: "Twitter Header", values: { aspectRatio: "3:1" } },
  { name: "LinkedIn Post", values: { aspectRatio: "4:3" } },
  { name: "Center Crop", values: { aspectRatio: "custom", cropX: 25, cropY: 25, cropWidth: 50, cropHeight: 50 } },
]

async function cropImages(files: any[], options: any) {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: "No files to process",
      }
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        let cropArea = { x: 25, y: 25, width: 50, height: 50 }

        // Calculate crop area based on aspect ratio
        if (options.aspectRatio && options.aspectRatio !== "custom") {
          const [ratioW, ratioH] = options.aspectRatio.split(":").map(Number)
          const targetRatio = ratioW / ratioH
          
          if (file.dimensions) {
            const currentRatio = file.dimensions.width / file.dimensions.height
            
            if (currentRatio > targetRatio) {
              // Image is wider, crop width
              const newWidth = (file.dimensions.height * targetRatio / file.dimensions.width) * 100
              cropArea = {
                x: (100 - newWidth) / 2,
                y: 0,
                width: newWidth,
                height: 100
              }
            } else {
              // Image is taller, crop height
              const newHeight = (file.dimensions.width / targetRatio / file.dimensions.height) * 100
              cropArea = {
                x: 0,
                y: (100 - newHeight) / 2,
                width: 100,
                height: newHeight
              }
            }
          }
        } else {
          // Use custom crop area
          cropArea = {
            x: options.cropX || 25,
            y: options.cropY || 25,
            width: options.cropWidth || 50,
            height: options.cropHeight || 50
          }
        }

        const processedBlob = await ImageProcessor.cropImage(
          file.originalFile || file.file,
          cropArea,
          { outputFormat: "png" }
        )

        const processedUrl = URL.createObjectURL(processedBlob)
        
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_cropped.png`

        // Calculate new dimensions
        const newWidth = Math.floor((file.dimensions.width * cropArea.width) / 100)
        const newHeight = Math.floor((file.dimensions.height * cropArea.height) / 100)

        return {
          ...file,
          processed: true,
          processedPreview: processedUrl,
          name: newName,
          processedSize: processedBlob.size,
          blob: processedBlob,
          dimensions: { width: newWidth, height: newHeight }
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
      error: error instanceof Error ? error.message : "Failed to crop images",
    }
  }
}

export default function ImageCropperPage() {
  return (
    <ImageToolsLayout
      title="Image Cropper"
      description="Crop images to specific aspect ratios or custom dimensions with precise control over position and size."
      icon={Crop}
      toolType="crop"
      processFunction={cropImages}
      options={cropOptions}
      maxFiles={10}
      presets={cropPresets}
      allowBatchProcessing={true}
      supportedFormats={["image/jpeg", "image/png", "image/webp"]}
      outputFormats={["jpeg", "png", "webp"]}
    />
  )
}