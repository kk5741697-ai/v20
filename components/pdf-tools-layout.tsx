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
  FileText,
  AlertCircle,
  ArrowUpDown,
  Eye,
  Settings
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { PDFProcessor } from "@/lib/processors/pdf-processor"
import { AdBanner } from "@/components/ads/ad-banner"

interface ToolOption {
  key: string
  label: string
  type: "text" | "input" | "select" | "checkbox" | "slider" | "color"
  defaultValue: any
  min?: number
  max?: number
  step?: number
  selectOptions?: Array<{ value: string; label: string }>
  section?: string
  condition?: (options: any) => boolean
}

interface PDFFile {
  id: string
  file: File
  originalFile?: File
  name: string
  size: number
  pageCount?: number
  pages?: any[]
  preview?: string
  processed?: boolean
  selectedPages?: string[]
}

interface PDFToolsLayoutProps {
  title: string
  description: string
  icon: any
  toolType: string
  processFunction: (files: any[], options: any) => Promise<{ success: boolean; downloadUrl?: string; error?: string }>
  options?: ToolOption[]
  maxFiles?: number
  allowPageSelection?: boolean
  allowPageReorder?: boolean
}

export function PDFToolsLayout({
  title,
  description,
  icon: Icon,
  toolType,
  processFunction,
  options = [],
  maxFiles = 5,
  allowPageSelection = false,
  allowPageReorder = false
}: PDFToolsLayoutProps) {
  const [files, setFiles] = useState<PDFFile[]>([])
  const [toolOptions, setToolOptions] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [showUploadArea, setShowUploadArea] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const defaultOptions: Record<string, any> = {}
    options.forEach(option => {
      defaultOptions[option.key] = option.defaultValue
    })
    setToolOptions(defaultOptions)
  }, [options])

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return

    const newFiles: PDFFile[] = []
    
    for (const file of Array.from(uploadedFiles)) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a PDF file`,
          variant: "destructive"
        })
        continue
      }

      if (files.length + newFiles.length >= maxFiles) {
        toast({
          title: "Too many files",
          description: `Maximum ${maxFiles} files allowed`,
          variant: "destructive"
        })
        break
      }

      try {
        const pdfInfo = await PDFProcessor.getPDFInfo(file)
        
        const pdfFile: PDFFile = {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          originalFile: file,
          name: file.name,
          size: file.size,
          pageCount: pdfInfo.pageCount,
          pages: pdfInfo.pages,
        }

        newFiles.push(pdfFile)
      } catch (error) {
        toast({
          title: "Error loading PDF",
          description: `Failed to load ${file.name}`,
          variant: "destructive"
        })
      }
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
      setShowUploadArea(false)
      toast({
        title: "PDFs uploaded",
        description: `${newFiles.length} PDF${newFiles.length > 1 ? 's' : ''} loaded successfully`
      })
    }
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
    setSelectedPages([])
    setProcessingProgress(0)
    setShowUploadArea(true)
    setIsMobileSidebarOpen(false)
    
    const defaultOptions: Record<string, any> = {}
    options.forEach(option => {
      defaultOptions[option.key] = option.defaultValue
    })
    setToolOptions(defaultOptions)
  }

  const togglePageSelection = (pageKey: string) => {
    setSelectedPages(prev => 
      prev.includes(pageKey) 
        ? prev.filter(p => p !== pageKey)
        : [...prev, pageKey]
    )
  }

  const handleProcess = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload PDF files to process",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 15, 90))
      }, 300)

      const processOptions = {
        ...toolOptions,
        selectedPages: allowPageSelection ? selectedPages : undefined
      }

      const result = await processFunction(files, processOptions)
      
      clearInterval(progressInterval)
      setProcessingProgress(100)
      
      if (result.success && result.downloadUrl) {
        // Auto-download the result with proper filename
        const link = document.createElement("a")
        link.href = result.downloadUrl
        link.download = result.filename || `processed_${files[0]?.name || 'document'}`
        link.click()
        
        toast({
          title: "Processing complete",
          description: "File downloaded successfully"
        })
      } else {
        throw new Error(result.error || "Processing failed")
      }
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process PDFs",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const optionsBySection = options.reduce((acc, option) => {
    const section = option.section || "General"
    if (!acc[section]) acc[section] = []
    acc[section].push(option)
    return acc
  }, {} as Record<string, ToolOption[]>)

  // Mobile Sidebar Component
  const MobileSidebar = () => (
    <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <SheetHeader className="px-6 py-4 border-b bg-gray-50">
          <SheetTitle className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-red-600" />
            <span>{title} Settings</span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Tool Options */}
            {Object.entries(optionsBySection).map(([section, sectionOptions]) => (
              <div key={section} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="h-px bg-gray-200 flex-1"></div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{section}</Label>
                  <div className="h-px bg-gray-200 flex-1"></div>
                </div>
                
                {sectionOptions.map((option) => {
                  if (option.condition && !option.condition(toolOptions)) {
                    return null
                  }

                  return (
                    <div key={option.key} className="space-y-2">
                      <Label className="text-sm font-medium">{option.label}</Label>
                      
                      {option.type === "text" && (
                        <Input
                          value={toolOptions[option.key] || option.defaultValue}
                          onChange={(e) => setToolOptions(prev => ({ ...prev, [option.key]: e.target.value }))}
                          className="h-10"
                        />
                      )}

                      {option.type === "select" && (
                        <Select
                          value={toolOptions[option.key]?.toString()}
                          onValueChange={(value) => {
                            setToolOptions(prev => ({ ...prev, [option.key]: value }))
                          }}
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

                      {option.type === "input" && (
                        <Input
                          type="number"
                          value={toolOptions[option.key] || option.defaultValue}
                          onChange={(e) => setToolOptions(prev => ({ ...prev, [option.key]: parseInt(e.target.value) || 0 }))}
                          min={option.min}
                          max={option.max}
                          className="h-10"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

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
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-base font-semibold"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Icon className="h-4 w-4 mr-2" />
                Process {files.length} PDF{files.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )

  // Show upload area if no files
  if (showUploadArea && files.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <div className="container mx-auto px-6 py-4 lg:py-8">
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center space-x-2 mb-4">
              <Icon className="h-6 w-6 lg:h-8 lg:w-8 text-red-600" />
              <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">{title}</h1>
            </div>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">{description}</p>
          </div>

        
            {/* Mobile Bottom Ad */}
            <div className="mb-6 lg:mb-8 lg:hidden">
            </div>

            {/* Desktop Bottom Ad */}
            <div className="mb-8 hidden lg:block">
            </div>

          
          <div className="max-w-4xl mx-auto">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-all duration-300 p-8 lg:p-16 group"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="relative mb-4 lg:mb-6">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
                <Upload className="relative h-16 w-16 lg:h-20 lg:w-20 text-red-500 group-hover:text-red-600 transition-colors group-hover:scale-110 transform duration-300" />
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold mb-2 lg:mb-3 text-gray-700 group-hover:text-red-600 transition-colors">Drop PDF files here</h3>
              <p className="text-gray-500 mb-4 lg:mb-6 text-base lg:text-lg text-center">or tap to browse files</p>
              <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 lg:px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                <Upload className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                Choose PDF Files
              </Button>
              <div className="mt-4 lg:mt-6 space-y-2 text-center">
                <p className="text-sm text-gray-500 font-medium">PDF files only</p>
                <p className="text-xs text-gray-400">Up to {maxFiles} files • Up to 100MB each</p>
              </div>
            </div>
            
          </div>
        </div>

        <Footer />

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple={maxFiles > 1}
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>
    )
  }

  // Tool interface after files are uploaded - Responsive Layout
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-red-600" />
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
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

      {/* Top Ad Banner */}
      <div className="bg-white">
        <div className="container mx-auto py-4 lg:py-4">
          <AdBanner 
            adSlot="tool-header-banner"
            adFormat="auto"
            className="max-w-6xl mx-auto"
          />
        </div>
      </div>

        
        {/* Mobile Content */}
        <div className="p-4 space-y-4 min-h-[60vh]">
          {files.map((file) => (
            <Card key={file.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-red-600" />
                    <div>
                      <CardTitle className="text-sm">{file.name}</CardTitle>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        {file.pageCount && <span>{file.pageCount} pages</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              {allowPageSelection && file.pages && (
                <CardContent>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Pages</Label>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {file.pages.map((page) => {
                        const pageKey = `${file.id}-page-${page.pageNumber}`
                        const isSelected = selectedPages.includes(pageKey)
                        
                        return (
                          <div
                            key={pageKey}
                            className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                              isSelected ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 hover:border-red-300'
                            }`}
                            onClick={() => togglePageSelection(pageKey)}
                          >
                            <img
                              src={page.thumbnail}
                              alt={`Page ${page.pageNumber}`}
                              className="w-full aspect-[3/4] object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-1">
                              {page.pageNumber}
                            </div>
                            {isSelected && (
                              <div className="absolute top-1 right-1">
                                <CheckCircle className="h-4 w-4 text-red-600 bg-white rounded-full" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {selectedPages.length > 0 && (
                      <p className="text-sm text-gray-600">
                        {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {/* Mobile Canvas Ad */}
          <div className="mt-6">
            <AdBanner 
              adSlot="mobile-pdf-canvas"
              adFormat="auto"
              className="w-full"
            />
          </div>
        </div>

        {/* Mobile Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 z-30">
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-blue-800">Processing PDFs...</span>
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
              className="bg-red-600 hover:bg-red-700 text-white py-3"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Icon className="h-4 w-4 mr-2" />
                  Process
                </>
              )}
            </Button>
          </div>
        </div>

        <MobileSidebar />
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-[calc(100vh-8rem)] w-full overflow-hidden">
        {/* Left Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tool Header */}
          <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Icon className="h-5 w-5 text-red-600" />
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              </div>
              {files.length > 0 && <Badge variant="secondary">PDF Mode</Badge>}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={resetTool}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Canvas Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">

            {/* Top Ad Banner */}
            <div className="bg-white">
              <div className="container mx-auto px-6 py-4 lg:py-2">
              </div>
            </div>
              
              <div className="p-6 space-y-4 min-h-[calc(100vh-12rem)]">
                {files.map((file) => (
                  <Card key={file.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-8 w-8 text-red-600" />
                          <div>
                            <CardTitle className="text-base">{file.name}</CardTitle>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{formatFileSize(file.size)}</span>
                              {file.pageCount && <span>{file.pageCount} pages</span>}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    {allowPageSelection && file.pages && (
                      <CardContent>
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Select Pages</Label>
                          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-48 overflow-y-auto">
                            {file.pages.map((page) => {
                              const pageKey = `${file.id}-page-${page.pageNumber}`
                              const isSelected = selectedPages.includes(pageKey)
                              
                              return (
                                <div
                                  key={pageKey}
                                  className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                                    isSelected ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 hover:border-red-300'
                                  }`}
                                  onClick={() => togglePageSelection(pageKey)}
                                >
                                  <img
                                    src={page.thumbnail}
                                    alt={`Page ${page.pageNumber}`}
                                    className="w-full aspect-[3/4] object-cover"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-1">
                                    {page.pageNumber}
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-1 right-1">
                                      <CheckCircle className="h-4 w-4 text-red-600 bg-white rounded-full" />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {selectedPages.length > 0 && (
                            <p className="text-sm text-gray-600">
                              {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
                            </p>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}

                {/* Canvas Ad */}
                <div className="my-8">
                  <AdBanner 
                    adSlot="pdf-canvas-content"
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
          {/* Sidebar Header */}
          <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Icon className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Configure processing options</p>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Tool Options */}
                {Object.entries(optionsBySection).map(([section, sectionOptions]) => (
                  <div key={section} className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{section}</Label>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    
                    {sectionOptions.map((option) => {
                      if (option.condition && !option.condition(toolOptions)) {
                        return null
                      }

                      return (
                        <div key={option.key} className="space-y-2">
                          <Label className="text-sm font-medium">{option.label}</Label>
                          
                          {option.type === "text" && (
                            <Input
                              value={toolOptions[option.key] || option.defaultValue}
                              onChange={(e) => setToolOptions(prev => ({ ...prev, [option.key]: e.target.value }))}
                              className="h-9"
                            />
                          )}

                          {option.type === "select" && (
                            <Select
                              value={toolOptions[option.key]?.toString()}
                              onValueChange={(value) => {
                                setToolOptions(prev => ({ ...prev, [option.key]: value }))
                              }}
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

                          {option.type === "input" && (
                            <Input
                              type="number"
                              value={toolOptions[option.key] || option.defaultValue}
                              onChange={(e) => setToolOptions(prev => ({ ...prev, [option.key]: parseInt(e.target.value) || 0 }))}
                              min={option.min}
                              max={option.max}
                              className="h-9"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}

                {/* File Info */}
                {files.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">PDF Info</h4>
                    <div className="text-xs text-red-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Files:</span>
                        <span className="font-medium">{files.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Size:</span>
                        <span className="font-medium">{formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Pages:</span>
                        <span className="font-medium">{files.reduce((sum, f) => sum + (f.pageCount || 0), 0)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </ScrollArea>
          </div>

          {/* Fixed Sidebar Footer */}
          <div className="p-6 border-t bg-gray-50 space-y-3 flex-shrink-0">
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-800">Processing PDFs...</span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </div>
            )}

            <Button 
              onClick={handleProcess}
              disabled={isProcessing || files.length === 0}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Icon className="h-4 w-4 mr-2" />
                  Process {files.length} PDF{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple={maxFiles > 1}
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />
    </div>
  )
}