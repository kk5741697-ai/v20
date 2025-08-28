"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Upload, 
  Download, 
  Trash2, 
  X,
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize2,
  AlertCircle,
  Info
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface ImageFile {
  id: string
  file: File
  originalFile?: File
  name: string
  size: number
  preview: string
  dimensions: { width: number; height: number }
  processed?: boolean
  processedPreview?: string
  processedSize?: number
  blob?: Blob
  cropArea?: { x: number; y: number; width: number; height: number }
}

interface ToolOption {
  key: string
  label: string
  type: "select" | "slider" | "input" | "checkbox" | "color" | "text"
  defaultValue: any
  min?: number
  max?: number
  step?: number
  selectOptions?: Array<{ value: string; label: string }>
  section?: string
  condition?: (options: any) => boolean
}

interface ImageToolsLayoutProps {
  title: string
  description: string
  icon: any
  toolType: "resize" | "compress" | "convert" | "crop" | "rotate" | "watermark" | "background" | "filters"
  processFunction: (files: ImageFile[], options: any) => Promise<{ success: boolean; processedFiles?: ImageFile[]; error?: string }>
  options: ToolOption[]
  maxFiles?: number
  singleFileOnly?: boolean
  allowBatchProcessing?: boolean
  supportedFormats?: string[]
  outputFormats?: string[]
  presets?: Array<{ name: string; values: any }>
}

export function ImageToolsLayout({
  title,
  description,
  icon: Icon,
  toolType,
  processFunction,
  options,
  maxFiles = 20,
  singleFileOnly = false,
  allowBatchProcessing = true,
  supportedFormats = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  outputFormats = ["jpeg", "png", "webp"],
  presets = []
}: ImageToolsLayoutProps) {
  const [files, setFiles] = useState<ImageFile[]>([])
  const [toolOptions, setToolOptions] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFiles, setProcessedFiles] = useState<ImageFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [cropSelection, setCropSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Initialize options with defaults
  useEffect(() => {
    const defaultOptions: Record<string, any> = {}
    options.forEach(option => {
      defaultOptions[option.key] = option.defaultValue
    })
    setToolOptions(defaultOptions)
  }, [options])

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return

    // Validate file types first
    const invalidFiles = Array.from(uploadedFiles).filter(file => 
      !supportedFormats.includes(file.type)
    )
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file types",
        description: `${invalidFiles.length} files are not supported. Please upload ${supportedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} files only.`,
        variant: "destructive"
      })
      return
    }

    if (singleFileOnly && files.length > 0) {
      setFiles([])
      setProcessedFiles([])
    }

    const newFiles: ImageFile[] = []
    const maxFilesToProcess = singleFileOnly ? 1 : Math.min(uploadedFiles.length, maxFiles)
    
    for (let i = 0; i < maxFilesToProcess; i++) {
      const file = uploadedFiles[i]
      if (!supportedFormats.includes(file.type)) continue

      try {
        const preview = await createImagePreview(file)
        const dimensions = await getImageDimensions(file)
        
        const imageFile: ImageFile = {
          id: `${file.name}-${Date.now()}-${i}`,
          file,
          originalFile: file,
          name: file.name,
          size: file.size,
          preview,
          dimensions
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

    if (newFiles.length === 0) {
      toast({
        title: "No valid images",
        description: "No valid image files were found to upload.",
        variant: "destructive"
      })
      return
    }

    setFiles(prev => singleFileOnly ? newFiles : [...prev, ...newFiles])
    
    if (newFiles.length > 0) {
      setSelectedFile(newFiles[0].id)
      
      toast({
        title: "Images uploaded",
        description: `${newFiles.length} image${newFiles.length > 1 ? 's' : ''} uploaded successfully`
      })
    }
  }

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = reject
      img.src = URL.createObjectURL(file)
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
    setProcessedFiles(prev => prev.filter(f => f.id !== fileId))
    if (selectedFile === fileId) {
      const remainingFiles = files.filter(f => f.id !== fileId)
      setSelectedFile(remainingFiles.length > 0 ? remainingFiles[0].id : null)
    }
  }

  const resetTool = () => {
    setFiles([])
    setProcessedFiles([])
    setSelectedFile(null)
    setCropSelection(null)
    setZoomLevel(100)
    setPanOffset({ x: 0, y: 0 })
    
    const defaultOptions: Record<string, any> = {}
    options.forEach(option => {
      defaultOptions[option.key] = option.defaultValue
    })
    setToolOptions(defaultOptions)
    
    toast({
      title: "Tool reset",
      description: "All files and settings have been reset"
    })
  }

  // Fixed crop functionality with proper coordinates
  const handleCropStart = (e: React.MouseEvent<HTMLImageElement>) => {
    if (toolType !== "crop") return
    
    e.preventDefault()
    e.stopPropagation()
    
    const img = e.currentTarget
    const rect = img.getBoundingClientRect()
    
    // Calculate relative position within the image
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    // Ensure coordinates are within bounds
    const boundedX = Math.max(0, Math.min(95, x))
    const boundedY = Math.max(0, Math.min(95, y))
    
    setDragStart({ x: boundedX, y: boundedY })
    setIsDragging(true)
    setCropSelection({ x: boundedX, y: boundedY, width: 0, height: 0 })
  }

  const handleCropMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (toolType !== "crop" || !isDragging || !dragStart) return
    
    e.preventDefault()
    
    const img = e.currentTarget
    const rect = img.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    // Ensure coordinates are within bounds
    const boundedX = Math.max(0, Math.min(100, x))
    const boundedY = Math.max(0, Math.min(100, y))
    
    let newSelection = {
      x: Math.min(dragStart.x, boundedX),
      y: Math.min(dragStart.y, boundedY),
      width: Math.abs(boundedX - dragStart.x),
      height: Math.abs(boundedY - dragStart.y)
    }
    
    // Apply aspect ratio constraint if set
    if (toolOptions.aspectRatio && toolOptions.aspectRatio !== "free") {
      const [ratioW, ratioH] = toolOptions.aspectRatio.split(':').map(Number)
      if (ratioW && ratioH) {
        const targetRatio = ratioW / ratioH
        
        if (newSelection.width / newSelection.height > targetRatio) {
          newSelection.width = newSelection.height * targetRatio
        } else {
          newSelection.height = newSelection.width / targetRatio
        }
        
        // Ensure selection stays within bounds
        if (newSelection.x + newSelection.width > 100) {
          newSelection.width = 100 - newSelection.x
          newSelection.height = newSelection.width / targetRatio
        }
        if (newSelection.y + newSelection.height > 100) {
          newSelection.height = 100 - newSelection.y
          newSelection.width = newSelection.height * targetRatio
        }
      }
    }
    
    setCropSelection(newSelection)
  }

  const handleCropEnd = (e: React.MouseEvent) => {
    if (toolType !== "crop") return
    
    e.preventDefault()
    setIsDragging(false)
    setDragStart(null)
    
    if (cropSelection && selectedFile) {
      setFiles(prev => prev.map(file => 
        file.id === selectedFile 
          ? { ...file, cropArea: cropSelection }
          : file
      ))
    }
  }

  const handleProcess = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one image file",
        variant: "destructive"
      })
      return
    }

    // Validate file formats before processing
    const invalidFiles = files.filter(file => 
      !supportedFormats.includes(file.file.type)
    )
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Unsupported file formats",
        description: `${invalidFiles.length} files are not supported. Please use ${supportedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} formats only.`,
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setProcessedFiles([])

    try {
      const result = await processFunction(files, toolOptions)
      
      if (result.success && result.processedFiles) {
        setProcessedFiles(result.processedFiles)
        toast({
          title: "Processing complete",
          description: `${result.processedFiles.length} images processed successfully`
        })
      } else {
        toast({
          title: "Processing failed",
          description: result.error || "An error occurred",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = async () => {
    if (processedFiles.length === 1) {
      const file = processedFiles[0]
      if (file.blob) {
        const url = URL.createObjectURL(file.blob)
        const link = document.createElement("a")
        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast({
          title: "Download started",
          description: `${file.name} downloaded successfully`
        })
      }
    } else if (processedFiles.length > 1) {
      try {
        const JSZip = (await import("jszip")).default
        const zip = new JSZip()
        
        processedFiles.forEach(file => {
          if (file.blob) {
            zip.file(file.name, file.blob)
          }
        })

        const zipBlob = await zip.generateAsync({ type: "blob" })
        const url = URL.createObjectURL(zipBlob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${toolType}_images.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast({
          title: "Download started",
          description: `ZIP file with ${processedFiles.length} images downloaded`
        })
      } catch (error) {
        toast({
          title: "Download failed",
          description: "Failed to create ZIP file",
          variant: "destructive"
        })
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const currentFile = selectedFile ? files.find(f => f.id === selectedFile) : files[0]

  // Group options by section
  const groupedOptions = options.reduce((acc, option) => {
    const section = option.section || "General"
    if (!acc[section]) acc[section] = []
    acc[section].push(option)
    return acc
  }, {} as Record<string, ToolOption[]>)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Left Canvas - Fixed Image Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Icon className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            <Badge variant="secondary">{files.length} files</Badge>
            {currentFile && (
              <Badge variant="outline">
                {currentFile.dimensions.width} × {currentFile.dimensions.height}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetTool}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {currentFile && (
              <div className="flex items-center space-x-1 border rounded-md">
                <Button variant="ghost" size="sm" onClick={() => setZoomLevel(prev => Math.max(25, prev - 25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">{zoomLevel}%</span>
                <Button variant="ghost" size="sm" onClick={() => setZoomLevel(prev => Math.min(400, prev + 25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setZoomLevel(100); setPanOffset({ x: 0, y: 0 }) }}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Content - Fixed viewport and crop functionality */}
        <div className="flex-1 overflow-hidden">
          {files.length === 0 ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 flex items-center justify-center p-6">
                <div 
                  className="max-w-lg w-full border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 p-16 group"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
                    <Upload className="relative h-20 w-20 text-blue-500 group-hover:text-blue-600 transition-colors group-hover:scale-110 transform duration-300" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-gray-700 group-hover:text-blue-600 transition-colors">Drop images here</h3>
                  <p className="text-gray-500 mb-6 text-lg">or click to browse files</p>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Images
                  </Button>
                  <div className="mt-6 space-y-2">
                    <p className="text-sm text-gray-500 font-medium">
                      Supported formats: {supportedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}
                    </p>
                    <p className="text-xs text-gray-400">
                      Maximum {maxFiles} files • Up to 100MB each
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Fixed Image Canvas with proper viewport */}
              <div className="flex-1 overflow-hidden relative bg-gray-100" ref={canvasRef}>
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  {currentFile && (
                    <div className="relative group max-w-full max-h-full">
                      <div 
                        className="relative inline-block transition-transform duration-200 select-none"
                        style={{ 
                          transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                          maxWidth: "calc(100vw - 400px)",
                          maxHeight: "calc(100vh - 200px)"
                        }}
                        onMouseDown={toolType === "crop" ? undefined : (e) => {
                          setIsPanning(true)
                          setLastPanPoint({ x: e.clientX, y: e.clientY })
                        }}
                        onMouseMove={toolType === "crop" ? undefined : (e) => {
                          if (!isPanning) return
                          const deltaX = e.clientX - lastPanPoint.x
                          const deltaY = e.clientY - lastPanPoint.y
                          setPanOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
                          setLastPanPoint({ x: e.clientX, y: e.clientY })
                        }}
                        onMouseUp={toolType === "crop" ? undefined : () => setIsPanning(false)}
                        onMouseLeave={toolType === "crop" ? undefined : () => setIsPanning(false)}
                      >
                        <img
                          ref={imageRef}
                          src={currentFile.processedPreview || currentFile.preview}
                          alt={currentFile.name}
                          className="max-w-full max-h-[70vh] object-contain border border-gray-300 rounded-lg shadow-lg bg-white"
                          style={{ 
                            userSelect: "none",
                            cursor: toolType === "crop" ? "crosshair" : isPanning ? "grabbing" : "grab"
                          }}
                          onMouseDown={toolType === "crop" ? handleCropStart : undefined}
                          onMouseMove={toolType === "crop" ? handleCropMove : undefined}
                          onMouseUp={toolType === "crop" ? handleCropEnd : undefined}
                          onMouseLeave={toolType === "crop" ? handleCropEnd : undefined}
                          draggable={false}
                        />
                        
                        {/* Fixed Crop Overlay */}
                        {toolType === "crop" && cropSelection && (
                          <div
                            className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                            style={{
                              left: `${cropSelection.x}%`,
                              top: `${cropSelection.y}%`,
                              width: `${cropSelection.width}%`,
                              height: `${cropSelection.height}%`
                            }}
                          >
                            {/* Crop Info */}
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded shadow-md whitespace-nowrap">
                              {Math.round(cropSelection.width)}% × {Math.round(cropSelection.height)}%
                              {currentFile && (
                                <div className="text-center mt-1">
                                  {Math.round((cropSelection.width / 100) * currentFile.dimensions.width)} × {Math.round((cropSelection.height / 100) * currentFile.dimensions.height)} px
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Image Info Overlay */}
                        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center space-x-4">
                            <span>{currentFile.dimensions.width} × {currentFile.dimensions.height}</span>
                            <span>{formatFileSize(currentFile.size)}</span>
                            <span>{currentFile.name.split('.').pop()?.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* File Thumbnails Bar */}
              {files.length > 1 && (
                <div className="border-t bg-white p-4">
                  <ScrollArea orientation="horizontal">
                    <div className="flex space-x-3">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className={`relative flex-shrink-0 cursor-pointer transition-all duration-200 ${
                            selectedFile === file.id 
                              ? "ring-2 ring-blue-500 scale-105" 
                              : "hover:scale-105 hover:shadow-md"
                          }`}
                          onClick={() => setSelectedFile(file.id)}
                        >
                          <img
                            src={file.processedPreview || file.preview}
                            alt={file.name}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-5 h-5 p-0 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(file.id)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          {file.processed && (
                            <CheckCircle className="absolute -bottom-1 -right-1 w-4 h-4 text-green-600 bg-white rounded-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Fixed overflow and scrolling */}
      <div className="w-80 bg-white border-l shadow-lg flex flex-col max-h-screen">
        {/* Sidebar Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>

        {/* Sidebar Content - Fixed scrolling */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Quick Presets */}
              {presets.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Quick Presets</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setToolOptions(prev => ({ ...prev, ...preset.values }))
                        }}
                        className="text-xs h-8"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Crop Selection Info */}
              {toolType === "crop" && cropSelection && currentFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600">Selection:</span>
                      <div>{Math.round(cropSelection.width)}% × {Math.round(cropSelection.height)}%</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Pixels:</span>
                      <div>
                        {Math.round((cropSelection.width / 100) * currentFile.dimensions.width)} × {Math.round((cropSelection.height / 100) * currentFile.dimensions.height)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grouped Options */}
              {Object.entries(groupedOptions).map(([section, sectionOptions]) => (
                <div key={section} className="space-y-4">
                  {section !== "General" && (
                    <div className="flex items-center space-x-2">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{section}</Label>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                  )}
                  
                  {sectionOptions.map((option) => {
                    // Check condition if exists
                    if (option.condition && !option.condition(toolOptions)) {
                      return null
                    }

                    return (
                      <div key={option.key} className="space-y-2">
                        <Label className="text-sm font-medium">{option.label}</Label>
                        
                        {option.type === "select" && (
                          <Select
                            value={toolOptions[option.key]?.toString()}
                            onValueChange={(value) => {
                              setToolOptions(prev => ({ ...prev, [option.key]: value }))
                            }}
                          >
                            <SelectTrigger>
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

                        {option.type === "input" && (
                          <Input
                            type="number"
                            value={toolOptions[option.key] || option.defaultValue}
                            onChange={(e) => {
                              setToolOptions(prev => ({ ...prev, [option.key]: parseInt(e.target.value) || option.defaultValue }))
                            }}
                            min={option.min}
                            max={option.max}
                          />
                        )}

                        {option.type === "checkbox" && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={toolOptions[option.key] || false}
                              onCheckedChange={(checked) => {
                                setToolOptions(prev => ({ ...prev, [option.key]: checked }))
                              }}
                            />
                            <span className="text-sm">{option.label}</span>
                          </div>
                        )}

                        {option.type === "color" && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={toolOptions[option.key] || option.defaultValue}
                              onChange={(e) => {
                                setToolOptions(prev => ({ ...prev, [option.key]: e.target.value }))
                              }}
                              className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <Input
                              value={toolOptions[option.key] || option.defaultValue}
                              onChange={(e) => {
                                setToolOptions(prev => ({ ...prev, [option.key]: e.target.value }))
                              }}
                              className="flex-1"
                            />
                          </div>
                        )}

                        {option.type === "text" && (
                          <Input
                            value={toolOptions[option.key] || option.defaultValue}
                            onChange={(e) => {
                              setToolOptions(prev => ({ ...prev, [option.key]: e.target.value }))
                            }}
                            placeholder={option.label}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Fixed Sidebar Footer */}
          <div className="p-6 border-t bg-gray-50 space-y-3 flex-shrink-0">
            {/* Processing Status */}
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-800">Processing images...</span>
                </div>
                <Progress value={66} className="h-2" />
                <p className="text-xs text-blue-600 mt-1">This may take a few moments</p>
              </div>
            )}

            {/* Ready Status */}
            {!isProcessing && files.length > 0 && processedFiles.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">Ready to process {files.length} image{files.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleProcess}
              disabled={isProcessing || files.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {title.split(' ')[0]} {files.length > 1 ? `${files.length} Images` : 'Image'} →
                </>
              )}
            </Button>

            {processedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Processing complete!</span>
                  </div>
                  <p className="text-xs text-green-600">
                    {processedFiles.length} image{processedFiles.length > 1 ? 's' : ''} processed successfully
                  </p>
                </div>
                
                <Button 
                  onClick={handleDownload}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download {processedFiles.length > 1 ? "ZIP" : "Image"}
                </Button>
              </div>
            )}

            {files.length > 0 && (
              <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                <div className="flex justify-between">
                  <span>Total files:</span>
                  <span>{files.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total size:</span>
                  <span>{formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}</span>
                </div>
                {processedFiles.length > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Processed size:</span>
                      <span>{formatFileSize(processedFiles.reduce((sum, file) => sum + (file.processedSize || file.size), 0))}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>Size reduction:</span>
                      <span>
                        {(() => {
                          const originalSize = files.reduce((sum, file) => sum + file.size, 0)
                          const processedSize = processedFiles.reduce((sum, file) => sum + (file.processedSize || file.size), 0)
                          const reduction = ((originalSize - processedSize) / originalSize) * 100
                          return reduction > 0 ? `${reduction.toFixed(1)}%` : "0%"
                        })()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={supportedFormats.join(",")}
        multiple={!singleFileOnly && maxFiles > 1}
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />
    </div>
  )
}