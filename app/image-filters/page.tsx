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
import { AdBanner } from "@/components/ads/ad-banner"

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

export default function ImageFiltersPage() {
  const [file, setFile] = useState<ImageFile | null>(null)
  const [toolOptions, setToolOptions] = useState<Record<string, any>>({
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

  // Live preview effect
  useEffect(() => {
    if (file && !isProcessing) {
      applyFiltersLive()
    }
  }, [toolOptions, file])

  const applyFiltersLive = async () => {
    if (!file) return

    try {
      const filterOptions = {
        filters: {
          brightness: Math.max(0, Math.min(300, toolOptions.brightness || 100)),
          contrast: Math.max(0, Math.min(300, toolOptions.contrast || 100)),
          saturation: Math.max(0, Math.min(300, toolOptions.saturation || 100)),
          blur: Math.max(0, Math.min(50, toolOptions.blur || 0)),
          sepia: Boolean(toolOptions.sepia),
          grayscale: Boolean(toolOptions.grayscale),
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
        processedSize: processedBlob.size,
        blob: processedBlob
      } : null)
    } catch (error) {
      console.error("Live filter preview failed:", error)
    }
  }

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
    setToolOptions({
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

  const downloadFile = () => {
    if (!file?.blob) return

    const link = document.createElement("a")
    link.href = file.processedPreview || file.preview
    link.download = `${file.name.split('.')[0]}_filtered.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download started",
      description: "Filtered image downloaded successfully"
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
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
                      value={[toolOptions[option.key] || option.defaultValue]}
                      onValueChange={([value]) => setToolOptions(prev => ({ ...prev, [option.key]: value }))}
                      min={option.min}
                      max={option.max}
                      step={option.step}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{option.min}</span>
                      <span className="font-medium bg-gray-100 px-2 py-1 rounded">{toolOptions[option.key] || option.defaultValue}</span>
                      <span>{option.max}</span>
                    </div>
                  </div>
                )}

                {option.type === "checkbox" && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      checked={toolOptions[option.key] || false}
                      onCheckedChange={(checked) => setToolOptions(prev => ({ ...prev, [option.key]: checked }))}
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
          {file?.processedPreview && (
            <Button 
              onClick={() => {
                downloadFile()
                setIsMobileSidebarOpen(false)
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Filtered Image
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Before</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <img
                      src={file.preview}
                      alt="Original"
                      className="w-full h-auto object-contain border rounded"
                    />
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {file.dimensions?.width}×{file.dimensions?.height} • {formatFileSize(file.size)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* After */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">After</CardTitle>
                </CardHeader>
                <CardContent>
                  {file.processedPreview ? (
                    <div className="relative">
                      <img
                        src={file.processedPreview}
                        alt="Filtered"
                        className="w-full h-auto object-contain border rounded"
                      />
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        {file.dimensions?.width}×{file.dimensions?.height} • {file.processedSize && formatFileSize(file.processedSize)}
                      </div>
                      {file.processedPreview && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded border flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Filtered image will appear here</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Canvas Ad */}
          <div className="mt-6">
            <AdBanner 
              adSlot="image-filters-canvas"
              adFormat="auto"
              className="w-full"
              mobileOptimized={true}
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 z-30">
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
              onClick={downloadFile}
              disabled={!file?.processedPreview}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
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
                  <Button variant="ghost" size="sm" onClick={() => setZoomLevel(prev => Math.max(25, prev - 25))}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2">{zoomLevel}%</span>
                  <Button variant="ghost" size="sm" onClick={() => setZoomLevel(prev => Math.min(400, prev + 25))}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setZoomLevel(100)}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Canvas Content - Before/After View */}
          <div className="flex-1 overflow-hidden p-6">
            {file ? (
              <div className="grid grid-cols-2 gap-6 h-full">
                {/* Before */}
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Before</CardTitle>
                    <CardDescription>Original image</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="relative max-w-full max-h-full">
                      <img
                        src={file.preview}
                        alt="Original"
                        className="max-w-full max-h-[50vh] object-contain border border-gray-300 rounded-lg shadow-lg bg-white"
                        style={{ 
                          transform: `scale(${Math.min(zoomLevel / 100, 1)})`,
                          transition: "transform 0.2s ease"
                        }}
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {file.dimensions?.width}×{file.dimensions?.height}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* After */}
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>After</CardTitle>
                    <CardDescription>Filtered image</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center">
                    {file.processedPreview ? (
                      <div className="relative max-w-full max-h-full">
                        <img
                          src={file.processedPreview}
                          alt="Filtered"
                          className="max-w-full max-h-[50vh] object-contain border border-gray-300 rounded-lg shadow-lg bg-white"
                          style={{ 
                            transform: `scale(${Math.min(zoomLevel / 100, 1)})`,
                            transition: "transform 0.2s ease"
                          }}
                        />
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {file.dimensions?.width}×{file.dimensions?.height}
                        </div>
                        {file.processedPreview && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Palette className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>Filtered image will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center max-w-md mx-auto">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"></div>
                  <Palette className="relative h-24 w-24 text-purple-500 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-gray-700">Apply Filters to Your Image</h3>
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
            <p className="text-sm text-gray-600 mt-1">Adjust filters and effects</p>
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
                          value={[toolOptions[option.key] || option.defaultValue]}
                          onValueChange={([value]) => setToolOptions(prev => ({ ...prev, [option.key]: value }))}
                          min={option.min}
                          max={option.max}
                          step={option.step}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{option.min}</span>
                          <span className="font-medium">{toolOptions[option.key] || option.defaultValue}</span>
                          <span>{option.max}</span>
                        </div>
                      </div>
                    )}

                    {option.type === "checkbox" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={toolOptions[option.key] || false}
                          onCheckedChange={(checked) => setToolOptions(prev => ({ ...prev, [option.key]: checked }))}
                        />
                        <span className="text-sm">{option.label}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Filter Info */}
                {file && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Filter Info</h4>
                    <div className="text-xs text-purple-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Brightness:</span>
                        <span className="font-medium">{toolOptions.brightness}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Contrast:</span>
                        <span className="font-medium">{toolOptions.contrast}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saturation:</span>
                        <span className="font-medium">{toolOptions.saturation}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Effects:</span>
                        <span className="font-medium">
                          {toolOptions.sepia ? 'Sepia ' : ''}
                          {toolOptions.grayscale ? 'Grayscale' : ''}
                          {!toolOptions.sepia && !toolOptions.grayscale ? 'None' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="p-6 border-t bg-gray-50 space-y-3 flex-shrink-0">
            {file?.processedPreview && (
              <Button 
                onClick={downloadFile}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Filtered Image
              </Button>
            )}

            {/* File Info */}
            {file && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-purple-800 mb-2">Image Info</h4>
                <div className="text-xs text-purple-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Original Size:</span>
                    <span className="font-medium">{formatFileSize(file.size)}</span>
                  </div>
                  {file.processedSize && (
                    <div className="flex justify-between">
                      <span>Filtered Size:</span>
                      <span className="font-medium">{formatFileSize(file.processedSize)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Dimensions:</span>
                    <span className="font-medium">{file.dimensions?.width}×{file.dimensions?.height}</span>
                  </div>
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