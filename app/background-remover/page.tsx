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
  Scissors,
  Eye,
  EyeOff
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ImageProcessor } from "@/lib/processors/image-processor"
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
  error?: string
}

const backgroundRemovalOptions = [
  {
    key: "algorithm",
    label: "Algorithm",
    type: "select" as const,
    defaultValue: "auto",
    selectOptions: [
      { value: "auto", label: "Auto (Recommended)" },
      { value: "portrait", label: "Portrait & People" },
      { value: "object", label: "Objects & Products" },
      { value: "general", label: "General Purpose" },
    ],
  },
  {
    key: "sensitivity",
    label: "Sensitivity",
    type: "slider" as const,
    defaultValue: 25,
    min: 10,
    max: 50,
    step: 5,
  },
  {
    key: "featherEdges",
    label: "Feather Edges",
    type: "checkbox" as const,
    defaultValue: true,
  },
  {
    key: "preserveDetails",
    label: "Preserve Details",
    type: "checkbox" as const,
    defaultValue: true,
  },
]

export default function BackgroundRemoverPage() {
  const [files, setFiles] = useState<ImageFile[]>([])
  const [toolOptions, setToolOptions] = useState<Record<string, any>>({
    algorithm: "auto",
    sensitivity: 25,
    featherEdges: true,
    preserveDetails: true,
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState("")
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showUploadArea, setShowUploadArea] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [showBefore, setShowBefore] = useState(true)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      // Enhanced file size checking
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is ${Math.round(file.size / (1024 * 1024))}MB. Maximum 25MB allowed.`,
          variant: "destructive"
        })
        continue
      }

      if (files.length + newFiles.length >= 5) {
        toast({
          title: "Too many files",
          description: "Maximum 5 files allowed for background removal",
          variant: "destructive"
        })
        break
      }

      try {
        const dimensions = await getImageDimensions(file)
        
        // Check image resolution
        if (dimensions.width * dimensions.height > 1536 * 1536) {
          toast({
            title: "Image resolution too high",
            description: `${file.name} has very high resolution. This may cause processing issues.`,
          })
        }
        
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
      setFiles(prev => [...prev, ...newFiles])
      setShowUploadArea(false)
      toast({
        title: "Images uploaded",
        description: `${newFiles.length} image${newFiles.length > 1 ? 's' : ''} loaded successfully`
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
    setFiles(prev => prev.filter(f => f.id !== fileId))
    if (files.length === 1) {
      setShowUploadArea(true)
    }
  }

  const resetTool = () => {
    setFiles([])
    setProcessingProgress(0)
    setProcessingStage("")
    setShowUploadArea(true)
    setIsMobileSidebarOpen(false)
    setToolOptions({
      algorithm: "auto",
      sensitivity: 25,
      featherEdges: true,
      preserveDetails: true,
    })
  }

  const handleProcess = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload images to process",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStage("Initializing")

    try {
      const processedFiles = await Promise.all(
        files.map(async (file, index) => {
          try {
            setProcessingStage(`Processing ${file.name}`)
            
            const progressCallback = (progress: number, stage: string) => {
              const fileProgress = (index / files.length) * 100 + (progress / files.length)
              setProcessingProgress(fileProgress)
              setProcessingStage(stage)
            }

            const processedBlob = await ImageProcessor.removeBackground(file.originalFile || file.file, {
              ...toolOptions,
              progressCallback
            })

            const processedUrl = URL.createObjectURL(processedBlob)
            
            const baseName = file.name.split(".")[0]
            const newName = `${baseName}_no_bg.png`

            return {
              ...file,
              processed: true,
              processedPreview: processedUrl,
              name: newName,
              processedSize: processedBlob.size,
              blob: processedBlob
            }
          } catch (error) {
            console.error(`Failed to process ${file.name}:`, error)
            return {
              ...file,
              processed: false,
              error: error instanceof Error ? error.message : "Processing failed"
            }
          }
        })
      )

      setFiles(processedFiles)
      
      const successCount = processedFiles.filter(f => f.processed).length
      const failCount = processedFiles.filter(f => !f.processed).length
      
      if (successCount > 0) {
        toast({
          title: "Background removal complete",
          description: `${successCount} image${successCount !== 1 ? 's' : ''} processed successfully${failCount > 0 ? `, ${failCount} failed` : ''}`
        })
      } else {
        toast({
          title: "Processing failed",
          description: "All images failed to process. Please try with smaller images or different settings.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to remove backgrounds",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
      setProcessingStage("")
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

  const downloadAll = async () => {
    const processedFiles = files.filter(f => f.processed && f.blob)
    
    if (processedFiles.length === 0) {
      toast({
        title: "No processed files",
        description: "Please process images first",
        variant: "destructive"
      })
      return
    }

    if (processedFiles.length === 1) {
      downloadFile(processedFiles[0])
      return
    }

    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()

      processedFiles.forEach((file) => {
        if (file.blob) {
          zip.file(file.name, file.blob)
        }
      })

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = "background-removed-images.zip"
      link.click()
      URL.revokeObjectURL(url)
      
      toast({
        title: "Download started",
        description: "All processed images downloaded as ZIP"
      })
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to create ZIP file",
        variant: "destructive"
      })
    }
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
            <Scissors className="h-5 w-5 text-purple-600" />
            <span>Background Removal Settings</span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {backgroundRemovalOptions.map((option) => (
              <div key={option.key} className="space-y-2">
                <Label className="text-sm font-medium">{option.label}</Label>
                
                {option.type === "select" && (
                  <Select
                    value={toolOptions[option.key]?.toString()}
                    onValueChange={(value) => setToolOptions(prev => ({ ...prev, [option.key]: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {option.selectOptions?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

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

            {/* Mobile Ad */}
            <div className="py-4">
              <AdBanner 
                adSlot="mobile-background-sidebar"
                adFormat="auto"
                className="w-full"
                mobileOptimized={true}
              />
            </div>
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
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4 mr-2" />
                Remove Background
              </>
            )}
          </Button>

          {files.some(f => f.processed) && (
            <Button 
              onClick={() => {
                downloadAll()
                setIsMobileSidebarOpen(false)
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
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
              <Scissors className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
              <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Background Remover</h1>
            </div>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Remove image backgrounds automatically with AI-powered edge detection. Perfect for portraits, products, and objects.
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
              <h3 className="text-xl lg:text-2xl font-semibold mb-2 lg:mb-3 text-gray-700 group-hover:text-purple-600 transition-colors">Drop images here</h3>
              <p className="text-gray-500 mb-4 lg:mb-6 text-base lg:text-lg text-center">or tap to browse files</p>
              <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 lg:px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                <Upload className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                Choose Images
              </Button>
              <div className="mt-4 lg:mt-6 space-y-2 text-center">
                <p className="text-sm text-gray-500 font-medium">JPG, PNG, WebP files</p>
                <p className="text-xs text-gray-400">Up to 5 files • Up to 25MB each</p>
              </div>
            </div>
          </div>
        </div>

        <Footer />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>
    )
  }

  // Tool interface after files are uploaded
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Scissors className="h-5 w-5 text-purple-600" />
            <h1 className="text-lg font-semibold text-gray-900">Background Remover</h1>
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

        <div className="p-4 space-y-4 min-h-[60vh]">
          {files.map((file) => (
            <Card key={file.id} className="relative">
              <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before */}
                  <div className="relative">
                    <div className="text-xs font-medium text-gray-600 mb-2">Before</div>
                    <img
                      src={file.preview}
                      alt="Original"
                      className="w-full aspect-square object-cover border rounded"
                    />
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {file.dimensions?.width}×{file.dimensions?.height} • {formatFileSize(file.size)}
                    </div>
                  </div>

                  {/* After */}
                  <div className="relative">
                    <div className="text-xs font-medium text-gray-600 mb-2">After</div>
                    {file.processedPreview ? (
                      <div className="relative">
                        <img
                          src={file.processedPreview}
                          alt="Background Removed"
                          className="w-full aspect-square object-cover border rounded bg-gray-100"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='a' patternUnits='userSpaceOnUse' width='20' height='20' patternTransform='scale(0.5) rotate(0)'%3e%3crect x='0' y='0' width='100%25' height='100%25' fill='%23f8f9fa'/%3e%3cpath d='m10 0v20M0 10h20' stroke-width='1' stroke='%23e9ecef' fill='none'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23a)'/%3e%3c/svg%3e")`,
                            backgroundSize: "20px 20px"
                          }}
                        />
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                        </div>
                        <div className="mt-2 text-xs text-gray-500 text-center">
                          {file.dimensions?.width}×{file.dimensions?.height} • {file.processedSize && formatFileSize(file.processedSize)}
                        </div>
                      </div>
                    ) : file.error ? (
                      <div className="aspect-square bg-red-50 border border-red-200 rounded flex items-center justify-center">
                        <div className="text-center text-red-600">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-xs">{file.error}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 rounded border flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">Processed image will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="absolute top-2 right-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Mobile Canvas Ad */}
          <div className="mt-6">
            <AdBanner 
              adSlot="mobile-background-canvas"
              adFormat="auto"
              className="w-full"
              mobileOptimized={true}
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 z-30">
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-blue-800">{processingStage || "Processing..."}</span>
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
              className="bg-purple-600 hover:bg-purple-700 text-white py-3"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Scissors className="h-4 w-4 mr-2" />
                  Process
                </>
              )}
            </Button>
          </div>

          {files.some(f => f.processed) && (
            <Button 
              onClick={downloadAll}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
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
                <h1 className="text-xl font-semibold text-gray-900">Background Remover</h1>
              </div>
              <Badge variant="secondary">AI Mode</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={resetTool}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {files.length > 0 && (
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBefore(!showBefore)}
              >
                {showBefore ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showBefore ? "Hide Before" : "Show Before"}
              </Button>
            </div>
          </div>

          {/* Canvas Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4 min-h-[calc(100vh-12rem)]">
                {files.map((file) => (
                  <Card key={file.id} className="relative">
                    <CardContent className="p-6">
                      <div className={`grid gap-6 ${showBefore ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {/* Before */}
                        {showBefore && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Before</h3>
                            <div className="relative">
                              <img
                                src={file.preview}
                                alt="Original"
                                className="w-full h-auto object-contain border border-gray-300 rounded-lg shadow-sm bg-white"
                                style={{ 
                                  transform: `scale(${Math.min(zoomLevel / 100, 1)})`,
                                  transition: "transform 0.2s ease"
                                }}
                              />
                              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                {file.dimensions?.width}×{file.dimensions?.height}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* After */}
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-3">After</h3>
                          {file.processedPreview ? (
                            <div className="relative">
                              <img
                                src={file.processedPreview}
                                alt="Background Removed"
                                className="w-full h-auto object-contain border border-gray-300 rounded-lg shadow-sm"
                                style={{ 
                                  transform: `scale(${Math.min(zoomLevel / 100, 1)})`,
                                  transition: "transform 0.2s ease",
                                  backgroundImage: `url("data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='a' patternUnits='userSpaceOnUse' width='20' height='20' patternTransform='scale(0.5) rotate(0)'%3e%3crect x='0' y='0' width='100%25' height='100%25' fill='%23f8f9fa'/%3e%3cpath d='m10 0v20M0 10h20' stroke-width='1' stroke='%23e9ecef' fill='none'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23a)'/%3e%3c/svg%3e")`,
                                  backgroundSize: "20px 20px"
                                }}
                              />
                              <div className="absolute top-2 right-2">
                                <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                              </div>
                              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                {file.dimensions?.width}×{file.dimensions?.height}
                              </div>
                            </div>
                          ) : file.error ? (
                            <div className="aspect-video bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
                              <div className="text-center text-red-600">
                                <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                                <p className="text-sm font-medium">Processing Failed</p>
                                <p className="text-xs mt-1">{file.error}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-video bg-gray-100 rounded-lg border flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <Scissors className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Background removed image will appear here</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Original: {formatFileSize(file.size)}</span>
                            {file.processedSize && (
                              <span className="text-green-600">Processed: {formatFileSize(file.processedSize)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {file.processed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(file)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Canvas Ad */}
                <div className="my-8">
                  <AdBanner 
                    adSlot="background-canvas-content"
                    adFormat="horizontal"
                    className="max-w-2xl mx-auto"
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Desktop Right Sidebar */}
        <div className="w-80 xl:w-96 bg-white border-l shadow-lg flex flex-col h-full">
          <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Scissors className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Background Removal</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Configure AI processing options</p>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {backgroundRemovalOptions.map((option) => (
                  <div key={option.key} className="space-y-2">
                    <Label className="text-sm font-medium">{option.label}</Label>
                    
                    {option.type === "select" && (
                      <Select
                        value={toolOptions[option.key]?.toString()}
                        onValueChange={(value) => setToolOptions(prev => ({ ...prev, [option.key]: value }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {option.selectOptions?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

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

                {/* Processing Info */}
                {files.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Processing Info</h4>
                    <div className="text-xs text-purple-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Algorithm:</span>
                        <span className="font-medium">{toolOptions.algorithm}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sensitivity:</span>
                        <span className="font-medium">{toolOptions.sensitivity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Files:</span>
                        <span className="font-medium">{files.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processed:</span>
                        <span className="font-medium">{files.filter(f => f.processed).length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sidebar Ad */}
                <AdBanner 
                  adSlot="background-sidebar"
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
                  <span className="text-sm font-medium text-blue-800">{processingStage || "Processing..."}</span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </div>
            )}

            <Button 
              onClick={handleProcess}
              disabled={isProcessing || files.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4 mr-2" />
                  Remove Background ({files.length})
                </>
              )}
            </Button>

            {files.some(f => f.processed) && (
              <Button 
                onClick={downloadAll}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download All ({files.filter(f => f.processed).length})
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />
    </div>
  )
}