"use client"

import { PDFToolsLayout } from "@/components/pdf-tools-layout"
import { Scissors } from "lucide-react"
import { PDFProcessor } from "@/lib/processors/pdf-processor"

const splitOptions = [
  {
    key: "splitMode",
    label: "Split Mode",
    type: "select" as const,
    defaultValue: "range",
    selectOptions: [
      { value: "range", label: "Page Ranges" },
      { value: "pages", label: "Extract Selected Pages" },
      { value: "size", label: "Equal Parts" },
    ],
    section: "Split Settings",
  },
  {
    key: "rangeMode",
    label: "Range Mode",
    type: "select" as const,
    defaultValue: "custom",
    selectOptions: [
      { value: "custom", label: "Custom Ranges" },
      { value: "fixed", label: "Fixed Intervals" },
    ],
    section: "Split Settings",
    condition: (options) => options.splitMode === "range",
  },
  {
    key: "mergeRanges",
    label: "Merge all ranges in one PDF file",
    type: "checkbox" as const,
    defaultValue: false,
    section: "Split Settings",
    condition: (options) => options.splitMode === "range",
  },
  {
    key: "equalParts",
    label: "Number of Parts",
    type: "input" as const,
    defaultValue: 2,
    min: 2,
    max: 20,
    section: "Split Settings",
    condition: (options) => options.splitMode === "size",
  },
  {
    key: "preserveMetadata",
    label: "Preserve Metadata",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Options",
  },
]

async function splitPDF(files: any[], options: any) {
  try {
    if (files.length !== 1) {
      return {
        success: false,
        error: "Please select exactly one PDF file to split",
      }
    }

    const file = files[0]
    
    // Get selected pages from the UI
    const selectedPages = options.selectedPages || []
    
    if (selectedPages.length === 0) {
      return {
        success: false,
        error: "Please select at least one page to extract",
      }
    }
    
    // Convert selected page keys to page numbers
    const pageNumbers = selectedPages
      .map((pageKey: string) => {
        const parts = pageKey.split('-')
        return parseInt(parts[parts.length - 1])
      })
      .filter((num: number) => !isNaN(num))
      .sort((a: number, b: number) => a - b)
    
    if (pageNumbers.length === 0) {
      return {
        success: false,
        error: "No valid pages selected",
      }
    }
    
    // Create page ranges from selected pages
    const pageRanges = pageNumbers.map(pageNum => ({ from: pageNum, to: pageNum }))
    
    const splitResults = await PDFProcessor.splitPDF(
      file.originalFile || file.file, 
      pageRanges, 
      { ...options, extractMode: "pages" }
    )

    // Handle single file vs multiple files download logic
    if (splitResults.length === 1 && !options.mergeRanges) {
      // Single file - direct download
      const blob = new Blob([splitResults[0]], { type: "application/pdf" })
      const downloadUrl = URL.createObjectURL(blob)
      
      return {
        success: true,
        downloadUrl,
      }
    } else if (options.mergeRanges && splitResults.length > 1) {
      // Merge all ranges into one PDF
      const tempFiles = splitResults.map((bytes, index) => {
        return new File([bytes], `temp-${index}.pdf`, { type: "application/pdf" })
      })
      
      const mergedBytes = await PDFProcessor.mergePDFs(tempFiles, {
        addBookmarks: false,
        preserveMetadata: options.preserveMetadata
      })
      
      const mergedBlob = new Blob([mergedBytes], { type: "application/pdf" })
      const downloadUrl = URL.createObjectURL(mergedBlob)
      
      return {
        success: true,
        downloadUrl,
      }
    } else {
      // Multiple files - create ZIP
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()
      
      splitResults.forEach((pdfBytes, index) => {
        const pageNum = pageNumbers[index]
        const filename = `${file.name.replace(".pdf", "")}_page_${pageNum}.pdf`
        zip.file(filename, pdfBytes)
      })

      const zipBlob = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      })
      const downloadUrl = URL.createObjectURL(zipBlob)

      return {
        success: true,
        downloadUrl,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to split PDF",
    }
  }
}

export default function PDFSplitterPage() {
  return (
    <PDFToolsLayout
      title="Split PDF"
      description="Split large PDF files into smaller documents by page ranges, file size, bookmarks, or equal parts. Extract specific pages or sections easily."
      icon={Scissors}
      toolType="split"
      processFunction={splitPDF}
      options={splitOptions}
      maxFiles={1}
      allowPageSelection={true}
    />
  )
}