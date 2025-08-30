"use client"

import { PDFToolsLayout } from "@/components/pdf-tools-layout"
import { ImageIcon } from "lucide-react"
import { PDFProcessor } from "@/lib/processors/pdf-processor"

const convertOptions = [
  {
    key: "outputFormat",
    label: "Output Format",
    type: "select" as const,
    defaultValue: "jpg",
    selectOptions: [
      { value: "jpeg", label: "JPEG" },
      { value: "png", label: "PNG" },
      { value: "webp", label: "WebP" },
    ],
    section: "Output",
  },
  {
    key: "resolution",
    label: "Resolution (DPI)",
    type: "select" as const,
    defaultValue: "150",
    selectOptions: [
      { value: "72", label: "72 DPI (Web)" },
      { value: "150", label: "150 DPI (Standard)" },
      { value: "300", label: "300 DPI (Print)" },
      { value: "600", label: "600 DPI (High Quality)" },
    ],
    section: "Quality",
  },
  {
    key: "colorMode",
    label: "Color Mode",
    type: "select" as const,
    defaultValue: "color",
    selectOptions: [
      { value: "color", label: "Full Color" },
      { value: "grayscale", label: "Grayscale" },
      { value: "monochrome", label: "Black & White" },
    ],
    section: "Quality",
  },
]

async function convertPDFToImage(files: any[], options: any) {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: "Please select at least one PDF file to convert",
      }
    }

    const conversionOptions = {
      outputFormat: options.outputFormat,
      dpi: Number.parseInt(options.resolution),
      colorMode: options.colorMode,
      imageQuality: 90,
    }

    // Always create ZIP with all images
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()

    for (const file of files) {
      const images = await PDFProcessor.pdfToImages(file.file, conversionOptions)

      images.forEach((imageBlob, pageIndex) => {
        const filename = `${file.name.replace(".pdf", "")}_page_${pageIndex + 1}.${options.outputFormat}`
        zip.file(filename, imageBlob)
      })
    }

    const zipBlob = await zip.generateAsync({ type: "blob" })
    const downloadUrl = URL.createObjectURL(zipBlob)

    return {
      success: true,
      downloadUrl,
      filename: files.length === 1 ? `${files[0].name.replace(".pdf", "")}_images.zip` : "pdf_images.zip",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to convert PDF to images",
    }
  }
}

export default function PDFToImagePage() {
  return (
    <PDFToolsLayout
      title="PDF to Image Converter"
      description="Convert PDF pages to high-quality images in multiple formats. Choose resolution, quality, and color mode for perfect results."
      icon={ImageIcon}
      toolType="convert"
      processFunction={convertPDFToImage}
      options={convertOptions}
      maxFiles={3}
      allowPageSelection={true}
    />
  )
}