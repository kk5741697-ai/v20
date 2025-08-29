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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { 
  Upload, 
  Download, 
  Crop,
  CheckCircle,
  X,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Square,
  Circle,
  RotateCcw,
  Settings
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
  name: string
  size: number
  dimensions: { width: number; height: number }
  preview: string
  cropArea: CropArea
}

const cropOptions = [
  {
    key: "aspectRatio",
    label: "Aspect Ratio",
    type: "select" as const,
    defaultValue: "free",
    selectOptions: [
      { value: "free", label: "Free" },
      { value: "1:1", label: "Square (1:1)" },
      { value: "4:3", label: "Standard (4:3)" },
      { value: "16:9", label: "Widescreen (16:9)" },
      { value: "3:2", label: "Photo (3:2)" },
      { value: "9:16", label: "Mobile (9:16)" },
      { value: "3:1", label: "Twitter Header (3:1)" },
      { value: "4:1", label: "LinkedIn Banner (4:1)" },
      { value: "2:3", label: "Pinterest Pin (2:3)" },
      { value: "5:4", label: "Instagram Portrait (5:4)" },
      { value: "1.91:1", label: "Facebook Cover (1.91:1)" },
    ],
    section: "Crop Settings",
  },
  {
    key: "outputFormat",
    label: "Output Format",
    type: "select" as const,
    defaultValue: "png",
    selectOptions: [
      { value: "png", label: "PNG" },
      { value: "jpeg", label: "JPEG" },
      { value: "webp", label: "WebP" },
    ],
    section: "Output",
  },
  {
    key: "quality",
    label: "Quality",
    type: "slider" as const,
    defaultValue: 95,
    min: 10,
    max: 100,
    step: 5,
    section: "Output",
  },
  {
    key: "backgroundColor",
    label: "Background Color",
    type: "color" as const,
    defaultValue: "#ffffff",
    section: "Output",
  },
]

const socialPresets = [
  { name: "Instagram Post", aspectRatio: "1:1", dimensions: { width: 1080, height: 1080 } },
  { name: "Instagram Story", aspectRatio: "9:16", dimensions: { width: 1080, height: 1920 } },
  { name: "YouTube Thumbnail", aspectRatio: "16:9", dimensions: { width: 1280, height: 720 } },
  { name: "Facebook Cover", aspectRatio: "1.91:1", dimensions: { width: 1200, height: 630 } },
  { name: "Twitter Header", aspectRatio: "3:1", dimensions: { width: 1500, height: 500 } },
  { name: "LinkedIn Post", aspectRatio: "1.91:1", dimensions: { width: 1200, height: 627 } },
]

export default function ImageCropperPage() {
  const [file, setFile] = useState<ImageFile | null>(null)
  const [toolOptions, setToolOptions] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFile, setProcessedFile] = useState<ImageFile | null>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<string>("")
  const [imageScale, setImageScale] = useState(1)
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })
  const [showUploadArea, setShowUploadArea] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const defaultOptions: Record<string, any> = {}
    cropOptions.forEach(option => {
      defaultOptions[option.key] = option.defaultValue
    })
    setToolOptions(defaultOptions)
  }, [])

  useEffect(() => {
    if (file && canvasRef.current && containerRef.current && canvasReady) {
      // Use requestAnimationFrame to prevent flickering
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        calculateImageFit()
        drawCanvas()
      })
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [file, zoomLevel, canvasReady])

  useEffect(() => {
    if (file && canvasReady) {
      // Debounced canvas redraw to prevent flickering
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        drawCanvas()
      })
    }
  }, [file?.cropArea, canvasReady])

  // Initialize canvas when container is ready
  useEffect(() => {
    if (containerRef.current && canvasRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        setCanvasReady(true)
      })
      
      resizeObserver.observe(containerRef.current)
      
      return () => {
        resizeObserver.disconnect()
      }
    }
  }, [])

  const calculateImageFit = useCallback(() => {
    if (!file || !containerRef.current || !canvasRef.current) return

    const container = containerRef.current
    const canvas = canvasRef.current
    
    // Set canvas size to match container
    const rect = container.getBoundingClientRect()
    const containerWidth = rect.width
    const containerHeight = rect.height
    
    // Update canvas size
    canvas.width = containerWidth
    canvas.height = containerHeight
    
    const imageAspect = file.dimensions.width / file.dimensions.height
    const containerAspect = containerWidth / containerHeight

    let scale: number
    let offsetX: number
    let offsetY: number

    if (imageAspect > containerAspect) {
      scale = (containerWidth * (zoomLevel / 100)) / file.dimensions.width
      offsetX = 0
      offsetY = (containerHeight - file.dimensions.height * scale) / 2
    } else {
      scale = (containerHeight * (zoomLevel / 100)) / file.dimensions.height
      offsetX = (containerWidth - file.dimensions.width * scale) / 2
      offsetY = 0
    }

    // Ensure minimum scale and proper bounds
    scale = Math.max(0.1, scale)
    offsetX = Math.max(0, offsetX)
    offsetY = Math.max(0, offsetY)

    setImageScale(scale)
    setImageOffset({ x: offsetX, y: offsetY })
  }, [file, zoomLevel])

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return

    const uploadedFile = uploadedFiles[0]
    
    if (!uploadedFile.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
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
        name: uploadedFile.name,
        size: uploadedFile.size,
        dimensions,
        preview,
        cropArea: { x: 10, y: 10, width: 80, height: 80 }
      }

      setFile(imageFile)
      setProcessedFile(null)
      setShowUploadArea(false)
      setCanvasReady(false)
      
      // Small delay to ensure DOM is ready
      setTimeout(() => setCanvasReady(true), 100)
      
      toast({
        title: "Image uploaded",
        description: "Image loaded successfully for cropping"
      })
    } catch (error) {
      toast({
        title: "Error loading image",
        description: "Failed to load the image file",
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

  const drawCanvas = useCallback(() => {
    if (!file || !canvasRef.current || !containerRef.current || !canvasReady) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    
    // Clear canvas with proper bounds checking
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw background
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      
      // Calculate display dimensions with proper bounds
      const displayWidth = Math.max(10, file.dimensions.width * imageScale)
      const displayHeight = Math.max(10, file.dimensions.height * imageScale)
      
      // Ensure image stays within canvas bounds
      const adjustedOffsetX = Math.max(0, Math.min(canvas.width - displayWidth, imageOffset.x))
      const adjustedOffsetY = Math.max(0, Math.min(canvas.height - displayHeight, imageOffset.y))
      
      // Draw image with bounds checking
      if (displayWidth > 0 && displayHeight > 0) {
        ctx.drawImage(img, adjustedOffsetX, adjustedOffsetY, displayWidth, displayHeight)
        
        // Draw crop overlay
        drawCropOverlay(ctx, displayWidth, displayHeight, adjustedOffsetX, adjustedOffsetY)
      }
    }
    img.onerror = () => {
      console.error("Failed to load image for canvas")
    }
    img.src = file.preview
  }, [file, imageScale, imageOffset, canvasReady])

  const drawCropOverlay = useCallback((
    ctx: CanvasRenderingContext2D, 
    imageWidth: number, 
    imageHeight: number, 
    imageX: number, 
    imageY: number
  ) => {
    if (!file) return

    // Calculate crop area in canvas coordinates with bounds checking
    const cropX = Math.max(imageX, imageX + (file.cropArea.x / 100) * imageWidth)
    const cropY = Math.max(imageY, imageY + (file.cropArea.y / 100) * imageHeight)
    const cropWidth = Math.min(imageWidth, (file.cropArea.width / 100) * imageWidth)
    const cropHeight = Math.min(imageHeight, (file.cropArea.height / 100) * imageHeight)

    // Ensure crop area is within image bounds
    const maxCropX = Math.min(cropX, imageX + imageWidth - cropWidth)
    const maxCropY = Math.min(cropY, imageY + imageHeight - cropHeight)
    const finalCropX = Math.max(imageX, maxCropX)
    const finalCropY = Math.max(imageY, maxCropY)
    const finalCropWidth = Math.max(10, Math.min(cropWidth, imageWidth))
    const finalCropHeight = Math.max(10, Math.min(cropHeight, imageHeight))

    // Draw dark overlay on entire canvas
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    
    // Clear crop area to show original image
    ctx.clearRect(finalCropX, finalCropY, finalCropWidth, finalCropHeight)
    
    // Redraw image in crop area only
    if (imageRef.current) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(finalCropX, finalCropY, finalCropWidth, finalCropHeight)
      ctx.clip()
      ctx.drawImage(imageRef.current, imageX, imageY, imageWidth, imageHeight)
      ctx.restore()
    }
    
    // Draw crop border
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 3
    ctx.strokeRect(finalCropX, finalCropY, finalCropWidth, finalCropHeight)
    
    // Draw resize handles with better touch targets for mobile
    const handleSize = window.innerWidth < 768 ? 16 : 12
    const handles = [
      { x: finalCropX - handleSize/2, y: finalCropY - handleSize/2, cursor: "nw-resize", handle: "nw" },
      { x: finalCropX + finalCropWidth/2 - handleSize/2, y: finalCropY - handleSize/2, cursor: "n-resize", handle: "n" },
      { x: finalCropX + finalCropWidth - handleSize/2, y: finalCropY - handleSize/2, cursor: "ne-resize", handle: "ne" },
      { x: finalCropX + finalCropWidth - handleSize/2, y: finalCropY + finalCropHeight/2 - handleSize/2, cursor: "e-resize", handle: "e" },
      { x: finalCropX + finalCropWidth - handleSize/2, y: finalCropY + finalCropHeight - handleSize/2, cursor: "se-resize", handle: "se" },
      { x: finalCropX + finalCropWidth/2 - handleSize/2, y: finalCropY + finalCropHeight - handleSize/2, cursor: "s-resize", handle: "s" },
      { x: finalCropX - handleSize/2, y: finalCropY + finalCropHeight - handleSize/2, cursor: "sw-resize", handle: "sw" },
      { x: finalCropX - handleSize/2, y: finalCropY + finalCropHeight/2 - handleSize/2, cursor: "w-resize", handle: "w" },
    ]
    
    // Draw handles
    ctx.fillStyle = "#3b82f6"
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize)
    })
    
    // Draw center move handle
    ctx.fillStyle = "#1d4ed8"
    ctx.strokeStyle = "#ffffff"
    const centerSize = window.innerWidth < 768 ? 20 : 16
    const centerX = finalCropX + finalCropWidth/2 - centerSize/2
    const centerY = finalCropY + finalCropHeight/2 - centerSize/2
    
    ctx.fillRect(centerX, centerY, centerSize, centerSize)
    ctx.strokeRect(centerX, centerY, centerSize, centerSize)
    
    // Draw move icon
    ctx.fillStyle = "#ffffff"
    ctx.font = `${centerSize * 0.75}px Arial`
    ctx.textAlign = "center"
    ctx.fillText("✥", finalCropX + finalCropWidth/2, finalCropY + finalCropHeight/2 + 4)
  }, [file])

  const updateCropArea = useCallback((newCropArea: CropArea) => {
    if (!file) return
    
    // Apply aspect ratio constraint if set
    if (toolOptions.aspectRatio && toolOptions.aspectRatio !== "free") {
      const aspectParts = toolOptions.aspectRatio.split(':')
      if (aspectParts.length === 2) {
        const [ratioW, ratioH] = aspectParts.map(Number)
        if (ratioW && ratioH) {
          const targetRatio = ratioW / ratioH
          const currentRatio = newCropArea.width / newCropArea.height
          
          if (Math.abs(currentRatio - targetRatio) > 0.01) {
            if (currentRatio > targetRatio) {
              newCropArea.width = newCropArea.height * targetRatio
            } else {
              newCropArea.height = newCropArea.width / targetRatio
            }
          }
        }
      }
    }
    
    // Ensure crop area stays within bounds with better validation
    newCropArea.x = Math.max(0, Math.min(100 - newCropArea.width, newCropArea.x))
    newCropArea.y = Math.max(0, Math.min(100 - newCropArea.height, newCropArea.y))
    newCropArea.width = Math.max(5, Math.min(100 - newCropArea.x, newCropArea.width))
    newCropArea.height = Math.max(5, Math.min(100 - newCropArea.y, newCropArea.height))
    
    setFile(prev => prev ? { ...prev, cropArea: newCropArea } : null)
  }, [file, toolOptions.aspectRatio])

  const getMousePosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!file || !canvasRef.current || !canvasReady) return
    
    e.preventDefault()
    const { x, y } = getMousePosition(e)
    
    const displayWidth = file.dimensions.width * imageScale
    const displayHeight = file.dimensions.height * imageScale
    
    const cropX = imageOffset.x + (file.cropArea.x / 100) * displayWidth
    const cropY = imageOffset.y + (file.cropArea.y / 100) * displayHeight
    const cropWidth = (file.cropArea.width / 100) * displayWidth
    const cropHeight = (file.cropArea.height / 100) * displayHeight
    
    // Check resize handles first with larger touch targets for mobile
    const handleSize = window.innerWidth < 768 ? 16 : 12
    const touchPadding = window.innerWidth < 768 ? 8 : 4
    
    const handles = [
      { x: cropX - handleSize/2, y: cropY - handleSize/2, handle: "nw" },
      { x: cropX + cropWidth/2 - handleSize/2, y: cropY - handleSize/2, handle: "n" },
      { x: cropX + cropWidth - handleSize/2, y: cropY - handleSize/2, handle: "ne" },
      { x: cropX + cropWidth - handleSize/2, y: cropY + cropHeight/2 - handleSize/2, handle: "e" },
      { x: cropX + cropWidth - handleSize/2, y: cropY + cropHeight - handleSize/2, handle: "se" },
      { x: cropX + cropWidth/2 - handleSize/2, y: cropY + cropHeight - handleSize/2, handle: "s" },
      { x: cropX - handleSize/2, y: cropY + cropHeight - handleSize/2, handle: "sw" },
      { x: cropX - handleSize/2, y: cropY + cropHeight/2 - handleSize/2, handle: "w" },
    ]
    
    for (const handle of handles) {
      if (x >= handle.x - touchPadding && x <= handle.x + handleSize + touchPadding && 
          y >= handle.y - touchPadding && y <= handle.y + handleSize + touchPadding) {
        setIsResizing(true)
        setResizeHandle(handle.handle)
        setDragStart({ x, y })
        return
      }
    }
    
    // Check center move handle
    const centerSize = window.innerWidth < 768 ? 20 : 16
    const centerX = cropX + cropWidth/2 - centerSize/2
    const centerY = cropY + cropHeight/2 - centerSize/2
    
    if (x >= centerX - touchPadding && x <= centerX + centerSize + touchPadding && 
        y >= centerY - touchPadding && y <= centerY + centerSize + touchPadding) {
      setIsDragging(true)
      setDragStart({ x: x - cropX, y: y - cropY })
      return
    }
    
    // Check if clicking inside crop area for moving
    if (x >= cropX && x <= cropX + cropWidth && y >= cropY && y <= cropY + cropHeight) {
      setIsDragging(true)
      setDragStart({ x: x - cropX, y: y - cropY })
    }
  }, [file, imageScale, imageOffset, getMousePosition, canvasReady])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!file || !canvasRef.current || (!isDragging && !isResizing) || !canvasReady) return
    
    e.preventDefault()
    const { x, y } = getMousePosition(e)
    
    const displayWidth = file.dimensions.width * imageScale
    const displayHeight = file.dimensions.height * imageScale
    
    if (isDragging) {
      const newX = ((x - dragStart.x - imageOffset.x) / displayWidth) * 100
      const newY = ((y - dragStart.y - imageOffset.y) / displayHeight) * 100
      
      updateCropArea({
        ...file.cropArea,
        x: Math.max(0, Math.min(100 - file.cropArea.width, newX)),
        y: Math.max(0, Math.min(100 - file.cropArea.height, newY))
      })
    } else if (isResizing) {
      const deltaX = ((x - dragStart.x) / displayWidth) * 100
      const deltaY = ((y - dragStart.y) / displayHeight) * 100
      
      let newCropArea = { ...file.cropArea }
      
      switch (resizeHandle) {
        case "nw":
          newCropArea.x += deltaX
          newCropArea.y += deltaY
          newCropArea.width -= deltaX
          newCropArea.height -= deltaY
          break
        case "n":
          newCropArea.y += deltaY
          newCropArea.height -= deltaY
          break
        case "ne":
          newCropArea.y += deltaY
          newCropArea.width += deltaX
          newCropArea.height -= deltaY
          break
        case "e":
          newCropArea.width += deltaX
          break
        case "se":
          newCropArea.width += deltaX
          newCropArea.height += deltaY
          break
        case "s":
          newCropArea.height += deltaY
          break
        case "sw":
          newCropArea.x += deltaX
          newCropArea.width -= deltaX
          newCropArea.height += deltaY
          break
        case "w":
          newCropArea.x += deltaX
          newCropArea.width -= deltaX
          break
      }
      
      updateCropArea(newCropArea)
      setDragStart({ x, y })
    }
  }, [file, isDragging, isResizing, dragStart, imageScale, imageOffset, resizeHandle, updateCropArea, getMousePosition, canvasReady])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle("")
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileUpload(e.dataTransfer.files)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const resetTool = () => {
    setFile(null)
    setProcessedFile(null)
    setZoomLevel(100)
    setShowUploadArea(true)
    setCanvasReady(false)
    setIsMobileSidebarOpen(false)
    
    const defaultOptions: Record<string, any> = {}
    cropOptions.forEach(option => {
      defaultOptions[option.key] = option.defaultValue
    })
    setToolOptions(defaultOptions)
  }

  const applyPreset = (preset: typeof socialPresets[0]) => {
    if (!file) return
    
    const { width: presetWidth, height: presetHeight } = preset.dimensions
    const imageAspectRatio = file.dimensions.width / file.dimensions.height
    const presetAspectRatio = presetWidth / presetHeight
    
    let newCropArea: CropArea
    
    if (imageAspectRatio > presetAspectRatio) {
      const newWidth = (presetAspectRatio * file.dimensions.height / file.dimensions.width) * 100
      newCropArea = {
        x: (100 - newWidth) / 2,
        y: 0,
        width: newWidth,
        height: 100
      }
    } else {
      const newHeight = (file.dimensions.width / presetAspectRatio / file.dimensions.height) * 100
      newCropArea = {
        x: 0,
        y: (100 - newHeight) / 2,
        width: 100,
        height: newHeight
      }
    }
    
    updateCropArea(newCropArea)
    setToolOptions(prev => ({ ...prev, aspectRatio: preset.aspectRatio }))
  }

  const handleProcess = async () => {
    if (!file) {
      toast({
        title: "No image selected",
        description: "Please upload an image file",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)

    try {
      const processedBlob = await ImageProcessor.cropImage(
        file.file,
        file.cropArea,
        { 
          outputFormat: toolOptions.outputFormat || "png", 
          quality: toolOptions.quality || 95,
          backgroundColor: toolOptions.backgroundColor
        }
      )

      const processedUrl = URL.createObjectURL(processedBlob)
      const outputFormat = toolOptions.outputFormat || "png"
      const baseName = file.name.split(".")[0]
      const newName = `${baseName}_cropped.${outputFormat}`

      const processed: ImageFile = {
        ...file,
        name: newName,
        size: processedBlob.size,
        preview: processedUrl,
        cropArea: file.cropArea
      }

      setProcessedFile(processed)
      
      toast({
        title: "Processing complete",
        description: "Image cropped successfully"
      })
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to crop image",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadFile = () => {
    if (!processedFile) return

    const link = document.createElement("a")
    link.href = processedFile.preview
    link.download = processedFile.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download started",
      description: `${processedFile.name} downloaded successfully`
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
            {/* Social Media Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Social Media Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {socialPresets.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      applyPreset(preset)
                      setIsMobileSidebarOpen(false)
                    }}
                    className="text-xs h-auto p-3 flex flex-col items-center"
                    disabled={!file}
                  >
                    <span className="font-medium">{preset.name.split(' ')[0]}</span>
                    <span className="text-xs text-gray-500">{preset.aspectRatio}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Tool Options */}
            {cropOptions.map((option) => (
              <div key={option.key} className="space-y-2">
                <Label className="text-sm font-medium">{option.label}</Label>
                
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

                {option.type === "color" && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={toolOptions[option.key] || option.defaultValue}
                      onChange={(e) => {
                        setToolOptions(prev => ({ ...prev, [option.key]: e.target.value }))
                      }}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <Input
                      value={toolOptions[option.key] || option.defaultValue}
                      onChange={(e) => {
                        setToolOptions(prev => ({ ...prev, [option.key]: e.target.value }))
                      }}
                      className="flex-1 font-mono text-sm h-10"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Mobile Ad */}
            <div className="py-4">
              <AdBanner 
                adSlot="mobile-crop-sidebar"
                adFormat="auto"
                className="w-full"
              />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )

  // Show upload area if no file
  if (showUploadArea && !file) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        {/* Top Ad Banner */}
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
              <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Crop Image</h1>
            </div>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Crop images with precision using our visual editor and aspect ratio presets.
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

            {/* Bottom Ad */}
            <div className="mt-6 lg:mt-8">
              <AdBanner 
                adSlot="upload-bottom-banner"
                adFormat="auto"
                className="w-full"
              />
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

  // Tool interface after file is uploaded - Responsive
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Top Ad Banner */}
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
        {/* Mobile Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Crop className="h-5 w-5 text-cyan-600" />
            <h1 className="text-lg font-semibold text-gray-900">Crop Image</h1>
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

        {/* Mobile Canvas */}
        <div className="relative h-[60vh] overflow-hidden" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          />
          
          {/* Mobile Crop Info Overlay */}
          {file && (
            <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
              <div className="space-y-1">
                <div>X: {Math.round(file.cropArea.x)}% Y: {Math.round(file.cropArea.y)}%</div>
                <div>W: {Math.round(file.cropArea.width)}% H: {Math.round(file.cropArea.height)}%</div>
              </div>
            </div>
          )}

          {/* Mobile Instructions */}
          <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs px-3 py-2 rounded-lg text-center">
            Drag to move • Drag corners to resize
          </div>
        </div>

        {/* Mobile Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 z-30">
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
              disabled={isProcessing || !file}
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

          {processedFile && (
            <Button 
              onClick={downloadFile}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Cropped Image
            </Button>
          )}
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
                <Crop className="h-5 w-5 text-cyan-600" />
                <h1 className="text-xl font-semibold text-gray-900">Crop Image</h1>
              </div>
              <Badge variant="secondary">Single Mode</Badge>
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
          <div className="flex-1 overflow-hidden relative" ref={containerRef}>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            />
            
            {/* Crop Info Overlay */}
            {file && (
              <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
                <div className="space-y-1">
                  <div>X: {Math.round(file.cropArea.x)}% Y: {Math.round(file.cropArea.y)}%</div>
                  <div>W: {Math.round(file.cropArea.width)}% H: {Math.round(file.cropArea.height)}%</div>
                  <div className="text-gray-300">Use arrow keys • Shift+arrows for 5px steps</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Sidebar */}
        <div className="w-80 xl:w-96 bg-white border-l shadow-lg flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Crop className="h-5 w-5 text-cyan-600" />
              <h2 className="text-lg font-semibold text-gray-900">Crop Settings</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Adjust crop area and output options</p>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Social Media Presets */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Social Media Presets</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {socialPresets.slice(0, 6).map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="text-xs h-auto p-2 flex flex-col items-center"
                        disabled={!file}
                      >
                        <span className="font-medium">{preset.name.split(' ')[0]}</span>
                        <span className="text-xs text-gray-500">{preset.aspectRatio}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Tool Options */}
                {cropOptions.map((option) => (
                  <div key={option.key} className="space-y-2">
                    <Label className="text-sm font-medium">{option.label}</Label>
                    
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
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Manual Crop Controls */}
                {file && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manual Adjust</Label>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">X Position (%)</Label>
                        <Input
                          type="number"
                          value={Math.round(file.cropArea.x)}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                            updateCropArea({ ...file.cropArea, x: value })
                          }}
                          className="text-xs h-8"
                          min={0}
                          max={100}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y Position (%)</Label>
                        <Input
                          type="number"
                          value={Math.round(file.cropArea.y)}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                            updateCropArea({ ...file.cropArea, y: value })
                          }}
                          className="text-xs h-8"
                          min={0}
                          max={100}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Width (%)</Label>
                        <Input
                          type="number"
                          value={Math.round(file.cropArea.width)}
                          onChange={(e) => {
                            const value = Math.max(5, Math.min(100, parseInt(e.target.value) || 5))
                            updateCropArea({ ...file.cropArea, width: value })
                          }}
                          className="text-xs h-8"
                          min={5}
                          max={100}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height (%)</Label>
                        <Input
                          type="number"
                          value={Math.round(file.cropArea.height)}
                          onChange={(e) => {
                            const value = Math.max(5, Math.min(100, parseInt(e.target.value) || 5))
                            updateCropArea({ ...file.cropArea, height: value })
                          }}
                          className="text-xs h-8"
                          min={5}
                          max={100}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* File Info */}
                {file && (
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-cyan-800 mb-2">Image Info</h4>
                    <div className="text-xs text-cyan-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Original Size:</span>
                        <span className="font-medium">{file.dimensions.width}×{file.dimensions.height}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Size:</span>
                        <span className="font-medium">{formatFileSize(file.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Crop Size:</span>
                        <span className="font-medium">
                          {Math.round((file.cropArea.width / 100) * file.dimensions.width)}×{Math.round((file.cropArea.height / 100) * file.dimensions.height)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sidebar Ad */}
                <AdBanner 
                  adSlot="crop-sidebar"
                  adFormat="auto"
                  className="w-full"
                />
              </div>
            </ScrollArea>
          </div>

          {/* Fixed Sidebar Footer */}
          <div className="p-6 border-t bg-gray-50 space-y-3 flex-shrink-0">
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-800">Cropping image...</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleProcess}
              disabled={isProcessing || !file}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Crop className="h-4 w-4 mr-2" />
                  Crop Image
                </>
              )}
            </Button>

            {processedFile && (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Cropping complete!</span>
                  </div>
                  <p className="text-xs text-green-600">Image ready for download</p>
                </div>
                
                <Button 
                  onClick={downloadFile}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Cropped Image
                </Button>
              </div>
            )}

            {/* Usage Instructions */}
            <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
              <div className="font-medium mb-2">How to crop:</div>
              <div>• Drag the crop area to move</div>
              <div>• Drag corners/edges to resize</div>
              <div>• Use arrow keys for precise movement</div>
              <div>• Hold Shift for 5px steps</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
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