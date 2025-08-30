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
  const [file, setFile] = useState<ImageFile | null>(null)
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sepia: false,
    grayscale: false,
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showUploadArea, setShowUploadArea] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return

    const uploadedFile = uploadedFiles[0]
    if (!uploadedFile.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: `${uploadedFile.name} is not an image file`,
        variant: "destructive"
      })
      return
    }

    try {
      const dimensions = await getImageDimensions(uploadedFile)
      const preview = await createImagePreview(uploadedFile)
      
      const imageFile: ImageFile = {
        id: `${uploadedFile.name}-${Date.now()}`,
        file: uploadedFile,
        originalFile: uploadedFile,
        name: uploadedFile.name,
        size: uploadedFile.size,
        dimensions,
        preview,
      }

      setFile(imageFile)
      setShowUploadArea(false)
      toast({
        title: "Image uploaded",
        description: "Image loaded successfully for filtering"
      })
    } catch (error) {
      toast({
        title: "Error loading image",
        description: `Failed to load ${uploadedFile.name}`,
        variant: "destructive"
      })
    }
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileUpload(e.dataTransfer.files)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const resetTool = () => {
    setFile(null)
    setFilterValues({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      sepia: false,
      grayscale: false,
    })
    setProcessingProgress(0)
    setShowUploadArea(true)
    setIsMobileSidebarOpen(false)
  }

  const applyFilters = async () => {
    if (!file) {
      toast({
        title: "No image selected",
        description: "Please upload an image to apply filters",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 20, 90))
      }, 200)

      const filterOptions = {
        filters: {
          brightness: Math.max(0, Math.min(300, filterValues.brightness || 100)),
          contrast: Math.max(0, Math.min(300, filterValues.contrast || 100)),
          saturation: Math.max(0, Math.min(300, filterValues.saturation || 100)),
          blur: Math.max(0, Math.min(50, filterValues.blur || 0)),
          sepia: Boolean(filterValues.sepia),
          grayscale: Boolean(filterValues.grayscale),
        },
        outputFormat: "png",
      }
      
      const processedBlob = await ImageProcessor.applyFilters(
        file.originalFile || file.file,
        filterOptions
      )

      clearInterval(progressInterval)
      setProcessingProgress(100)

      const processedUrl = URL.createObjectURL(processedBlob)
      const baseName = file.name.split(".")[0]
      const newName = `${baseName}_filtered.png`

      const processedFile = {
        ...file,
        processed: true,
        processedPreview: processedUrl,
        name: newName,
        processedSize: processedBlob.size,
        blob: processedBlob
      }

      setFile(processedFile)
      
      toast({
        title: "Filters applied",
        description: "Image filters applied successfully"
      })
    } catch (error) {
      toast({
        title: "Filter application failed",
        description: error instanceof Error ? error.message : "Failed to apply filters",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  const downloadFile = () => {
    if (!file?.blob) return

    const link = document.createElement("a")
    link.href = file.processedPreview || file.preview
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download started",
      description: `${file.name} downloaded successfully`
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  // Live filter application
  useEffect(() => {
    if (file && !file.processed) {
      const debounceTimer = setTimeout(() => {
        applyFiltersLive()
      }, 300)
      return () => clearTimeout(debounceTimer)
    }
  }, [filterValues, file])

  const applyFiltersLive = async () => {
    if (!file || file.processed) return

    try {
      const filterOptions = {
        filters: {
          brightness: Math.max(0, Math.min(300, filterValues.brightness || 100)),
          contrast: Math.max(0, Math.min(300, filterValues.contrast || 100)),
          saturation: Math.max(0, Math.min(300, filterValues.saturation || 100)),
          blur: Math.max(0, Math.min(50, filterValues.blur || 0)),
          sepia: Boolean(filterValues.sepia),
          grayscale: Boolean(filterValues.grayscale),
        },
        outputFormat: "png",
      }
      
      const processedBlob = await ImageProcessor.applyFilters(
        file.originalFile || file.file,
        filterOptions
      )

      const processedUrl = URL.createObjectURL(processedBlob)
      
      setFile(prev => prev ? {
        ...prev,
        processedPreview: processedUrl,
        blob: processedBlob,
        processedSize: processedBlob.size
      } : null)
    } catch (error) {
      console.error("Live filter application failed:", error)
    }
  }

  // Mobile Sidebar Component
  const MobileSidebar = () => (
    <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <SheetHeader className="px-6 py-4 border-b bg-gray-50">
          <SheetTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-purple-600" />
            <span>Filter Settings</span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {filterOptions.map((option) => (
              <div key={option.key} className="space-y-2">
                <Label className="text-sm font-medium">{option.label}</Label>
                
                {option.type === "slider" && (
                  <div className="space-y-3">
                    <Slider
                      value={[filterValues[option.key] || option.defaultValue]}
                      onValueChange={([value]) => setFilterValues(prev => ({ ...prev, [option.key]: value }))}
                      min={option.min}
                      max={option.max}
                      step={option.step}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{option.min}</span>
                      <span className="font-medium bg-gray-100 px-2 py-1 rounded">{filterValues[option.key] || option.defaultValue}</span>
                      <span>{option.max}</span>
                    </div>
                  </div>
                )}

                {option.type === "checkbox" && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      checked={filterValues[option.key] || false}
                      onCheckedChange={(checked) => setFilterValues(prev => ({ ...prev, [option.key]: checked }))}
                    />
                    <span className="text-sm">{option.label}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Mobile Footer */}
        <div className="p-4 border-t bg-white space-y-3">
          <Button 
            onClick={() => {
              applyFilters()
              setIsMobileSidebarOpen(false)
            }}
            disabled={isProcessing || !file}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Applying...
              </>
            ) : (
              <>
                <Palette className="h-4 w-4 mr-2" />
                Apply Filters
              </>
            )}
          </Button>

          {file?.processed && (
            <Button 
              onClick={() => {
                downloadFile()
                setIsMobileSidebarOpen(false)
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Image
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )

  // Show upload area if no file
  if (showUploadArea && !file) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center space-x-2 mb-4">
              <Palette className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
              <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Image Filters</h1>
            </div>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Apply professional filters and adjustments to your image. Adjust brightness, contrast, saturation, and add artistic effects.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all duration-300 p-8 lg:p-16 group"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="relative mb-4 lg:mb-6">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
                <Upload className="relative h-16 w-16 lg:h-20 lg:w-20 text-purple-500 group-hover:text-purple-600 transition-colors group-hover:scale-110 transform duration-300" />
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold mb-2 lg:mb-3 text-gray-700 group-hover:text-purple-600 transition-colors">Drop image here</h3>
              <p className="text-gray-500 mb-4 lg:mb-6 text-base lg:text-lg text-center">or tap to browse files</p>
              <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 lg:px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                <Upload className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                Choose Image
              </Button>
              <div className="mt-4 lg:mt-6 space-y-2 text-center">
                <p className="text-sm text-gray-500 font-medium">JPG, PNG, WebP files</p>
                <p className="text-xs text-gray-400">Single image • Up to 100MB</p>
              </div>
            </div>
          </div>
        </div>

        <Footer />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>
    )
  }

  // Filter interface
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-purple-600" />
            <h1 className="text-lg font-semibold text-gray-900">Image Filters</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={resetTool}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 min-h-[60vh]">
          {file && (
            <div className="relative">
              <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm max-w-full">
                <img
                  src={file.processedPreview || file.preview}
                  alt={file.name}
                  className="w-full h-auto object-contain max-h-[60vh]"
                />
                
                {file.processed && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                  </div>
                )}
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <div className="flex justify-center space-x-4 text-sm text-gray-500 mt-1">
                  <span>{formatFileSize(file.size)}</span>
                  {file.processedSize && (
                    <span className="text-green-600">→ {formatFileSize(file.processedSize)}</span>
                  )}
                  {file.dimensions && (
                    <span>{file.dimensions.width}×{file.dimensions.height}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 z-30">
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-blue-800">Applying filters...</span>
              </div>
              <Progress value={processingProgress} className="h-2" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => setIsMobileSidebarOpen(true)}
              variant="outline"
              className="py-3"
            >
              <Settings className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            <Button 
              onClick={applyFilters}
              disabled={isProcessing || !file}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Palette className="h-4 w-4 mr-2" />
                  Apply
                </>
              )}
            </Button>
          </div>

          {file?.processed && (
            <Button 
              onClick={downloadFile}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Image
            </Button>
          )}
        </div>

        <MobileSidebar />
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-[calc(100vh-8rem)] w-full overflow-hidden">
        {/* Left Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Palette className="h-5 w-5 text-purple-600" />
                <h1 className="text-xl font-semibold text-gray-900">Image Filters</h1>
              </div>
              <Badge variant="secondary">Filter Mode</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={resetTool}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {file && (
                <div className="flex items-center space-x-1 border rounded-md">
                  <Button variant="ghost" size="sm" onClick={() => setZoomLevel(prev => Math.max(50, prev - 25))}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2">{zoomLevel}%</span>
                  <Button variant="ghost" size="sm" onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setZoomLevel(100)}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Canvas Content */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
            {file ? (
              <div className="relative max-w-full max-h-full">
                <img
                  src={file.processedPreview || file.preview}
                  alt={file.name}
                  className="max-w-full max-h-[70vh] object-contain border border-gray-300 rounded-lg shadow-lg bg-white"
                  style={{ 
                    transform: `scale(${Math.min(zoomLevel / 100, 1)})`,
                    transition: "transform 0.2s ease"
                  }}
                />
                
                {file.processed && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center max-w-md">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"></div>
                  <Palette className="relative h-24 w-24 text-purple-500 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-gray-700">Apply Image Filters</h3>
                <p className="text-gray-500 mb-6 text-lg">
                  Upload an image to start applying filters
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Sidebar */}
        <div className="w-80 xl:w-96 bg-white border-l shadow-lg flex flex-col h-full">
          <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filter Settings</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Adjust image filters and effects</p>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {filterOptions.map((option) => (
                  <div key={option.key} className="space-y-2">
                    <Label className="text-sm font-medium">{option.label}</Label>
                    
                    {option.type === "slider" && (
                      <div className="space-y-2">
                        <Slider
                          value={[filterValues[option.key] || option.defaultValue]}
                          onValueChange={([value]) => setFilterValues(prev => ({ ...prev, [option.key]: value }))}
                          min={option.min}
                          max={option.max}
                          step={option.step}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{option.min}</span>
                          <span className="font-medium">{filterValues[option.key] || option.defaultValue}</span>
                          <span>{option.max}</span>
                        </div>
                      </div>
                    )}

                    {option.type === "checkbox" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={filterValues[option.key] || false}
                          onCheckedChange={(checked) => setFilterValues(prev => ({ ...prev, [option.key]: checked }))}
                        />
                        <span className="text-sm">{option.label}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="p-6 border-t bg-gray-50 space-y-3 flex-shrink-0">
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-800">Applying filters...</span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </div>
            )}

            <Button 
              onClick={applyFilters}
              disabled={isProcessing || !file}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Applying...
                </>
              ) : (
                <>
                  <Palette className="h-4 w-4 mr-2" />
                  Apply Filters
                </>
              )}
            </Button>

            {file?.processed && (
              <Button 
                onClick={downloadFile}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Image
              </Button>
            )}

            {/* File Info */}
            {file && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-purple-800 mb-2">Filter Info</h4>
                <div className="text-xs text-purple-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Brightness:</span>
                    <span className="font-medium">{filterValues.brightness}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contrast:</span>
                    <span className="font-medium">{filterValues.contrast}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturation:</span>
                    <span className="font-medium">{filterValues.saturation}%</span>
                  </div>
                  {file.dimensions && (
                    <div className="flex justify-between">
                      <span>Dimensions:</span>
                      <span className="font-medium">{file.dimensions.width} × {file.dimensions.height}px</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />
    </div>
  )
}