"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  Upload, 
  Download, 
  CheckCircle,
  X,
  RefreshCw,
  FlipHorizontal,
  FlipVertical,
  RotateCw
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ImageProcessor } from "@/lib/processors/image-processor"

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

export default function ImageFlipperPage() {
  const [file, setFile] = useState<ImageFile | null>(null)
  const [flipDirection, setFlipDirection] = useState("horizontal")
  const [showUploadArea, setShowUploadArea] = useState(true)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live preview effect
  useEffect(() => {
    if (file) {
      applyFlipLive()
    }
  }, [flipDirection, file])

  const applyFlipLive = async () => {
    if (!file) return

    try {
      const processedBlob = await ImageProcessor.flipImage(
        file.originalFile || file.file,
        { flipDirection }
      )

      const processedUrl = URL.createObjectURL(processedBlob)
      
      setFile(prev => prev ? {
        ...prev,
        processedPreview: processedUrl,
        processedSize: processedBlob.size,
        blob: processedBlob,
        processed: true
      } : null)
    } catch (error) {
      console.error("Live flip preview failed:", error)
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
        description: "Image loaded successfully for flipping"
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
    setFlipDirection("horizontal")
    setShowUploadArea(true)
  }

  const downloadFile = () => {
    if (!file?.blob) return

    const link = document.createElement("a")
    link.href = file.processedPreview || file.preview
    link.download = `${file.name.split('.')[0]}_flipped.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download started",
      description: "Flipped image downloaded successfully"
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  // Show upload area if no file
  if (showUploadArea && !file) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center space-x-2 mb-4">
              <FlipHorizontal className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
              <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Flip Image</h1>
            </div>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Flip images horizontally, vertically, or both directions with live preview.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 p-8 lg:p-16 group"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="relative mb-4 lg:mb-6">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
                <Upload className="relative h-16 w-16 lg:h-20 lg:w-20 text-blue-500 group-hover:text-blue-600 transition-colors group-hover:scale-110 transform duration-300" />
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold mb-2 lg:mb-3 text-gray-700 group-hover:text-blue-600 transition-colors">Drop image here</h3>
              <p className="text-gray-500 mb-4 lg:mb-6 text-base lg:text-lg text-center">or tap to browse files</p>
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 lg:px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
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

  // Flip interface with live preview
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <FlipHorizontal className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">Flip Image</h1>
          </div>
          <Button variant="outline" size="sm" onClick={resetTool}>
            <RefreshCw className="h-4 w-4" />
          </Button>
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
                  <img
                    src={file.preview}
                    alt="Original"
                    className="w-full h-auto object-contain border rounded"
                  />
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {file.dimensions?.width}×{file.dimensions?.height} • {formatFileSize(file.size)}
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
                        alt="Flipped"
                        className="w-full h-auto object-contain border rounded"
                      />
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded border flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <FlipHorizontal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Flipped image will appear here</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Flip Controls */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Flip Direction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={flipDirection === "horizontal" ? "default" : "outline"}
                  onClick={() => setFlipDirection("horizontal")}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <FlipHorizontal className="h-6 w-6 mb-2" />
                  <span className="text-xs">Horizontal</span>
                </Button>
                <Button
                  variant={flipDirection === "vertical" ? "default" : "outline"}
                  onClick={() => setFlipDirection("vertical")}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <FlipVertical className="h-6 w-6 mb-2" />
                  <span className="text-xs">Vertical</span>
                </Button>
                <Button
                  variant={flipDirection === "both" ? "default" : "outline"}
                  onClick={() => setFlipDirection("both")}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <RotateCw className="h-6 w-6 mb-2" />
                  <span className="text-xs">Both</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-30">
          {file?.processedPreview && (
            <Button 
              onClick={downloadFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Flipped Image
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-[calc(100vh-8rem)] w-full overflow-hidden">
        {/* Left Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FlipHorizontal className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Flip Image</h1>
              </div>
              <Badge variant="secondary">Live Preview</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={resetTool}>
              <RefreshCw className="h-4 w-4" />
            </Button>
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
                    <CardDescription>Flipped image</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center">
                    {file.processedPreview ? (
                      <div className="relative max-w-full max-h-full">
                        <img
                          src={file.processedPreview}
                          alt="Flipped"
                          className="max-w-full max-h-[50vh] object-contain border border-gray-300 rounded-lg shadow-lg bg-white"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {file.dimensions?.width}×{file.dimensions?.height}
                        </div>
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <FlipHorizontal className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>Flipped image will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center max-w-md mx-auto">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
                  <FlipHorizontal className="relative h-24 w-24 text-blue-500 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-gray-700">Flip Your Image</h3>
                <p className="text-gray-500 mb-6 text-lg">
                  Upload an image to start flipping
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Sidebar */}
        <div className="w-80 bg-white border-l shadow-lg flex flex-col h-full">
          <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <FlipHorizontal className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Flip Settings</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Choose flip direction</p>
          </div>

          <div className="flex-1 p-6">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Flip Direction</Label>
              
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant={flipDirection === "horizontal" ? "default" : "outline"}
                  onClick={() => setFlipDirection("horizontal")}
                  className="flex items-center justify-start p-4 h-auto"
                >
                  <FlipHorizontal className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Horizontal</div>
                    <div className="text-xs text-gray-500">Left ↔ Right</div>
                  </div>
                </Button>
                
                <Button
                  variant={flipDirection === "vertical" ? "default" : "outline"}
                  onClick={() => setFlipDirection("vertical")}
                  className="flex items-center justify-start p-4 h-auto"
                >
                  <FlipVertical className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Vertical</div>
                    <div className="text-xs text-gray-500">Top ↔ Bottom</div>
                  </div>
                </Button>
                
                <Button
                  variant={flipDirection === "both" ? "default" : "outline"}
                  onClick={() => setFlipDirection("both")}
                  className="flex items-center justify-start p-4 h-auto"
                >
                  <RotateCw className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Both Directions</div>
                    <div className="text-xs text-gray-500">Horizontal + Vertical</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50 flex-shrink-0">
            {file?.processedPreview && (
              <Button 
                onClick={downloadFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Flipped Image
              </Button>
            )}

            {/* File Info */}
            {file && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Image Info</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Original Size:</span>
                    <span className="font-medium">{formatFileSize(file.size)}</span>
                  </div>
                  {file.processedSize && (
                    <div className="flex justify-between">
                      <span>Flipped Size:</span>
                      <span className="font-medium">{formatFileSize(file.processedSize)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Dimensions:</span>
                    <span className="font-medium">{file.dimensions?.width}×{file.dimensions?.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Direction:</span>
                    <span className="font-medium capitalize">{flipDirection}</span>
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