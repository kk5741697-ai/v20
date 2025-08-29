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
  ImageIcon,
  CheckCircle,
  X,
  ArrowLeft,
  RefreshCw,
  GripVertical,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { AdBanner } from "@/components/ads/ad-banner"

interface ImageFile {
  id: string
  file: File
  originalFile?: File
  name: string
  size: number
  dimensions: { width: number; height: number }
  preview: string
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
  toolType: "resize" | "compress" | "convert" | "crop" | "rotate" | "filters" | "watermark" | "background"
  processFunction: (files: ImageFile[], options: any) => Promise<{ success: boolean; processedFiles?: ImageFile[]; error?: string }>
  options: ToolOption[]
  maxFiles?: number
  singleFileOnly?: boolean
  presets?: Array<{ name: string; values: any }>
  allowBatchProcessing?: boolean
  supportedFormats?: string[]
  outputFormats?: string[]
}

export function ImageToolsLayout({
  title,
  description,
  icon: Icon,
  toolType,
  processFunction,
  options,
  maxFiles = 10,
  singleFileOnly = false,
  presets = [],
  allowBatchProcessing = true,
  supportedFormats = ["image/jpeg", "image/png", "image/webp"],
  outputFormats = ["jpeg", "png", "webp"]
}: ImageToolsLayoutProps) {
  const [files, setFiles] = useState<ImageFile[]>([])
  const [toolOptions, setToolOptions] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFiles, setProcessedFiles] = useState<ImageFile[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [zoomLevel, setZoomLevel] = useState(100)
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const defaultOptions: Record<string, any> = {}
    options.forEach(option => {
      defaultOptions[option.key] = option.defaultValue
    })
    setToolOptions(defaultOptions)
  }, [options])

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return

    const validFiles: ImageFile[] = []
    
    for (let i = 0; i < uploadedFiles.length && i < maxFiles; i++) {
      const file = uploadedFiles[i]
      
      if (!supportedFormats.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image format`,
          variant: "destructive"
        })
        continue
      }

      try {
        const dimensions = await getImageDimensions(file)
        const preview = await createImagePreview(file)
        
        const imageFile: ImageFile = {
          id: `${file.name}-${Date.now()}-${i}`,
          file,
          originalFile: file,
          name: file.name,
          size: file.size,
          dimensions,
          preview
        }

        validFiles.push(imageFile)
      } catch (error) {
        toast({
          title: "Error loading image",
          description: `Failed to load ${file.name}`,
          variant: "destructive"
        })
      }
    }

    if (singleFileOnly && validFiles.length > 1) {
      setFiles([validFiles[0]])
      setSelectedFileForPreview(validFiles[0].id)
    } else {
      setFiles(prev => [...prev, ...validFiles])
      if (validFiles.length > 0 && !selectedFileForPreview) {
        setSelectedFileForPreview(validFiles[0].id)
      }
    }
    
    if (validFiles.length > 0) {
      toast({
        title: "Images uploaded",
        description: `${validFiles.length} image${validFiles.length > 1 ? 's' : ''} uploaded successfully`
      })
    }
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
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
    setProcessedFiles(prev => prev.filter(f => f.id !== fileId))
    if (selectedFileForPreview === fileId) {
      const remainingFiles = files.filter(f => f.id !== fileId)
      setSelectedFileForPreview(remainingFiles.length > 0 ? remainingFiles[0].id : null)
    }
  }

  const resetTool = () => {
    setFiles([])
    setProcessedFiles([])
    setSelectedFileForPreview(null)
    setZoomLevel(100)
    
    const defaultOptions: Record<string, any> = {}
    options.forEach(option => {
      defaultOptions[option.key] = option.defaultValue
    })
    setToolOptions(defaultOptions)
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

    setIsProcessing(true)

    try {
      const result = await processFunction(files, toolOptions)
      
      if (result.success && result.processedFiles) {
        setProcessedFiles(result.processedFiles)
        toast({
          title: "Processing complete",
          description: `${result.processedFiles.length} image${result.processedFiles.length > 1 ? 's' : ''} processed successfully`
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

  const downloadFile = (file: ImageFile) => {
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
  }

  const downloadAll = async () => {
    if (processedFiles.length === 0) return

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
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-results.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Download started",
        description: "ZIP file with all processed images downloaded"
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

  const applyPreset = (preset: any) => {
    setToolOptions(prev => ({ ...prev, ...preset.values }))
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-gray-50">
      {/* Left Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-4 lg:px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Icon className="h-5 w-5 text-purple-600" />
              <h1 className="text-lg lg:text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            <Badge variant="secondary">{files.length} files</Badge>
          </div>
          <div className="flex items-center space-x-2">
            {files.length > 0 && (
              <div className="hidden lg:flex items-center border rounded-md">
                <Button 
                  variant={viewMode === "grid" ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === "list" ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setViewMode("list")}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetTool}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {selectedFileForPreview && (
              <div className="hidden lg:flex items-center space-x-1 border rounded-md">
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
        <div className="flex-1 overflow-hidden">
          {files.length === 0 ? (
            <div className="h-full flex items-center justify-center p-6">
              <div 
                className="max-w-lg w-full border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all duration-300 p-8 lg:p-16 group"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
                  <Upload className="relative h-16 lg:h-20 w-16 lg:w-20 text-purple-500 group-hover:text-purple-600 transition-colors group-hover:scale-110 transform duration-300" />
                </div>
                <h3 className="text-xl lg:text-2xl font-semibold mb-3 text-gray-700 group-hover:text-purple-600 transition-colors">Drop images here</h3>
                <p className="text-gray-500 mb-6 text-base lg:text-lg">or click to browse files</p>
                <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 lg:px-8 py-2 lg:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Images
                </Button>
                <div className="mt-6 space-y-2">
                  <p className="text-sm text-gray-500 font-medium">
                    {supportedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} files
                  </p>
                  <p className="text-xs text-gray-400">
                    Maximum {maxFiles} files • Up to 100MB each
                  </p>
                </div>
                
                {/* Mobile Ad Banner */}
                <div className="lg:hidden mt-8">
                  <AdBanner 
                    adSlot="mobile-upload-area"
                    adFormat="auto"
                    className="max-w-sm mx-auto"
                  />
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {files.map((file) => {
                    const processedFile = processedFiles.find(pf => pf.id === file.id)
                    const displayFile = processedFile || file
                    
                    return (
                      <div
                        key={file.id}
                        className={`bg-white rounded-lg border transition-all duration-200 cursor-pointer ${
                          selectedFileForPreview === file.id 
                            ? "ring-2 ring-purple-500 shadow-lg" 
                            : "hover:shadow-md hover:scale-105"
                        }`}
                        onClick={() => setSelectedFileForPreview(file.id)}
                      >
                        <div className="p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <ImageIcon className="h-5 w-5 text-purple-600" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">{displayFile.name}</h3>
                              <p className="text-sm text-gray-500">
                                {displayFile.dimensions.width}×{displayFile.dimensions.height} • {formatFileSize(displayFile.size)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFile(file.id)
                              }}
                              className="w-8 h-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
                            <img
                              src={displayFile.processedPreview || displayFile.preview}
                              alt={displayFile.name}
                              className="w-full h-full object-cover"
                              style={{ transform: `scale(${zoomLevel / 100})` }}
                            />
                          </div>

                          {processedFile && (
                            <div className="flex items-center justify-between">
                              <Badge className="bg-green-100 text-green-800">Processed</Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  downloadFile(processedFile)
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l shadow-lg flex flex-col max-h-screen lg:max-h-none">
        {/* Sidebar Header */}
        <div className="px-4 lg:px-6 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 lg:p-6 space-y-6">
              {/* Presets */}
              {presets.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Presets</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="text-xs h-auto p-2"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

            
            {/* Desktop Ad Banner */}
            <div className="hidden lg:block mt-4">
              <AdBanner 
                adSlot="tool-sidebar-bottom"
                adFormat="auto"
                className="w-full"
              />
            </div>
              {/* Tool Options */}
              {options.map((option) => {
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
                          const value = parseInt(e.target.value) || option.defaultValue
                          setToolOptions(prev => ({ ...prev, [option.key]: value }))
                        }}
                        min={option.min}
                        max={option.max}
                      />
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

                    {option.type === "color" && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={toolOptions[option.key] || option.defaultValue}
                          onChange={(e) => {
                            setToolOptions(prev => ({ ...prev, [option.key]: e.target.value }))
                          }}
                          className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                        />
                        <Input
                          value={toolOptions[option.key] || option.defaultValue}
                          onChange={(e) => {
                            setToolOptions(prev => ({ ...prev, [option.key]: e.target.value }))
                          }}
                          className="flex-1 font-mono"
                        />
                      </div>
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
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* Fixed Sidebar Footer */}
          <div className="p-4 lg:p-6 border-t bg-gray-50 space-y-3 flex-shrink-0">
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-800">Processing images...</span>
                </div>
                <Progress value={66} className="h-2" />
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
                  {title} →
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
                  <p className="text-xs text-green-600">{processedFiles.length} image{processedFiles.length > 1 ? 's' : ''} ready</p>
                </div>
                
                <Button 
                  onClick={downloadAll}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download {processedFiles.length > 1 ? "All (ZIP)" : "Image"}
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
                  <div className="flex justify-between">
                    <span>Processed:</span>
                    <span className="text-green-600 font-medium">{processedFiles.length}</span>
                  </div>
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
      
      {/* Mobile Bottom Ad */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-2 z-10">
        <AdBanner 
          adSlot="mobile-bottom-banner"
          adFormat="horizontal"
          className="w-full"
        />
      </div>
    </div>
  )
}