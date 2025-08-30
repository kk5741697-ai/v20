"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { 
  Upload, 
  Download, 
  CheckCircle,
  X,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Settings
} from "lucide-react"
import { Palette } from "lucide-react"
import { ImageProcessor } from "@/lib/processors/image-processor"
import { toast } from "@/hooks/use-toast"

interface ImageFile {
  id: string
  file: File
  originalFile?: File
  name: string
  size: number
  dimensions?: { width: number; height: number }
  preview: string
  processed?: boolean
  processedPreview?: string
  processedSize?: number
  blob?: Blob
}

const filterOptions = [
  {
    key: "brightness", 
    label: "Brightness",
    type: "slider" as const,
    defaultValue: 100,
    min: 0,
    max: 200,
    step: 5,
  },
  {
    key: "contrast",
    label: "Contrast",
    type: "slider" as const,
    defaultValue: 100,
    min: 0,
    max: 200,
    step: 5,
  },
  {
    key: "saturation",
    label: "Saturation",
    type: "slider" as const,
    defaultValue: 100,
    min: 0,
    max: 200,
    step: 5,
  },
  {
    key: "blur",
    label: "Blur",
    type: "slider" as const,
    defaultValue: 0,
    min: 0,
    max: 20,
    step: 1,
  },
  {
    key: "sepia",
    label: "Sepia Effect",
    type: "checkbox" as const,
    defaultValue: false,
  },
  {
    key: "grayscale",
    label: "Grayscale",
    type: "checkbox" as const,
    defaultValue: false,
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
          outputFormat: "png",
        }
        
        const processedBlob = await ImageProcessor.applyFilters(
          file.originalFile || file.file,
          filterOptions
        )

        const processedUrl = URL.createObjectURL(processedBlob)
        
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_filtered.png`

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
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-1 lg:py-2">
          <AdBanner 
            adSlot="tool-header-banner"
            adFormat="auto"
            className="max-w-6xl mx-auto"
            mobileOptimized={true}
          />
        </div>
      </div>

      {/* Single Image Filter Interface */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <Palette className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-heading font-bold text-foreground">Image Filters</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Apply professional filters and adjustments to your image. Adjust brightness, contrast, saturation, and add artistic effects.
          </p>
        </div>

                  ))}
  )
}