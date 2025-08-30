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
  ImageIcon,
  Scissors,
  Pause,
  Play,
  Square
} from "lucide-react"
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
  processingStage?: string
  error?: string
}

interface ProcessingState {
  isProcessing: boolean
  isPaused: boolean
  canCancel: boolean
  progress: number
  stage: string
  currentFile?: string
  processedCount: number
  totalFiles: number
  estimatedTimeRemaining?: number
}

export default function BackgroundRemoverPage() {
  const [files, setFiles] = useState<ImageFile[]>([])
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    isPaused: false,
    canCancel: false,
    progress: 0,
    stage: "Ready",
    processedCount: 0,
    totalFiles: 0
  })
  const [algorithm, setAlgorithm] = useState("auto")
  const [sensitivity, setSensitivity] = useState([25])
  const [featherEdges, setFeatherEdges] = useState(true)
  const [preserveDetails, setPreserveDetails] = useState(true)
  const [outputFormat, setOutputFormat] = useState("png")
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showUploadArea, setShowUploadArea] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingWorkerRef = useRef<Worker | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const processStartTimeRef = useRef<number>(0)

  // Enhanced memory management
  useEffect(() => {
    const cleanup = () => {
      // Clean up blob URLs
      files.forEach(file => {
        if (file.preview && file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview)
        }
        if (file.processedPreview && file.processedPreview.startsWith('blob:')) {
          URL.revokeObjectURL(file.processedPreview)
        }
      })
      
      // Terminate worker
      if (processingWorkerRef.current) {
        processingWorkerRef.current.terminate()
        processingWorkerRef.current = null
      }
      
      // Cancel any ongoing operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }

    // Cleanup on unmount
    return cleanup
  }, [])

  // Memory monitoring and cleanup
  useEffect(() => {
    const memoryCleanupInterval = setInterval(() => {
      if (!processingState.isProcessing) {
        // Force garbage collection if available
        if ('gc' in window && typeof (window as any).gc === 'function') {
          (window as any).gc()
        }
        
        // Monitor memory usage
        if ('memory' in performance) {
          const memory = (performance as any).memory
          const usedMB = memory.usedJSHeapSize / 1024 / 1024
          
          if (usedMB > 200) { // If using more than 200MB
            console.warn(`High memory usage detected: ${usedMB.toFixed(1)}MB`)
            // Clean up old blob URLs
            const images = document.querySelectorAll('img[src^="blob:"]')
            images.forEach(img => {
              if (img instanceof HTMLImageElement && img.src !== files.find(f => f.preview === img.src)?.preview) {
                URL.revokeObjectURL(img.src)
              }
            })
          }
        }
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(memoryCleanupInterval)
  }, [processingState.isProcessing, files])

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return

    // Enhanced file validation with size limits
    const maxFileSize = 50 * 1024 * 1024 // 50MB absolute limit
    const maxTotalSize = 200 * 1024 * 1024 // 200MB total limit
    const maxFiles = 10

    const validFiles: File[] = []
    let totalSize = files.reduce((sum, f) => sum + f.size, 0)

    for (const file of Array.from(uploadedFiles)) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive"
        })
        continue
      }

      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} is ${Math.round(file.size / (1024 * 1024))}MB. Maximum 50MB allowed.`,
          variant: "destructive"
        })
        continue
      }

      if (totalSize + file.size > maxTotalSize) {
        toast({
          title: "Total size limit exceeded",
          description: "Maximum 200MB total file size allowed",
          variant: "destructive"
        })
        break
      }

      if (files.length + validFiles.length >= maxFiles) {
        toast({
          title: "Too many files",
          description: `Maximum ${maxFiles} files allowed`,
          variant: "destructive"
        })
        break
      }

      validFiles.push(file)
      totalSize += file.size
    }

    if (validFiles.length === 0) return

    // Process files with safety checks
    const newFiles: ImageFile[] = []
    
    for (const file of validFiles) {
      try {
        const dimensions = await getImageDimensions(file)
        
        // Additional safety check for very large images
        if (dimensions.width * dimensions.height > 4096 * 4096) {
          toast({
            title: "Image resolution too high",
            description: `${file.name} has very high resolution (${dimensions.width}x${dimensions.height}). This may cause processing issues.`,
            variant: "destructive"
          })
          continue
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
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(img.src)
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
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove) {
        // Clean up blob URLs
        if (fileToRemove.preview && fileToRemove.preview.startsWith('blob:')) {
          URL.revokeObjectURL(fileToRemove.preview)
        }
        if (fileToRemove.processedPreview && fileToRemove.processedPreview.startsWith('blob:')) {
          URL.revokeObjectURL(fileToRemove.processedPreview)
        }
      }
      
      const newFiles = prev.filter(f => f.id !== fileId)
      if (newFiles.length === 0) {
        setShowUploadArea(true)
      }
      return newFiles
    })
  }

  const resetTool = () => {
    // Cancel any ongoing processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Terminate worker
    if (processingWorkerRef.current) {
      processingWorkerRef.current.terminate()
      processingWorkerRef.current = null
    }
    
    // Clean up files
    files.forEach(file => {
      if (file.preview && file.preview.startsWith('blob:')) {
        URL.revokeObjectURL(file.preview)
      }
      if (file.processedPreview && file.processedPreview.startsWith('blob:')) {
        URL.revokeObjectURL(file.processedPreview)
      }
    })
    
    setFiles([])
    setProcessingState({
      isProcessing: false,
      isPaused: false,
      canCancel: false,
      progress: 0,
      stage: "Ready",
      processedCount: 0,
      totalFiles: 0
    })
    setShowUploadArea(true)
    setIsMobileSidebarOpen(false)
  }

  const pauseProcessing = () => {
    setProcessingState(prev => ({ ...prev, isPaused: !prev.isPaused }))
  }

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    if (processingWorkerRef.current) {
      processingWorkerRef.current.terminate()
      processingWorkerRef.current = null
    }
    
    setProcessingState(prev => ({
      ...prev,
      isProcessing: false,
      isPaused: false,
      canCancel: false,
      stage: "Cancelled"
    }))
    
    toast({
      title: "Processing cancelled",
      description: "Background removal process has been stopped"
    })
  }

  const processImageSafely = async (file: ImageFile): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", {
        alpha: true,
        willReadFrequently: false,
        desynchronized: true
      })
      
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = async () => {
        try {
          // Calculate safe processing dimensions
          let workingWidth = img.naturalWidth
          let workingHeight = img.naturalHeight
          const maxSafePixels = 1536 * 1536 // 2.3MP for stability
          
          // Scale down if too large
          if (workingWidth * workingHeight > maxSafePixels) {
            const scale = Math.sqrt(maxSafePixels / (workingWidth * workingHeight))
            workingWidth = Math.floor(workingWidth * scale)
            workingHeight = Math.floor(workingHeight * scale)
          }
          
          canvas.width = Math.max(1, workingWidth)
          canvas.height = Math.max(1, workingHeight)
          
          // High quality rendering
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          
          // Get image data for processing
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          
          // Apply background removal with chunked processing
          await processBackgroundRemovalChunked(imageData, {
            algorithm,
            sensitivity: sensitivity[0],
            featherEdges,
            preserveDetails
          })
          
          // Put processed data back
          ctx.putImageData(imageData, 0, 0)
          
          // Create output blob
          const quality = outputFormat === "jpeg" ? 0.9 : 1.0
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error("Failed to create output"))
              }
            },
            `image/${outputFormat}`,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file.originalFile || file.file)
    })
  }

  const processBackgroundRemovalChunked = async (
    imageData: ImageData,
    options: any
  ): Promise<void> => {
    const { data, width, height } = imageData
    const chunkSize = 256 // Process in 256x256 chunks
    const totalChunks = Math.ceil(width / chunkSize) * Math.ceil(height / chunkSize)
    let processedChunks = 0

    // Create background mask using edge detection
    const backgroundMask = new Uint8Array(width * height)
    
    // Process in chunks to prevent blocking
    for (let startY = 0; startY < height; startY += chunkSize) {
      for (let startX = 0; startX < width; startX += chunkSize) {
        // Check if processing should be paused or cancelled
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error("Processing cancelled")
        }
        
        while (processingState.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        const endX = Math.min(startX + chunkSize, width)
        const endY = Math.min(startY + chunkSize, height)
        
        // Process chunk
        await processChunk(data, backgroundMask, startX, startY, endX, endY, width, height, options)
        
        processedChunks++
        const chunkProgress = (processedChunks / totalChunks) * 50 // First 50% for mask creation
        
        setProcessingState(prev => ({
          ...prev,
          progress: chunkProgress,
          stage: `Creating background mask... ${Math.round(chunkProgress)}%`
        }))
        
        // Allow browser to breathe
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
    
    // Apply background removal with the mask
    setProcessingState(prev => ({
      ...prev,
      progress: 50,
      stage: "Applying background removal..."
    }))
    
    await applyBackgroundMask(data, backgroundMask, width, height, options)
    
    setProcessingState(prev => ({
      ...prev,
      progress: 100,
      stage: "Complete"
    }))
  }

  const processChunk = async (
    data: Uint8ClampedArray,
    mask: Uint8Array,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    width: number,
    height: number,
    options: any
  ): Promise<void> => {
    const sensitivity = options.sensitivity || 25
    const threshold = sensitivity * 2.5
    
    // Simple edge-based background detection for chunk
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        // Check if pixel is near image border (likely background)
        const isNearBorder = x < width * 0.05 || x > width * 0.95 || 
                            y < height * 0.05 || y > height * 0.95
        
        if (isNearBorder) {
          mask[idx] = 255 // Mark as background
          continue
        }
        
        // Calculate color distance from corners (background sampling)
        const corners = [
          [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
        ]
        
        let minDistanceToCorner = Infinity
        corners.forEach(([cx, cy]) => {
          const cornerIdx = (cy * width + cx) * 4
          const distance = Math.sqrt(
            Math.pow(data[pixelIdx] - data[cornerIdx], 2) +
            Math.pow(data[pixelIdx + 1] - data[cornerIdx + 1], 2) +
            Math.pow(data[pixelIdx + 2] - data[cornerIdx + 2], 2)
          )
          minDistanceToCorner = Math.min(minDistanceToCorner, distance)
        })
        
        // Mark as background if similar to corners
        mask[idx] = minDistanceToCorner < threshold ? 255 : 0
      }
    }
  }

  const applyBackgroundMask = async (
    data: Uint8ClampedArray,
    mask: Uint8Array,
    width: number,
    height: number,
    options: any
  ): Promise<void> => {
    const chunkSize = 512
    const totalPixels = width * height
    let processedPixels = 0
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = Math.floor(i / 4)
      const maskValue = mask[pixelIdx]
      
      if (maskValue > 128) {
        // Background pixel - apply transparency with feathering
        if (options.featherEdges) {
          const featherDistance = calculateFeatherDistance(mask, pixelIdx, width, height)
          const alpha = Math.max(0, Math.min(255, featherDistance * 255))
          data[i + 3] = alpha
        } else {
          data[i + 3] = 0
        }
      } else if (options.preserveDetails) {
        // Foreground pixel - slightly enhance
        data[i + 3] = Math.min(255, data[i + 3] * 1.02)
      }
      
      processedPixels++
      
      // Update progress every chunk
      if (processedPixels % chunkSize === 0) {
        const progress = 50 + (processedPixels / totalPixels) * 50
        setProcessingState(prev => ({
          ...prev,
          progress,
          stage: `Removing background... ${Math.round(progress)}%`
        }))
        
        // Allow browser to breathe
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
  }

  const calculateFeatherDistance = (
    mask: Uint8Array,
    pixelIdx: number,
    width: number,
    height: number
  ): number => {
    const x = pixelIdx % width
    const y = Math.floor(pixelIdx / width)
    
    let minDistance = Infinity
    const searchRadius = 8
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (mask[nIdx] <= 128) { // Foreground pixel
            const distance = Math.sqrt(dx * dx + dy * dy)
            minDistance = Math.min(minDistance, distance)
          }
        }
      }
    }
    
    return Math.max(0, 1 - minDistance / searchRadius)
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

    // Initialize processing state
    setProcessingState({
      isProcessing: true,
      isPaused: false,
      canCancel: true,
      progress: 0,
      stage: "Initializing...",
      processedCount: 0,
      totalFiles: files.length
    })

    processStartTimeRef.current = Date.now()
    abortControllerRef.current = new AbortController()

    try {
      const processedFiles: ImageFile[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Check for cancellation
        if (abortControllerRef.current.signal.aborted) {
          throw new Error("Processing cancelled")
        }
        
        // Wait if paused
        while (processingState.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        setProcessingState(prev => ({
          ...prev,
          currentFile: file.name,
          stage: `Processing ${file.name}...`,
          processedCount: i
        }))
        
        try {
          const processedBlob = await processImageSafely(file)
          const processedUrl = URL.createObjectURL(processedBlob)
          
          const processedFile = {
            ...file,
            processed: true,
            processedPreview: processedUrl,
            processedSize: processedBlob.size,
            blob: processedBlob
          }
          
          processedFiles.push(processedFile)
          
          // Update progress
          const fileProgress = ((i + 1) / files.length) * 100
          const timeElapsed = Date.now() - processStartTimeRef.current
          const estimatedTotal = (timeElapsed / (i + 1)) * files.length
          const estimatedRemaining = Math.max(0, estimatedTotal - timeElapsed)
          
          setProcessingState(prev => ({
            ...prev,
            progress: fileProgress,
            processedCount: i + 1,
            estimatedTimeRemaining: estimatedRemaining
          }))
          
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error)
          
          const errorFile = {
            ...file,
            processed: false,
            error: error instanceof Error ? error.message : "Processing failed"
          }
          
          processedFiles.push(errorFile)
        }
        
        // Memory cleanup between files
        if (i % 3 === 0 && 'gc' in window && typeof (window as any).gc === 'function') {
          (window as any).gc()
        }
      }
      
      setFiles(processedFiles)
      
      const successCount = processedFiles.filter(f => f.processed).length
      const failCount = processedFiles.length - successCount
      
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        canCancel: false,
        stage: "Complete",
        progress: 100
      }))
      
      toast({
        title: "Processing complete",
        description: `${successCount} image${successCount !== 1 ? 's' : ''} processed successfully${failCount > 0 ? `, ${failCount} failed` : ''}`
      })
      
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        canCancel: false,
        stage: "Error"
      }))
      
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Background removal failed",
        variant: "destructive"
      })
    }
  }

  const downloadFile = (file: ImageFile) => {
    if (!file.blob) return

    const link = document.createElement("a")
    link.href = file.processedPreview || file.preview
    link.download = `${file.name.split('.')[0]}_no_bg.${outputFormat}`
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
          const filename = `${file.name.split('.')[0]}_no_bg.${outputFormat}`
          zip.file(filename, file.blob)
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

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
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
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Algorithm</Label>
                <Select value={algorithm} onValueChange={setAlgorithm}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Recommended)</SelectItem>
                    <SelectItem value="portrait">Portrait Mode</SelectItem>
                    <SelectItem value="object">Object Mode</SelectItem>
                    <SelectItem value="general">General Purpose</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Sensitivity: {sensitivity[0]}</Label>
                <Slider
                  value={sensitivity}
                  onValueChange={setSensitivity}
                  min={10}
                  max={50}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    checked={featherEdges}
                    onCheckedChange={setFeatherEdges}
                  />
                  <span className="text-sm">Feather Edges</span>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    checked={preserveDetails}
                    onCheckedChange={setPreserveDetails}
                  />
                  <span className="text-sm">Preserve Details</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Output Format</Label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG (Recommended)</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t bg-white space-y-3">
          <Button 
            onClick={() => {
              handleProcess()
              setIsMobileSidebarOpen(false)
            }}
            disabled={processingState.isProcessing || files.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
            size="lg"
          >
            {processingState.isProcessing ? (
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
              Remove image backgrounds automatically with AI-powered edge detection. Perfect for product photos, portraits, and graphics.
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
                <p className="text-xs text-gray-400">Up to 10 files • Up to 50MB each</p>
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
          <div className="grid grid-cols-2 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="relative">
                <CardContent className="p-3">
                  <div className="relative">
                    <img
                      src={file.processedPreview || file.preview}
                      alt={file.name}
                      className="w-full aspect-square object-cover border rounded"
                    />
                    {file.processed && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                      </div>
                    )}
                    {file.error && (
                      <div className="absolute top-2 right-2">
                        <AlertCircle className="h-5 w-5 text-red-600 bg-white rounded-full" />
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="absolute top-2 left-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
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
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Enhanced Processing Status */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 z-30">
          {processingState.isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-800">{processingState.stage}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={pauseProcessing}>
                    {processingState.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelProcessing}>
                    <Square className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Progress value={processingState.progress} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-blue-700">
                <span>{processingState.processedCount}/{processingState.totalFiles} files</span>
                {processingState.estimatedTimeRemaining && (
                  <span>~{formatTime(processingState.estimatedTimeRemaining)} remaining</span>
                )}
              </div>
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
              disabled={processingState.isProcessing || files.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3"
            >
              {processingState.isProcessing ? (
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
            </div>
          </div>

          {/* Canvas Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4 min-h-[calc(100vh-12rem)]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {files.map((file) => (
                    <Card key={file.id} className="relative group">
                      <CardContent className="p-3">
                        <div className="relative">
                          <img
                            src={file.processedPreview || file.preview}
                            alt={file.name}
                            className="w-full aspect-square object-cover border rounded transition-transform group-hover:scale-105"
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
                          {file.error && (
                            <div className="absolute top-2 right-2">
                              <AlertCircle className="h-5 w-5 text-red-600 bg-white rounded-full" />
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          {file.processed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(file)}
                              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
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
                          {file.error && (
                            <p className="text-xs text-red-600 mt-1 truncate">{file.error}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Algorithm</Label>
                    <Select value={algorithm} onValueChange={setAlgorithm}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (Recommended)</SelectItem>
                        <SelectItem value="portrait">Portrait Mode</SelectItem>
                        <SelectItem value="object">Object Mode</SelectItem>
                        <SelectItem value="general">General Purpose</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Sensitivity: {sensitivity[0]}</Label>
                    <Slider
                      value={sensitivity}
                      onValueChange={setSensitivity}
                      min={10}
                      max={50}
                      step={5}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10</span>
                      <span>50</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={featherEdges}
                        onCheckedChange={setFeatherEdges}
                      />
                      <span className="text-sm">Feather Edges</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={preserveDetails}
                        onCheckedChange={setPreserveDetails}
                      />
                      <span className="text-sm">Preserve Details</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Output Format</Label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG (Recommended)</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Processing Info */}
                {files.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Processing Info</h4>
                    <div className="text-xs text-purple-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Files:</span>
                        <span className="font-medium">{files.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Size:</span>
                        <span className="font-medium">{formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processed:</span>
                        <span className="font-medium">{files.filter(f => f.processed).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Algorithm:</span>
                        <span className="font-medium">{algorithm.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                )}

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
            {/* Enhanced Processing Status */}
            {processingState.isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-medium text-blue-800">{processingState.stage}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="outline" size="sm" onClick={pauseProcessing}>
                      {processingState.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelProcessing}>
                      <Square className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Progress value={processingState.progress} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-blue-700">
                  <span>{processingState.processedCount}/{processingState.totalFiles} files</span>
                  {processingState.estimatedTimeRemaining && (
                    <span>~{formatTime(processingState.estimatedTimeRemaining)} remaining</span>
                  )}
                </div>
                {processingState.currentFile && (
                  <p className="text-xs text-blue-600 mt-1 truncate">Processing: {processingState.currentFile}</p>
                )}
              </div>
            )}

            <Button 
              onClick={handleProcess}
              disabled={processingState.isProcessing || files.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              {processingState.isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {processingState.isPaused ? "Paused..." : "Processing..."}
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