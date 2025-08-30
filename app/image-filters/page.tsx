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

        {/* Single Image Filter Tool */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Canvas - Full Screen Preview */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Image Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Palette className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">Upload an image to start applying filters</p>
                      <Button className="mt-4">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Controls */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {filterOptions.map((option) => (
                    <div key={option.key} className="space-y-2">
                      <Label className="text-sm font-medium">{option.label}</Label>
                      
                      {option.type === "slider" && (
                        <div className="space-y-2">
                          <Slider
                            value={[option.defaultValue]}
                            min={option.min}
                            max={option.max}
                            step={option.step}
                          />
                          <div className="text-xs text-center text-gray-500">
                            {option.defaultValue}
                          </div>
                        </div>
                      )}

                      {option.type === "checkbox" && (
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked={option.defaultValue} />
                          <span className="text-sm">{option.label}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    <Palette className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}