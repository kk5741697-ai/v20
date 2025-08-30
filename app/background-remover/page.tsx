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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Upload, 
  Download, 
  CheckCircle,
  X,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Settings,
  Scissors,
  Palette,
  Crop,
  Eraser,
  Paintbrush,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Layers,
  Blur,
  Shadow,
  Move,
  RotateCw
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { AdvancedBackgroundProcessor } from "@/lib/processors/advanced-background-processor"
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
  maskData?: ImageData
  originalImageData?: ImageData
}

interface BackgroundOption {
  id: string
  name: string
  type: "color" | "gradient" | "image" | "blur" | "transparent"
  value: string
  preview?: string
}

const backgroundOptions: BackgroundOption[] = [
  { id: "transparent", name: "Transparent", type: "transparent", value: "transparent" },
  { id: "white", name: "White", type: "color", value: "#ffffff" },
  { id: "black", name: "Black", type: "color", value: "#000000" },
  { id: "blue", name: "Blue", type: "color", value: "#3b82f6" },
  { id: "green", name: "Green", type: "color", value: "#10b981" },
  { id: "red", name: "Red", type: "color", value: "#ef4444" },
  { id: "gradient1", name: "Blue Gradient", type: "gradient", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "gradient2", name: "Sunset", type: "gradient", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: "gradient3", name: "Ocean", type: "gradient", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { id: "blur", name: "Blur Original", type: "blur", value: "blur" },
]

export default function BackgroundRemoverPage() {
  const [file, setFile] = useState<ImageFile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState("")
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showUploadArea, setShowUploadArea] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("remove")
  const [selectedBackground, setSelectedBackground] = useState("transparent")
  const [customColor, setCustomColor] = useState("#ffffff")
  const [customImageUrl, setCustomImageUrl] = useState("")
  const [brushSize, setBrushSize] = useState(20)
  const [brushHardness, setBrushHardness] = useState(80)
  const [isErasing, setIsErasing] = useState(false)
  const [showMask, setShowMask] = useState(false)
  const [blurAmount, setBlurAmount] = useState(10)
  const [shadowIntensity, setShadowIntensity] = useState(50)
  const [shadowOffset, setShadowOffset] = useState(10)
  const [cropMode, setCropMode] = useState(false)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [algorithm, setAlgorithm] = useState("auto")
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

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

    // Strict file size limit to prevent crashes
    const maxSize = 15 * 1024 * 1024 // 15MB limit
    if (uploadedFile.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please use an image smaller than 15MB to prevent browser crashes",
        variant: "destructive"
      })
      return
    }

    try {
      const dimensions = await getImageDimensions(uploadedFile)
      
      // Additional dimension check to prevent crashes
      if (dimensions.width * dimensions.height > 3072 * 3072) {
        toast({
          title: "Image resolution too high",
          description: "Please use an image with fewer than 9 megapixels to prevent crashes",
          variant: "destructive"
        })
        return
      }

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
      setHistory([])
      setHistoryIndex(-1)
      
      toast({
        title: "Image uploaded",
        description: "Image loaded successfully for background removal"
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
    setProcessingProgress(0)
    setShowUploadArea(true)
    setIsMobileSidebarOpen(false)
    setActiveTab("remove")
    setHistory([])
    setHistoryIndex(-1)
  }

  const saveToHistory = (imageData: ImageData) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(imageData)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      const canvas = canvasRef.current
      if (canvas && history[historyIndex - 1]) {
        const ctx = canvas.getContext("2d")!
        ctx.putImageData(history[historyIndex - 1], 0, 0)
      }
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      const canvas = canvasRef.current
      if (canvas && history[historyIndex + 1]) {
        const ctx = canvas.getContext("2d")!
        ctx.putImageData(history[historyIndex + 1], 0, 0)
      }
    }
  }

  const handleRemoveBackground = async () => {
    if (!file) return

    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStage("Analyzing image...")

    try {
      const progressCallback = (progress: number, stage: string) => {
        setProcessingProgress(progress)
        setProcessingStage(stage)
      }

      const result = await AdvancedBackgroundProcessor.removeBackground(
        file.originalFile || file.file,
        {
          algorithm: algorithm as any,
          sensitivity: 25,
          featherEdges: true,
          preserveDetails: true,
          memoryOptimized: true,
          maxDimensions: { width: 1536, height: 1536 }, // Reduced for stability
          progressCallback
        }
      )

      const processedUrl = URL.createObjectURL(result.processedBlob)
      
      setFile(prev => prev ? {
        ...prev,
        processed: true,
        processedPreview: processedUrl,
        processedSize: result.processedBlob.size,
        blob: result.processedBlob,
        maskData: result.maskData,
        originalImageData: result.originalImageData
      } : null)

      // Save to history
      if (result.originalImageData) {
        saveToHistory(result.originalImageData)
      }

      toast({
        title: "Background removed",
        description: "Background removed successfully"
      })
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to remove background",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
      setProcessingStage("")
    }
  }

  const applyBackground = async () => {
    if (!file?.blob) return

    setIsProcessing(true)
    setProcessingStage("Applying background...")

    try {
      let backgroundConfig: any = { type: "transparent" }

      if (selectedBackground === "custom-color") {
        backgroundConfig = { type: "color", value: customColor }
      } else if (selectedBackground === "custom-image") {
        backgroundConfig = { type: "image", value: customImageUrl }
      } else {
        const bgOption = backgroundOptions.find(bg => bg.id === selectedBackground)
        if (bgOption) {
          backgroundConfig = { type: bgOption.type, value: bgOption.value }
        }
      }

      const result = await AdvancedBackgroundProcessor.applyBackground(
        file.blob,
        backgroundConfig,
        {
          blurAmount: blurAmount,
          shadowIntensity: shadowIntensity / 100,
          shadowOffset: shadowOffset,
          quality: 95
        }
      )

      const processedUrl = URL.createObjectURL(result)
      
      setFile(prev => prev ? {
        ...prev,
        processedPreview: processedUrl,
        processedSize: result.size,
        blob: result
      } : null)

      toast({
        title: "Background applied",
        description: "New background applied successfully"
      })
    } catch (error) {
      toast({
        title: "Failed to apply background",
        description: error instanceof Error ? error.message : "Background application failed",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setProcessingStage("")
    }
  }

  const downloadFile = () => {
    if (!file?.blob) return

    const link = document.createElement("a")
    link.href = file.processedPreview || file.preview
    link.download = `${file.name.split('.')[0]}_bg_removed.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download started",
      description: "Image downloaded successfully"
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  // Canvas drawing functions for erase/restore
  const startDrawing = (e: React.MouseEvent) => {
    if (!canvasRef.current || !file?.maskData) return
    
    setIsDrawing(true)
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width)
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height)
    setLastPoint({ x, y })
  }

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current || !lastPoint || !file?.maskData) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width)
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height)
    
    const ctx = canvasRef.current.getContext("2d")!
    const maskCtx = maskCanvasRef.current?.getContext("2d")
    
    if (maskCtx) {
      maskCtx.globalCompositeOperation = isErasing ? "destination-out" : "source-over"
      maskCtx.strokeStyle = isErasing ? "rgba(0,0,0,1)" : "rgba(255,255,255,1)"
      maskCtx.lineWidth = brushSize
      maskCtx.lineCap = "round"
      maskCtx.lineJoin = "round"
      
      maskCtx.beginPath()
      maskCtx.moveTo(lastPoint.x, lastPoint.y)
      maskCtx.lineTo(x, y)
      maskCtx.stroke()
    }
    
    setLastPoint({ x, y })
  }

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")!
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
      saveToHistory(imageData)
    }
    setIsDrawing(false)
    setLastPoint(null)
  }

  // Mobile Sidebar Component
  const MobileSidebar = () => (
    <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
      <SheetContent side="bottom" className="h-[85vh] p-0">
        <SheetHeader className="px-6 py-4 border-b bg-gray-50">
          <SheetTitle className="flex items-center space-x-2">
            <Scissors className="h-5 w-5 text-purple-600" />
            <span>Background Remover Pro</span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="remove">Remove</TabsTrigger>
                <TabsTrigger value="background">Background</TabsTrigger>
                <TabsTrigger value="effects">Effects</TabsTrigger>
                <TabsTrigger value="adjust">Adjust</TabsTrigger>
              </TabsList>

              <TabsContent value="remove" className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Algorithm</Label>
                  <Select value={algorithm} onValueChange={setAlgorithm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto Detect</SelectItem>
                      <SelectItem value="portrait">Portrait Mode</SelectItem>
                      <SelectItem value="object">Object Mode</SelectItem>
                      <SelectItem value="precise">Precise Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <Label className="text-sm">Preserve fine details</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <Label className="text-sm">Feather edges</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <Label className="text-sm">Memory optimized</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="background" className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {backgroundOptions.map((bg) => (
                    <Button
                      key={bg.id}
                      variant={selectedBackground === bg.id ? "default" : "outline"}
                      onClick={() => setSelectedBackground(bg.id)}
                      className="h-16 p-2 flex flex-col items-center"
                    >
                      <div 
                        className="w-8 h-8 rounded border mb-1"
                        style={{ 
                          background: bg.type === "gradient" ? bg.value : 
                                    bg.type === "color" ? bg.value : 
                                    bg.type === "transparent" ? "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\"><rect width=\"10\" height=\"10\" fill=\"%23f3f4f6\"/><rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"%23f3f4f6\"/></svg>')" :
                                    "#f3f4f6"
                        }}
                      />
                      <span className="text-xs">{bg.name}</span>
                    </Button>
                  ))}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Custom Color</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value)
                        setSelectedBackground("custom-color")
                      }}
                      className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <Input
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value)
                        setSelectedBackground("custom-color")
                      }}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Custom Image URL</Label>
                  <Input
                    value={customImageUrl}
                    onChange={(e) => {
                      setCustomImageUrl(e.target.value)
                      setSelectedBackground("custom-image")
                    }}
                    placeholder="https://example.com/background.jpg"
                    className="text-xs"
                  />
                </div>
              </TabsContent>

              <TabsContent value="effects" className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Blur Amount: {blurAmount}px</Label>
                  <Slider
                    value={[blurAmount]}
                    onValueChange={([value]) => setBlurAmount(value)}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Shadow Intensity: {shadowIntensity}%</Label>
                  <Slider
                    value={[shadowIntensity]}
                    onValueChange={([value]) => setShadowIntensity(value)}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Shadow Offset: {shadowOffset}px</Label>
                  <Slider
                    value={[shadowOffset]}
                    onValueChange={([value]) => setShadowOffset(value)}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
              </TabsContent>

              <TabsContent value="adjust" className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Brush Tools</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={!isErasing ? "default" : "outline"}
                      onClick={() => setIsErasing(false)}
                      className="flex items-center space-x-2"
                    >
                      <Paintbrush className="h-4 w-4" />
                      <span>Restore</span>
                    </Button>
                    <Button
                      variant={isErasing ? "default" : "outline"}
                      onClick={() => setIsErasing(true)}
                      className="flex items-center space-x-2"
                    >
                      <Eraser className="h-4 w-4" />
                      <span>Erase</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Brush Size: {brushSize}px</Label>
                  <Slider
                    value={[brushSize]}
                    onValueChange={([value]) => setBrushSize(value)}
                    min={5}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Brush Hardness: {brushHardness}%</Label>
                  <Slider
                    value={[brushHardness]}
                    onValueChange={([value]) => setBrushHardness(value)}
                    min={0}
                    max={100}
                    step={10}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={showMask}
                    onCheckedChange={setShowMask}
                  />
                  <Label className="text-sm">Show mask overlay</Label>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t bg-white space-y-3">
          <Button 
            onClick={() => {
              handleRemoveBackground()
              setIsMobileSidebarOpen(false)
            }}
            disabled={isProcessing || !file}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {processingStage}
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4 mr-2" />
                Remove Background
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
              Download Result
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
              <Scissors className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
              <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Background Remover Pro</h1>
            </div>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Professional background removal with advanced editing tools. Remove, replace, and enhance backgrounds with precision.
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
                <p className="text-xs text-gray-400">Single image • Up to 15MB • Max 9MP</p>
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

  // Main editing interface
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Scissors className="h-5 w-5 text-purple-600" />
            <h1 className="text-lg font-semibold text-gray-900">Background Remover Pro</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <Redo className="h-4 w-4" />
            </Button>
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
              <div 
                ref={containerRef}
                className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm max-w-full"
                style={{ aspectRatio: file.dimensions ? `${file.dimensions.width}/${file.dimensions.height}` : '1' }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                
                <canvas
                  ref={maskCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ opacity: showMask ? 0.5 : 0 }}
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
                <span className="text-sm font-medium text-blue-800">{processingStage}</span>
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
              Tools
            </Button>
            
            <Button 
              onClick={handleRemoveBackground}
              disabled={isProcessing || !file}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Scissors className="h-4 w-4 mr-2" />
                  Remove BG
                </>
              )}
            </Button>
          </div>

          {file?.processed && (
            <Button 
              onClick={downloadFile}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Result
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
                <Scissors className="h-5 w-5 text-purple-600" />
                <h1 className="text-xl font-semibold text-gray-900">Background Remover Pro</h1>
              </div>
              <Badge variant="secondary">Professional Mode</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo className="h-4 w-4" />
              </Button>
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

          {/* Canvas Content */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
            {file ? (
              <div className="relative max-w-full max-h-full">
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
                  
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ opacity: activeTab === "adjust" ? 1 : 0, pointerEvents: activeTab === "adjust" ? "auto" : "none" }}
                  />
                  
                  <canvas
                    ref={maskCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ opacity: showMask ? 0.5 : 0 }}
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
            ) : (
              <div className="text-center max-w-md">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"></div>
                  <Scissors className="relative h-24 w-24 text-purple-500 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-gray-700">Professional Background Removal</h3>
                <p className="text-gray-500 mb-6 text-lg">
                  Upload an image to start removing backgrounds
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Sidebar */}
        <div className="w-80 xl:w-96 bg-white border-l shadow-lg flex flex-col h-full">
          <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Scissors className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Pro Tools</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Advanced background editing</p>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="remove">Remove</TabsTrigger>
                    <TabsTrigger value="background">Background</TabsTrigger>
                    <TabsTrigger value="effects">Effects</TabsTrigger>
                    <TabsTrigger value="adjust">Adjust</TabsTrigger>
                  </TabsList>

                  <TabsContent value="remove" className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Algorithm</Label>
                      <Select value={algorithm} onValueChange={setAlgorithm}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto Detect</SelectItem>
                          <SelectItem value="portrait">Portrait Mode</SelectItem>
                          <SelectItem value="object">Object Mode</SelectItem>
                          <SelectItem value="precise">Precise Mode</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked />
                        <Label className="text-sm">Preserve fine details</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked />
                        <Label className="text-sm">Feather edges</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked />
                        <Label className="text-sm">Memory optimized</Label>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="background" className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {backgroundOptions.map((bg) => (
                        <Button
                          key={bg.id}
                          variant={selectedBackground === bg.id ? "default" : "outline"}
                          onClick={() => setSelectedBackground(bg.id)}
                          className="h-16 p-2 flex flex-col items-center"
                        >
                          <div 
                            className="w-8 h-8 rounded border mb-1"
                            style={{ 
                              background: bg.type === "gradient" ? bg.value : 
                                        bg.type === "color" ? bg.value : 
                                        bg.type === "transparent" ? "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\"><rect width=\"10\" height=\"10\" fill=\"%23f3f4f6\"/><rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"%23f3f4f6\"/></svg>')" :
                                        "#f3f4f6"
                            }}
                          />
                          <span className="text-xs">{bg.name}</span>
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Custom Color</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => {
                            setCustomColor(e.target.value)
                            setSelectedBackground("custom-color")
                          }}
                          className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                        />
                        <Input
                          value={customColor}
                          onChange={(e) => {
                            setCustomColor(e.target.value)
                            setSelectedBackground("custom-color")
                          }}
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Custom Image URL</Label>
                      <Input
                        value={customImageUrl}
                        onChange={(e) => {
                          setCustomImageUrl(e.target.value)
                          setSelectedBackground("custom-image")
                        }}
                        placeholder="https://example.com/background.jpg"
                        className="text-xs"
                      />
                    </div>

                    {selectedBackground !== "transparent" && (
                      <Button 
                        onClick={applyBackground}
                        disabled={isProcessing || !file?.blob}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Palette className="h-4 w-4 mr-2" />
                        Apply Background
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="effects" className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Blur Amount: {blurAmount}px</Label>
                      <Slider
                        value={[blurAmount]}
                        onValueChange={([value]) => setBlurAmount(value)}
                        min={0}
                        max={50}
                        step={1}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Shadow Intensity: {shadowIntensity}%</Label>
                      <Slider
                        value={[shadowIntensity]}
                        onValueChange={([value]) => setShadowIntensity(value)}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Shadow Offset: {shadowOffset}px</Label>
                      <Slider
                        value={[shadowOffset]}
                        onValueChange={([value]) => setShadowOffset(value)}
                        min={0}
                        max={50}
                        step={1}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="adjust" className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Brush Tools</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={!isErasing ? "default" : "outline"}
                          onClick={() => setIsErasing(false)}
                          className="flex items-center space-x-2"
                        >
                          <Paintbrush className="h-4 w-4" />
                          <span>Restore</span>
                        </Button>
                        <Button
                          variant={isErasing ? "default" : "outline"}
                          onClick={() => setIsErasing(true)}
                          className="flex items-center space-x-2"
                        >
                          <Eraser className="h-4 w-4" />
                          <span>Erase</span>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Brush Size: {brushSize}px</Label>
                      <Slider
                        value={[brushSize]}
                        onValueChange={([value]) => setBrushSize(value)}
                        min={5}
                        max={100}
                        step={5}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Brush Hardness: {brushHardness}%</Label>
                      <Slider
                        value={[brushHardness]}
                        onValueChange={([value]) => setBrushHardness(value)}
                        min={0}
                        max={100}
                        step={10}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={showMask}
                        onCheckedChange={setShowMask}
                      />
                      <Label className="text-sm">Show mask overlay</Label>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Sidebar Ad */}
                <AdBanner 
                  adSlot="background-remover-sidebar"
                  adFormat="auto"
                  className="w-full"
                />
              </div>
            </ScrollArea>
          </div>

          <div className="p-6 border-t bg-gray-50 space-y-3 flex-shrink-0">
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-800">{processingStage}</span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </div>
            )}

            <Button 
              onClick={handleRemoveBackground}
              disabled={isProcessing || !file}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {processingStage}
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4 mr-2" />
                  Remove Background
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
                Download Result
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
                      <span>Processed Size:</span>
                      <span className="font-medium">{formatFileSize(file.processedSize)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Dimensions:</span>
                    <span className="font-medium">{file.dimensions?.width}×{file.dimensions?.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Algorithm:</span>
                    <span className="font-medium">{algorithm}</span>
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