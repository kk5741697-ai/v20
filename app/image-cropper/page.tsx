"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  AlertCircle,
  Settings,
  Crop,
  Move,
  RotateCw
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ImageProcessor } from "@/lib/processors/image-processor"
import { AdBanner } from "@/components/ads/ad-banner"

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

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

const aspectRatios = [
  { name: "Free", value: null },
  { name: "1:1 (Square)", value: 1 },
  { name: "4:3", value: 4/3 },
  { name: "3:2", value: 3/2 },
  { name: "16:9", value: 16/9 },
  { name: "21:9", value: 21/9 },
  { name: "3:4 (Portrait)", value: 3/4 },
  { name: "2:3 (Portrait)", value: 2/3 },
  { name: "9:16 (Portrait)", value: 9/16 },
]

const cropPresets = [
  { name: "Instagram Post", area: { x: 12.5, y: 12.5, width: 75, height: 75 } },
  { name: "YouTube Thumbnail", area: { x: 10, y: 20, width: 80, height: 45 } },
  { name: "Facebook Cover", area: { x: 5, y: 25, width: 90, height: 47.25 } },
  { name: "Twitter Header", area: { x: 0, y: 33.33, width: 100, height: 33.33 } },
  { name: "Center Square", area: { x: 25, y: 25, width: 50, height: 50 } },
]

export default function ImageCropperPage() {
  const [files, setFiles] = useState<ImageFile[]>([])
  const [cropArea, setCropArea] = useState<CropArea>({ x: 10, y: 10, width: 80, height: 80 })
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [outputFormat, setOutputFormat] = useState("png")
  const [quality, setQuality] = useState(95)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showUploadArea, setShowUploadArea] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragHandle, setDragHandle] = useState<string | null>(null)
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update container rect when needed
  useEffect(() => {
    const updateContainerRect = () => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect())
      }
    }

    updateContainerRect()
    window.addEventListener('resize', updateContainerRect)
    return () => window.removeEventListener('resize', updateContainerRect)
  }, [files])

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return

    const newFiles: ImageFile[] = []
    
    for (const file of Array.from(uploadedFiles)) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive"
        })
        continue
      }

      try {
        const dimensions = await getImageDimensions(file)
        const preview = await createImagePreview(file)
        
        const imageFile: ImageFile = {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          originalFile: file,
          name: file.name,
          size: file.size,
          dimensions,
          preview,
        }

        newFiles.push(imageFile)
      } catch (error) {
        toast({
          title: "Error loading image",
          description: `Failed to load ${file.name}`,
          variant: "destructive"
        })
      }
    }

    if (newFiles.length > 0) {
      setFiles(newFiles.slice(0, 1)) // Only take first file for cropping
      setShowUploadArea(false)
      toast({
        title: "Image uploaded",
        description: "Image loaded successfully for cropping"
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

  const removeFile = (fileId: string) => {
    setFiles([])
    setShowUploadArea(true)
  }

  const resetTool = () => {
    setFiles([])
    setCropArea({ x: 10, y: 10, width: 80, height: 80 })
    setAspectRatio(null)
    setProcessingProgress(0)
    setShowUploadArea(true)
    setIsMobileSidebarOpen(false)
  }

  const applyPreset = (preset: any) => {
    setCropArea(preset.area)
  }

  const handleCropAreaChange = (newArea: Partial<CropArea>) => {
    setCropArea(prev => {
      const updated = { ...prev, ...newArea }
      
      // Ensure crop area stays within bounds
      updated.x = Math.max(0, Math.min(100 - updated.width, updated.x))
      updated.y = Math.max(0, Math.min(100 - updated.height, updated.y))
      updated.width = Math.max(1, Math.min(100 - updated.x, updated.width))
      updated.height = Math.max(1, Math.min(100 - updated.y, updated.height))
      
      // Apply aspect ratio constraint if set
      if (aspectRatio && aspectRatio > 0) {
        const currentRatio = updated.width / updated.height
        if (Math.abs(currentRatio - aspectRatio) > 0.01) {
          if (currentRatio > aspectRatio) {
            updated.width = updated.height * aspectRatio
          } else {
            updated.height = updated.width / aspectRatio
          }
          
          // Ensure still within bounds after aspect ratio adjustment
          if (updated.x + updated.width > 100) {
            updated.width = 100 - updated.x
            updated.height = updated.width / aspectRatio
          }
          if (updated.y + updated.height > 100) {
            updated.height = 100 - updated.y
            updated.width = updated.height * aspectRatio
          }
        }
      }
      
      return updated
    })
  }

  // Enhanced mouse/touch handlers for crop area interaction
  const handleCropMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!containerRect) return
    
    setIsDragging(true)
    setDragHandle(handle)
    setDragStart({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top
    })
  }

  const handleCropMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragHandle || !containerRect) return

    const currentX = e.clientX - containerRect.left
    const currentY = e.clientY - containerRect.top
    const deltaX = ((currentX - dragStart.x) / containerRect.width) * 100
    const deltaY = ((currentY - dragStart.y) / containerRect.height) * 100

    switch (dragHandle) {
      case 'move':
        handleCropAreaChange({
          x: cropArea.x + deltaX,
          y: cropArea.y + deltaY
        })
        break
      case 'nw':
        handleCropAreaChange({
          x: cropArea.x + deltaX,
          y: cropArea.y + deltaY,
          width: cropArea.width - deltaX,
          height: cropArea.height - deltaY
        })
        break
      case 'ne':
        handleCropAreaChange({
          y: cropArea.y + deltaY,
          width: cropArea.width + deltaX,
          height: cropArea.height - deltaY
        })
        break
      case 'sw':
        handleCropAreaChange({
          x: cropArea.x + deltaX,
          width: cropArea.width - deltaX,
          height: cropArea.height + deltaY
        })
        break
      case 'se':
        handleCropAreaChange({
          width: cropArea.width + deltaX,
          height: cropArea.height + deltaY
        })
        break
      case 'n':
        handleCropAreaChange({
          y: cropArea.y + deltaY,
          height: cropArea.height - deltaY
        })
        break
      case 's':
        handleCropAreaChange({
          height: cropArea.height + deltaY
        })
        break
      case 'w':
        handleCropAreaChange({
          x: cropArea.x + deltaX,
          width: cropArea.width - deltaX
        })
        break
      case 'e':
        handleCropAreaChange({
          width: cropArea.width + deltaX
        })
        break
    }

    setDragStart({ x: currentX, y: currentY })
  }, [isDragging, dragHandle, containerRect, dragStart, cropArea])

  const handleCropMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragHandle(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleCropMouseMove)
      document.addEventListener('mouseup', handleCropMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleCropMouseMove)
        document.removeEventListener('mouseup', handleCropMouseUp)
      }
    }
  }, [isDragging, handleCropMouseMove, handleCropMouseUp])

  const handleProcess = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload an image to crop",
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

      const file = files[0]
      const processedBlob = await ImageProcessor.cropImage(file.originalFile || file.file, cropArea, {
        outputFormat: outputFormat as "jpeg" | "png" | "webp",
        quality,
        backgroundColor: "#ffffff"
      })

      clearInterval(progressInterval)
      setProcessingProgress(100)

      const processedUrl = URL.createObjectURL(processedBlob)
      const baseName = file.name.split(".")[0]
      const newName = `${baseName}_cropped.${outputFormat}`

      const processedFile = {
        ...file,
        processed: true,
        processedPreview: processedUrl,
        name: newName,
        processedSize: processedBlob.size,
        blob: processedBlob
      }

      setFiles([processedFile])
      
      toast({
        title: "Cropping complete",
        description: "Image cropped successfully"
      })
    } catch (error) {
      toast({
        title: "Cropping failed",
        description: error instanceof Error ? error.message : "Failed to crop image",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  const downloadFile = (file: ImageFile) => {
    if (!file.blob) return

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

  // Mobile Sidebar Component
  const MobileSidebar = () => (
    <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <SheetHeader className="px-6 py-4 border-b bg-gray-50">
          <SheetTitle className="flex items-center space-x-2">
            <Crop className="h-5 w-5 text-cyan-600" />
            <span>Crop Settings</span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Crop Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {cropPresets.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      applyPreset(preset)
                      setIsMobileSidebarOpen(false)
                    }}
                    className="text-xs h-auto p-3 flex flex-col items-center"
                  >
                    <span className="font-medium">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Aspect Ratio</Label>
              <Select value={aspectRatio?.toString() || "free"} onValueChange={(value) => setAspectRatio(value === "free" ? null : parseFloat(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatios.map((ratio) => (
                    <SelectItem key={ratio.name} value={ratio.value?.toString() || "free"}>
                      {ratio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Crop Area Controls */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-px bg-gray-200 flex-1"></div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Crop Area</Label>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">X Position (%)</Label>
                  <Input
                    type="number"
                    value={Math.round(cropArea.x)}
                    onChange={(e) => handleCropAreaChange({ x: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm">Y Position (%)</Label>
                  <Input
                    type="number"
                    value={Math.round(cropArea.y)}
                    onChange={(e) => handleCropAreaChange({ y: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm">Width (%)</Label>
                  <Input
                    type="number"
                    value={Math.round(cropArea.width)}
                    onChange={(e) => handleCropAreaChange({ width: parseFloat(e.target.value) || 1 })}
                    min={1}
                    max={100}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-sm">Height (%)</Label>
                  <Input
                    type="number"
                    value={Math.round(cropArea.height)}
                    onChange={(e) => handleCropAreaChange({ height: parseFloat(e.target.value) || 1 })}
                    min={1}
                    max={100}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Output Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-px bg-gray-200 flex-1"></div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Output</Label>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Output Format</Label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Quality: {quality}%</Label>
                <Slider
                  value={[quality]}
                  onValueChange={([value]) => setQuality(value)}
                  min={10}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Mobile Ad */}
          </div>
        </ScrollArea>
        
        {/* Mobile Footer */}
        <div className="p-4 border-t bg-white space-y-3">
          <Button 
            onClick={() => {
              handleProcess()
              setIsMobileSidebarOpen(false)
            }}
            disabled={isProcessing || files.length === 0}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 text-base font-semibold"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Cropping...
              </>
            ) : (
              <>
                <Crop className="h-4 w-4 mr-2" />
                Crop Image
              </>
            )}
          </Button>

          {files.some(f => f.processed) && (
            <Button 
              onClick={() => {
                const processedFile = files.find(f => f.processed)
                if (processedFile) downloadFile(processedFile)
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

  // Show upload area if no files
  if (showUploadArea && files.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-2 lg:py-3">
            <AdBanner 
              adSlot="tool-header-banner"
              adFormat="auto"
              className="max-w-4xl mx-auto"
            />
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 lg:py-8">
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center space-x-2 mb-4">
              <Crop className="h-6 w-6 lg:h-8 lg:w-8 text-cyan-600" />
              <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Image Cropper</h1>
            </div>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Crop images with precision using our visual editor and aspect ratio presets. Perfect for social media and web optimization.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-cyan-400 hover:bg-cyan-50/30 transition-all duration-300 p-8 lg:p-16 group"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="relative mb-4 lg:mb-6">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
                <Upload className="relative h-16 w-16 lg:h-20 lg:w-20 text-cyan-500 group-hover:text-cyan-600 transition-colors group-hover:scale-110 transform duration-300" />
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold mb-2 lg:mb-3 text-gray-700 group-hover:text-cyan-600 transition-colors">Drop image here</h3>
              <p className="text-gray-500 mb-4 lg:mb-6 text-base lg:text-lg text-center">or tap to browse files</p>
              <Button className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white px-6 lg:px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
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

  // Crop interface
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-1 lg:py-2">
          <AdBanner 
            adSlot="tool-header-banner"
            adFormat="auto"
            className="max-w-6xl mx-auto"
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Crop className="h-5 w-5 text-cyan-600" />
            <h1 className="text-lg font-semibold text-gray-900">Image Cropper</h1>
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
          {files.map((file) => (
            <div key={file.id} className="relative">
              <div 
                ref={containerRef}
                className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm max-w-full"
                style={{ aspectRatio: file.dimensions ? `${file.dimensions.width}/${file.dimensions.height}` : '1' }}
              >
                <img
                  src={file.processedPreview || file.preview}
                  alt={file.name}
                  className="w-full h-full object-contain"
                />
                
                {/* Interactive Crop Overlay - Mobile Optimized */}
                <div 
                  className="absolute border-2 border-cyan-500 bg-cyan-500/10 cursor-move"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.width}%`,
                    height: `${cropArea.height}%`,
                  }}
                  onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                >
                  {/* Corner handles for mobile */}
                  <div 
                    className="absolute -top-3 -left-3 w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg cursor-nw-resize touch-manipulation"
                    onMouseDown={(e) => handleCropMouseDown(e, 'nw')}
                  ></div>
                  <div 
                    className="absolute -top-3 -right-3 w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg cursor-ne-resize touch-manipulation"
                    onMouseDown={(e) => handleCropMouseDown(e, 'ne')}
                  ></div>
                  <div 
                    className="absolute -bottom-3 -left-3 w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg cursor-sw-resize touch-manipulation"
                    onMouseDown={(e) => handleCropMouseDown(e, 'sw')}
                  ></div>
                  <div 
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg cursor-se-resize touch-manipulation"
                    onMouseDown={(e) => handleCropMouseDown(e, 'se')}
                  ></div>
                  
                  {/* Edge handles */}
                  <div 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg cursor-n-resize touch-manipulation"
                    onMouseDown={(e) => handleCropMouseDown(e, 'n')}
                  ></div>
                  <div 
                    className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg cursor-s-resize touch-manipulation"
                    onMouseDown={(e) => handleCropMouseDown(e, 's')}
                  ></div>
                  <div 
                    className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg cursor-w-resize touch-manipulation"
                    onMouseDown={(e) => handleCropMouseDown(e, 'w')}
                  ></div>
                  <div 
                    className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg cursor-e-resize touch-manipulation"
                    onMouseDown={(e) => handleCropMouseDown(e, 'e')}
                  ></div>
                </div>
                
                {file.processed && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                  </div>
                )}
              </div>
              
              <div className="mt-2 text-center">
                <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatFileSize(file.size)}</span>
                  {file.processedSize && (
                    <span className="text-green-600">→ {formatFileSize(file.processedSize)}</span>
                  )}
                </div>
                {file.dimensions && (
                  <p className="text-xs text-gray-400">{file.dimensions.width}×{file.dimensions.height}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 z-30">
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-blue-800">Cropping image...</span>
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
              Settings
            </Button>
            
            <Button 
              onClick={handleProcess}
              disabled={isProcessing || files.length === 0}
              className="bg-cyan-600 hover:bg-cyan-700 text-white py-3"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Crop className="h-4 w-4 mr-2" />
                  Crop
                </>
              )}
            </Button>
          </div>

          {files.some(f => f.processed) && (
            <Button 
              onClick={() => {
                const processedFile = files.find(f => f.processed)
                if (processedFile) downloadFile(processedFile)
              }}
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
                <Crop className="h-5 w-5 text-cyan-600" />
                <h1 className="text-xl font-semibold text-gray-900">Image Cropper</h1>
              </div>
              <Badge variant="secondary">Crop Mode</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={resetTool}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {files.length > 0 && (
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

          {/* Canvas Content - Enhanced Interactive Crop */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
            {files.map((file) => (
              <div key={file.id} className="relative max-w-full max-h-full">
                <div 
                  ref={containerRef}
                  className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg select-none"
                  style={{ 
                    maxWidth: '80vw',
                    maxHeight: '70vh',
                    aspectRatio: file.dimensions ? `${file.dimensions.width}/${file.dimensions.height}` : '1'
                  }}
                >
                  <img
                    src={file.processedPreview || file.preview}
                    alt={file.name}
                    className="w-full h-full object-contain pointer-events-none"
                    style={{ 
                      transform: `scale(${Math.min(zoomLevel / 100, 1)})`,
                      transformOrigin: 'center center'
                    }}
                    draggable={false}
                  />
                  
                  {/* Enhanced Interactive Crop Overlay */}
                  <div 
                    className="absolute border-2 border-cyan-500 bg-cyan-500/10 cursor-move select-none"
                    style={{
                      left: `${cropArea.x}%`,
                      top: `${cropArea.y}%`,
                      width: `${cropArea.width}%`,
                      height: `${cropArea.height}%`,
                    }}
                    onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                  >
                    {/* Corner resize handles */}
                    <div 
                      className="absolute -top-2 -left-2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full cursor-nw-resize hover:scale-125 transition-transform shadow-lg"
                      onMouseDown={(e) => handleCropMouseDown(e, 'nw')}
                    ></div>
                    <div 
                      className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full cursor-ne-resize hover:scale-125 transition-transform shadow-lg"
                      onMouseDown={(e) => handleCropMouseDown(e, 'ne')}
                    ></div>
                    <div 
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full cursor-sw-resize hover:scale-125 transition-transform shadow-lg"
                      onMouseDown={(e) => handleCropMouseDown(e, 'sw')}
                    ></div>
                    <div 
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full cursor-se-resize hover:scale-125 transition-transform shadow-lg"
                      onMouseDown={(e) => handleCropMouseDown(e, 'se')}
                    ></div>
                    
                    {/* Edge handles */}
                    <div 
                      className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full cursor-n-resize hover:scale-125 transition-transform shadow-lg"
                      onMouseDown={(e) => handleCropMouseDown(e, 'n')}
                    ></div>
                    <div 
                      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full cursor-s-resize hover:scale-125 transition-transform shadow-lg"
                      onMouseDown={(e) => handleCropMouseDown(e, 's')}
                    ></div>
                    <div 
                      className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full cursor-w-resize hover:scale-125 transition-transform shadow-lg"
                      onMouseDown={(e) => handleCropMouseDown(e, 'w')}
                    ></div>
                    <div 
                      className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full cursor-e-resize hover:scale-125 transition-transform shadow-lg"
                      onMouseDown={(e) => handleCropMouseDown(e, 'e')}
                    ></div>

                    {/* Move handle in center */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-cyan-600 rounded-full border-2 border-white shadow-lg cursor-move opacity-80 hover:opacity-100 transition-opacity">
                      <Move className="h-3 w-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  
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
            ))}
          </div>
        </div>

        {/* Desktop Right Sidebar */}
        <div className="w-80 xl:w-96 bg-white border-l shadow-lg flex flex-col h-full">
          <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Crop className="h-5 w-5 text-cyan-600" />
              <h2 className="text-lg font-semibold text-gray-900">Crop Settings</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Configure crop area and output</p>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Presets */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Presets</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {cropPresets.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="text-xs h-auto p-2 flex flex-col items-center"
                      >
                        <span className="font-medium">{preset.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Aspect Ratio</Label>
                  <Select value={aspectRatio?.toString() || "free"} onValueChange={(value) => setAspectRatio(value === "free" ? null : parseFloat(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aspectRatios.map((ratio) => (
                        <SelectItem key={ratio.name} value={ratio.value?.toString() || "free"}>
                          {ratio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Crop Area Controls */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Crop Area</Label>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">X Position (%)</Label>
                      <Input
                        type="number"
                        value={Math.round(cropArea.x)}
                        onChange={(e) => handleCropAreaChange({ x: parseFloat(e.target.value) || 0 })}
                        min={0}
                        max={100}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Y Position (%)</Label>
                      <Input
                        type="number"
                        value={Math.round(cropArea.y)}
                        onChange={(e) => handleCropAreaChange({ y: parseFloat(e.target.value) || 0 })}
                        min={0}
                        max={100}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Width (%)</Label>
                      <Input
                        type="number"
                        value={Math.round(cropArea.width)}
                        onChange={(e) => handleCropAreaChange({ width: parseFloat(e.target.value) || 1 })}
                        min={1}
                        max={100}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Height (%)</Label>
                      <Input
                        type="number"
                        value={Math.round(cropArea.height)}
                        onChange={(e) => handleCropAreaChange({ height: parseFloat(e.target.value) || 1 })}
                        min={1}
                        max={100}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Output Settings */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Output</Label>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Output Format</Label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="jpeg">JPEG</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Quality: {quality}%</Label>
                    <Slider
                      value={[quality]}
                      onValueChange={([value]) => setQuality(value)}
                      min={10}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Sidebar Ad */}
              </div>
            </ScrollArea>
          </div>

          <div className="p-6 border-t bg-gray-50 space-y-3 flex-shrink-0">
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-800">Cropping image...</span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </div>
            )}

            <Button 
              onClick={handleProcess}
              disabled={isProcessing || files.length === 0}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cropping...
                </>
              ) : (
                <>
                  <Crop className="h-4 w-4 mr-2" />
                  Crop Image
                </>
              )}
            </Button>

            {files.some(f => f.processed) && (
              <Button 
                onClick={() => {
                  const processedFile = files.find(f => f.processed)
                  if (processedFile) downloadFile(processedFile)
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Image
              </Button>
            )}

            {/* File Info */}
            {files.length > 0 && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-cyan-800 mb-2">Crop Info</h4>
                <div className="text-xs text-cyan-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Crop Area:</span>
                    <span className="font-medium">{Math.round(cropArea.width)}% × {Math.round(cropArea.height)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Position:</span>
                    <span className="font-medium">{Math.round(cropArea.x)}%, {Math.round(cropArea.y)}%</span>
                  </div>
                  {files[0]?.dimensions && (
                    <div className="flex justify-between">
                      <span>Output Size:</span>
                      <span className="font-medium">
                        {Math.round((cropArea.width / 100) * files[0].dimensions.width)} × {Math.round((cropArea.height / 100) * files[0].dimensions.height)}px
                      </span>
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