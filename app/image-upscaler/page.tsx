"use client"

import { ImageToolsLayout } from "@/components/image-tools-layout"
import { Zap } from "lucide-react"
import { ImageProcessor } from "@/lib/processors/image-processor"

const upscaleOptions = [
  {
    key: "scaleFactor",
    label: "Scale Factor",
    type: "select" as const,
    defaultValue: "2x",
    selectOptions: [
      { value: "1.5x", label: "1.5x (150%)" },
      { value: "2x", label: "2x (200%)" },
      { value: "3x", label: "3x (300%)" },
      { value: "4x", label: "4x (400%)" },
    ],
    section: "Upscaling",
  },
  {
    key: "algorithm",
    label: "Upscaling Algorithm",
    type: "select" as const,
    defaultValue: "lanczos",
    selectOptions: [
      { value: "lanczos", label: "Lanczos (Best Quality)" },
      { value: "bicubic", label: "Bicubic (Balanced)" },
      { value: "bilinear", label: "Bilinear (Fast)" },
    ],
    section: "Upscaling",
  },
  {
    key: "enhanceDetails",
    label: "Enhance Details",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Enhancement",
  },
  {
    key: "reduceNoise",
    label: "Reduce Noise",
    type: "checkbox" as const,
    defaultValue: true,
    section: "Enhancement",
  },
  {
    key: "sharpen",
    label: "Sharpen",
    type: "slider" as const,
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 5,
    section: "Enhancement",
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

async function upscaleImages(files: any[], options: any) {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: "No files to process",
      }
    }
    
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        let scaleFactor = 2
        if (options.scaleFactor) {
          if (typeof options.scaleFactor === 'string') {
            scaleFactor = parseFloat(options.scaleFactor.replace('x', ''))
          } else {
            scaleFactor = options.scaleFactor
          }
        }
        
        // Validate scale factor
        scaleFactor = Math.max(1.1, Math.min(10, scaleFactor))
        
        const newWidth = Math.round((file.dimensions?.width || 800) * scaleFactor)
        const newHeight = Math.round((file.dimensions?.height || 600) * scaleFactor)

        // Enhanced upscaling options
        const upscaleOptions = {
          width: newWidth,
          height: newHeight,
          maintainAspectRatio: true,
          outputFormat: options.outputFormat,
          quality: options.quality,
          // Apply enhancement filters for upscaling
          filters: {
            brightness: options.enhanceDetails ? 105 : 100,
            contrast: options.enhanceDetails ? 110 : 100,
            saturation: options.reduceNoise ? 95 : 100,
            blur: options.reduceNoise ? 0.5 : 0
          }
        }
        
        // Apply sharpening if specified
        if (options.sharpen && options.sharpen > 0) {
          upscaleOptions.filters = {
            ...upscaleOptions.filters,
            contrast: (upscaleOptions.filters.contrast || 100) + (options.sharpen * 0.5)
          }
        }
        
        const processedBlob = await ImageProcessor.resizeImage(
          file.originalFile || file.file,
          upscaleOptions
        )

        const processedUrl = URL.createObjectURL(processedBlob)
        
        const outputFormat = options.outputFormat || "png"
        const baseName = file.name.split(".")[0]
        const newName = `${baseName}_${options.scaleFactor}.${outputFormat}`

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
      error: error instanceof Error ? error.message : "Failed to upscale images",
    }
  }
}

export default function ImageUpscalerPage() {
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

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <Zap className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-heading font-bold text-foreground">Upscale Image</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enlarge images using advanced interpolation algorithms. Increase resolution while preserving details and reducing artifacts.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Before/After Preview */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Before & After Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Original</Label>
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border">
                        <div className="text-center">
                          <Zap className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-gray-500 text-sm">Upload image to preview</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Upscaled</Label>
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border">
                        <div className="text-center">
                          <Zap className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-gray-500 text-sm">Upscaled result will appear here</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upscale Controls */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Upscale Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {upscaleOptions.map((option) => (
                    <div key={option.key} className="space-y-2">
                      <Label className="text-sm font-medium">{option.label}</Label>
                      
                      {option.type === "select" && (
                        <Select defaultValue={option.defaultValue}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {option.selectOptions?.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                      {option.type === "checkbox" && (
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked={option.defaultValue} />
                          <span className="text-sm">{option.label}</span>
                        </div>
                      )}
                          </SelectContent>
                      {option.type === "slider" && (
                        <div className="space-y-2">
                          <Slider
                            defaultValue={[option.defaultValue]}
                            min={option.min}
                            max={option.max}
                            step={option.step}
                          />
                          <div className="text-xs text-center text-gray-500">
                            {option.defaultValue}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                        </Select>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Zap className="h-4 w-4 mr-2" />
                    Upscale Image
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
                      )}
      <Footer />
    </div>
  )
}