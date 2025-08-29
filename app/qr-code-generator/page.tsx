"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { QRProcessor } from "@/lib/qr-processor"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  QrCode,
  Download,
  Link,
  FileText,
  Wifi,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  User,
  Upload,
  Palette,
  CheckCircle,
  Globe,
  MapPin,
  Settings,
  AlertCircle,
  Copy,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Square,
  Circle,
  Hexagon,
  Star
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { AdBanner } from "@/components/ads/ad-banner"

export default function QRCodeGeneratorPage() {
  const [activeType, setActiveType] = useState("url")
  const [content, setContent] = useState("https://example.com")
  const [qrSize, setQrSize] = useState([1000])
  const [errorCorrection, setErrorCorrection] = useState("M")
  const [foregroundColor, setForegroundColor] = useState("#000000")
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState("")
  const [qrStyle, setQrStyle] = useState("square")
  const [cornerStyle, setCornerStyle] = useState("square")
  const [dotStyle, setDotStyle] = useState("square")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [frameEnabled, setFrameEnabled] = useState(false)
  const [frameText, setFrameText] = useState("Scan Me")
  const [frameColor, setFrameColor] = useState("#000000")
  const [gradientEnabled, setGradientEnabled] = useState(false)
  const [gradientColor1, setGradientColor1] = useState("#000000")
  const [gradientColor2, setGradientColor2] = useState("#333333")
  const [eyeStyle, setEyeStyle] = useState("square")
  const [eyeColor, setEyeColor] = useState("#000000")
  
  // Content type specific fields
  const [emailData, setEmailData] = useState({ email: "", subject: "", body: "" })
  const [phoneData, setPhoneData] = useState({ phone: "" })
  const [smsData, setSmsData] = useState({ phone: "", message: "" })
  const [wifiData, setWifiData] = useState({ ssid: "", password: "", security: "WPA", hidden: false })
  const [vcardData, setVcardData] = useState({ 
    firstName: "", lastName: "", organization: "", phone: "", email: "", url: "", address: "" 
  })
  const [eventData, setEventData] = useState({
    title: "", location: "", startDate: "", endDate: "", description: ""
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const contentTypes = [
    { id: "url", label: "URL", icon: Link },
    { id: "text", label: "TEXT", icon: FileText },
    { id: "email", label: "EMAIL", icon: Mail },
    { id: "phone", label: "PHONE", icon: Phone },
    { id: "sms", label: "SMS", icon: MessageSquare },
    { id: "vcard", label: "VCARD", icon: User },
    { id: "wifi", label: "WIFI", icon: Wifi },
    { id: "event", label: "EVENT", icon: Calendar },
    { id: "location", label: "LOCATION", icon: MapPin },
  ]

  const styleOptions = [
    { id: "square", label: "Square", icon: Square },
    { id: "rounded", label: "Rounded", icon: Circle },
    { id: "dots", label: "Dots", icon: Circle },
    { id: "extra-rounded", label: "Extra Rounded", icon: Hexagon },
  ]

  const eyeStyleOptions = [
    { id: "square", label: "Square", icon: Square },
    { id: "circle", label: "Circle", icon: Circle },
    { id: "rounded", label: "Rounded", icon: Hexagon },
    { id: "leaf", label: "Leaf", icon: Star },
  ]

  const generateQRContent = () => {
    try {
      switch (activeType) {
        case "url":
        case "text":
          if (!content.trim()) return ""
          return content
        case "email":
          if (!emailData.email.trim()) return ""
          return `mailto:${emailData.email}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`
        case "phone":
          if (!phoneData.phone.trim()) return ""
          return `tel:${phoneData.phone}`
        case "sms":
          if (!smsData.phone.trim()) return ""
          return `sms:${smsData.phone}?body=${encodeURIComponent(smsData.message)}`
        case "wifi":
          if (!wifiData.ssid.trim()) return ""
          return QRProcessor.generateWiFiQR(wifiData.ssid, wifiData.password, wifiData.security as any, wifiData.hidden)
        case "vcard":
          if (!vcardData.firstName && !vcardData.lastName && !vcardData.email) return ""
          return QRProcessor.generateVCardQR(vcardData)
        case "event":
          if (!eventData.title.trim()) return ""
          return QRProcessor.generateEventQR(eventData)
        case "location":
          if (!content.trim()) return ""
          return `geo:${content}`
        default:
          return content
      }
    } catch (error) {
      console.error("Error generating QR content:", error)
      return ""
    }
  }

  const generateQR = async () => {
    try {
      const qrContent = generateQRContent()
      if (!qrContent.trim()) {
        toast({
          title: "No content to generate",
          description: "Please enter content for the QR code",
          variant: "destructive"
        })
        return
      }

      setIsGenerating(true)

      // Enhanced QR generation with proper styling
      const logoSrc = logoFile ? URL.createObjectURL(logoFile) : logoUrl
      const qrOptions = {
        width: qrSize[0],
        color: gradientEnabled ? {
          dark: gradientColor1,
          light: backgroundColor,
        } : {
          dark: foregroundColor,
          light: backgroundColor,
        },
        errorCorrectionLevel: errorCorrection as "L" | "M" | "Q" | "H",
        style: {
          shape: qrStyle,
          corners: cornerStyle,
          dots: dotStyle,
          eyes: eyeStyle,
          eyeColor: eyeColor,
          frame: frameEnabled ? {
            text: frameText,
            color: frameColor
          } : undefined
        },
        logo: logoSrc ? {
          src: logoSrc,
          width: qrSize[0] * 0.2,
        } : undefined,
      }

      const qrDataURL = await QRProcessor.generateQRCode(qrContent, qrOptions)
      setQrDataUrl(qrDataURL)

      toast({
        title: "QR Code generated",
        description: "Your QR code is ready for download"
      })

    } catch (error) {
      console.error("Failed to generate QR code:", error)
      setQrDataUrl("")
      toast({
        title: "QR Generation Failed",
        description: error instanceof Error ? error.message : "Please check your input and try again",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setLogoFile(file)
      setLogoUrl("")
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearLogo = () => {
    setLogoFile(null)
    setLogoUrl("")
    setLogoPreview("")
  }

  const downloadQR = async (format: string) => {
    try {
      if (format === "svg") {
        const qrContent = generateQRContent()
        if (!qrContent.trim()) {
          toast({
            title: "No content to generate QR code",
            description: "Please enter content first",
            variant: "destructive"
          })
          return
        }

        const qrOptions = {
          width: qrSize[0],
          color: { dark: foregroundColor, light: backgroundColor },
          errorCorrectionLevel: errorCorrection as "L" | "M" | "Q" | "H"
        }
        const svgString = await QRProcessor.generateQRCodeSVG(qrContent, qrOptions)
        const blob = new Blob([svgString], { type: "image/svg+xml" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.download = "qr-code.svg"
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      } else {
        if (!qrDataUrl) {
          toast({
            title: "No QR code to download",
            description: "Please generate a QR code first",
            variant: "destructive"
          })
          return
        }
        
        // Convert canvas to blob for better download
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!
        const img = new Image()
        
        img.onload = () => {
          canvas.width = qrSize[0]
          canvas.height = qrSize[0]
          ctx.drawImage(img, 0, 0)
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const link = document.createElement("a")
              link.download = `qr-code.${format}`
              link.href = url
              link.click()
              URL.revokeObjectURL(url)
            }
          }, `image/${format}`, 0.95)
        }
        img.src = qrDataUrl
      }
      
      toast({
        title: "Download started",
        description: `QR code downloaded as ${format.toUpperCase()}`
      })
    } catch (error) {
      console.error("Failed to download QR code:", error)
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unable to download QR code",
        variant: "destructive"
      })
    }
  }

  const renderContentForm = () => {
    switch (activeType) {
      case "url":
        return (
          <div>
            <Label htmlFor="url-content">Website URL</Label>
            <Input
              id="url-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="https://example.com"
              className="mt-1"
            />
          </div>
        )
      
      case "text":
        return (
          <div>
            <Label htmlFor="text-content">Text Content</Label>
            <Textarea
              id="text-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your text here..."
              className="mt-1"
              rows={3}
            />
          </div>
        )
      
      case "email":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={emailData.email}
                onChange={(e) => setEmailData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contact@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="body">Message (Optional)</Label>
              <Textarea
                id="body"
                value={emailData.body}
                onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Email message"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        )
      
      case "phone":
        return (
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneData.phone}
              onChange={(e) => setPhoneData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1234567890"
              className="mt-1"
            />
          </div>
        )
      
      case "sms":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="sms-phone">Phone Number</Label>
              <Input
                id="sms-phone"
                type="tel"
                value={smsData.phone}
                onChange={(e) => setSmsData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1234567890"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                value={smsData.message}
                onChange={(e) => setSmsData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Your SMS message"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        )
      
      case "wifi":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="wifi-ssid">Network Name (SSID)</Label>
              <Input
                id="wifi-ssid"
                value={wifiData.ssid}
                onChange={(e) => setWifiData(prev => ({ ...prev, ssid: e.target.value }))}
                placeholder="MyWiFiNetwork"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wifi-password">Password</Label>
              <Input
                id="wifi-password"
                type="password"
                value={wifiData.password}
                onChange={(e) => setWifiData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="WiFi password"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wifi-security">Security Type</Label>
              <Select value={wifiData.security} onValueChange={(value) => setWifiData(prev => ({ ...prev, security: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WPA">WPA/WPA2</SelectItem>
                  <SelectItem value="WEP">WEP</SelectItem>
                  <SelectItem value="nopass">No Password</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="wifi-hidden"
                checked={wifiData.hidden}
                onCheckedChange={(checked) => setWifiData(prev => ({ ...prev, hidden: checked as boolean }))}
              />
              <Label htmlFor="wifi-hidden" className="text-sm">Hidden Network</Label>
            </div>
          </div>
        )
      
      case "vcard":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={vcardData.firstName}
                  onChange={(e) => setVcardData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={vcardData.lastName}
                  onChange={(e) => setVcardData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={vcardData.organization}
                onChange={(e) => setVcardData(prev => ({ ...prev, organization: e.target.value }))}
                placeholder="Company Name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vcard-phone">Phone</Label>
              <Input
                id="vcard-phone"
                type="tel"
                value={vcardData.phone}
                onChange={(e) => setVcardData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1234567890"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vcard-email">Email</Label>
              <Input
                id="vcard-email"
                type="email"
                value={vcardData.email}
                onChange={(e) => setVcardData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vcard-url">Website</Label>
              <Input
                id="vcard-url"
                type="url"
                value={vcardData.url}
                onChange={(e) => setVcardData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vcard-address">Address</Label>
              <Textarea
                id="vcard-address"
                value={vcardData.address}
                onChange={(e) => setVcardData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, City, State, ZIP"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        )
      
      case "event":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                value={eventData.title}
                onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Meeting Title"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                value={eventData.location}
                onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Conference Room A"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={eventData.startDate}
                  onChange={(e) => setEventData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={eventData.endDate}
                  onChange={(e) => setEventData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventData.description}
                onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        )
      
      case "location":
        return (
          <div>
            <Label htmlFor="location-content">Coordinates or Address</Label>
            <Input
              id="location-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="40.7128,-74.0060 or 123 Main St, New York"
              className="mt-1"
            />
          </div>
        )
      
      default:
        return (
          <div>
            <Label htmlFor="default-content">Content</Label>
            <Textarea
              id="default-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your content here..."
              className="mt-1"
              rows={3}
            />
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-2">
          <AdBanner 
            adSlot="tool-header-banner"
            adFormat="auto"
            className="max-w-6xl mx-auto"
            mobileOptimized={true}
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <QrCode className="h-5 w-5 text-green-600" />
            <h1 className="text-lg font-semibold text-gray-900">QR Generator</h1>
          </div>
          <Badge variant="secondary">{activeType.toUpperCase()}</Badge>
        </div>

        {/* Content Type Tabs */}
        <div className="bg-white border-b">
          <div className="px-4 py-3">
            <ScrollArea orientation="horizontal">
              <div className="flex space-x-2">
                {contentTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant={activeType === type.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveType(type.id)}
                    className="flex items-center space-x-2 whitespace-nowrap"
                  >
                    <type.icon className="h-4 w-4" />
                    <span>{type.label}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Content Input */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              {renderContentForm()}
            </CardContent>
          </Card>

          {/* QR Preview */}
          <Card>
            <CardHeader>
              <CardTitle>QR Code Preview</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {qrDataUrl ? (
                <div className="space-y-4">
                  <img
                    src={qrDataUrl}
                    alt="Generated QR Code"
                    className="mx-auto max-w-full border rounded-lg shadow-md"
                    style={{ maxWidth: "250px" }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => downloadQR("png")} className="bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4 mr-2" />
                      PNG
                    </Button>
                    <Button variant="outline" onClick={() => downloadQR("svg")}>
                      SVG
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-muted-foreground">
                  <QrCode className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Configure settings and generate QR code</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Ad */}
          <AdBanner 
            adSlot="mobile-qr-content"
            adFormat="auto"
            className="w-full"
            mobileOptimized={true}
          />

          {/* Generate Button */}
          <Button 
            onClick={generateQR}
            disabled={isGenerating || !generateQRContent().trim()}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
            size="lg"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Generate QR Code
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-[calc(100vh-8rem)] w-full overflow-hidden">
        {/* Left Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <QrCode className="h-5 w-5 text-green-600" />
                <h1 className="text-xl font-semibold text-gray-900">QR Code Generator</h1>
              </div>
              <Badge variant="secondary">{activeType.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setContent("")
                  setQrDataUrl("")
                  setLogoFile(null)
                  setLogoUrl("")
                  setLogoPreview("")
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {qrDataUrl && (
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

          {/* Content Type Tabs */}
          <div className="bg-white border-b">
            <div className="px-6 py-3">
              <ScrollArea orientation="horizontal">
                <div className="flex space-x-2">
                  {contentTypes.map((type) => (
                    <Button
                      key={type.id}
                      variant={activeType === type.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveType(type.id)}
                      className="flex items-center space-x-2 whitespace-nowrap"
                    >
                      <type.icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Canvas Content */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
            {!qrDataUrl ? (
              <div className="text-center max-w-md">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
                  <QrCode className="relative h-24 w-24 text-green-500 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-gray-700">Generate Your QR Code</h3>
                <p className="text-gray-500 mb-6 text-lg">
                  Configure your settings and click generate to create your QR code
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-800">
                      {!generateQRContent().trim() ? "Please enter content to generate QR code" : "Ready to generate QR code"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={qrDataUrl}
                  alt="Generated QR Code"
                  className="max-w-full max-h-[70vh] object-contain border border-gray-300 rounded-lg shadow-lg bg-white"
                  style={{ 
                    transform: `scale(${zoomLevel / 100})`,
                    transition: "transform 0.2s ease"
                  }}
                />
                
                <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <span>{qrSize[0]} × {qrSize[0]} px</span>
                    <span>Error Level: {errorCorrection}</span>
                    <span>{Math.round((qrSize[0] * qrSize[0] * 3) / 1024)}KB</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 xl:w-96 bg-white border-l shadow-lg flex flex-col max-h-screen">
          <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <QrCode className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">QR Settings</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Configure your QR code options</p>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Content Input */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Content</Label>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                  {renderContentForm()}
                </div>

                {/* Design Style */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Design</Label>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">QR Style</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {styleOptions.map((style) => (
                        <Button
                          key={style.id}
                          variant={qrStyle === style.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setQrStyle(style.id)}
                          className="flex items-center space-x-2 text-xs h-10"
                        >
                          <style.icon className="h-4 w-4" />
                          <span>{style.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Eye Style</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {eyeStyleOptions.map((style) => (
                        <Button
                          key={style.id}
                          variant={eyeStyle === style.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEyeStyle(style.id)}
                          className="flex items-center space-x-2 text-xs h-10"
                        >
                          <style.icon className="h-4 w-4" />
                          <span>{style.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Colors</Label>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="gradient-enabled"
                      checked={gradientEnabled}
                      onCheckedChange={setGradientEnabled}
                    />
                    <Label htmlFor="gradient-enabled" className="text-sm">Enable Gradient</Label>
                  </div>

                  {gradientEnabled ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Gradient Start</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="color"
                            value={gradientColor1}
                            onChange={(e) => setGradientColor1(e.target.value)}
                            className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <Input
                            value={gradientColor1}
                            onChange={(e) => setGradientColor1(e.target.value)}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Gradient End</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="color"
                            value={gradientColor2}
                            onChange={(e) => setGradientColor2(e.target.value)}
                            className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <Input
                            value={gradientColor2}
                            onChange={(e) => setGradientColor2(e.target.value)}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Foreground</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="color"
                            value={foregroundColor}
                            onChange={(e) => setForegroundColor(e.target.value)}
                            className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <Input
                            value={foregroundColor}
                            onChange={(e) => setForegroundColor(e.target.value)}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Background</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                            className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <Input
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium">Eye Color</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="color"
                        value={eyeColor}
                        onChange={(e) => setEyeColor(e.target.value)}
                        className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <Input
                        value={eyeColor}
                        onChange={(e) => setEyeColor(e.target.value)}
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Logo</Label>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Upload Logo</Label>
                    <div className="mt-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Logo URL</Label>
                    <Input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value)
                        if (e.target.value) {
                          setLogoFile(null)
                          setLogoPreview("")
                        }
                      }}
                      placeholder="https://example.com/logo.png"
                      className="mt-1"
                      disabled={!!logoFile}
                    />
                  </div>
                  
                  {(logoPreview || logoUrl) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Logo Preview</Label>
                      <div className="relative inline-block">
                        <img
                          src={logoPreview || logoUrl}
                          alt="Logo preview"
                          className="w-16 h-16 object-contain border border-gray-300 rounded-lg bg-white"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                          onClick={clearLogo}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Advanced</Label>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Error Correction</Label>
                    <Select value={errorCorrection} onValueChange={setErrorCorrection}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Low (7%)</SelectItem>
                        <SelectItem value="M">Medium (15%)</SelectItem>
                        <SelectItem value="Q">Quartile (25%)</SelectItem>
                        <SelectItem value="H">High (30%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Size</Label>
                      <Badge variant="outline" className="text-xs">
                        {qrSize[0]} × {qrSize[0]} px
                      </Badge>
                    </div>
                    <Slider
                      value={qrSize}
                      onValueChange={setQrSize}
                      max={2000}
                      min={200}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>200px</span>
                      <span>2000px</span>
                    </div>
                  </div>
                </div>

                {/* Sidebar Ad */}
                <AdBanner 
                  adSlot="qr-sidebar"
                  adFormat="auto"
                  className="w-full"
                />

                {/* QR Code Info */}
                {generateQRContent().trim() && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">QR Code Info</h4>
                    <div className="text-xs text-green-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Content Type:</span>
                        <span className="font-medium">{activeType.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data Length:</span>
                        <span className="font-medium">{generateQRContent().length} chars</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Error Correction:</span>
                        <span className="font-medium">{errorCorrection}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated Size:</span>
                        <span className="font-medium">{Math.round((qrSize[0] * qrSize[0] * 3) / 1024)}KB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Fixed Sidebar Footer */}
          <div className="p-6 border-t bg-gray-50 space-y-3 flex-shrink-0">
            {/* Generate Button */}
            <Button 
              onClick={generateQR}
              disabled={isGenerating || !generateQRContent().trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>

            {/* Download Options */}
            {qrDataUrl && (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">QR Code Ready!</span>
                  </div>
                  <p className="text-xs text-green-600">Choose your download format below</p>
                </div>
                
                <Button 
                  onClick={() => downloadQR("png")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PNG
                </Button>

                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadQR("svg")}
                    className="text-blue-600 border-blue-400 hover:bg-blue-50"
                  >
                    SVG
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadQR("jpeg")}
                    className="text-orange-600 border-orange-400 hover:bg-orange-50"
                  >
                    JPEG
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadQR("webp")}
                    className="text-purple-600 border-purple-400 hover:bg-purple-50"
                  >
                    WebP
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generateQRContent())
                    toast({ title: "Content copied", description: "QR code content copied to clipboard" })
                  }}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Content
                </Button>
              </div>
            )}

            {/* Content Validation */}
            {!generateQRContent().trim() && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">Please enter content to generate QR code</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}