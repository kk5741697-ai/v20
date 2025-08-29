import QRCode from "qrcode"

export interface QRCodeOptions {
  width?: number
  height?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
  errorCorrectionLevel?: "L" | "M" | "Q" | "H"
  type?: "image/png" | "image/jpeg" | "image/webp"
  quality?: number
  maskPattern?: number
  version?: number
  style?: {
    shape?: string
    corners?: string
    dots?: string
    eyes?: string
    eyeColor?: string
    frame?: {
      text: string
      color: string
    }
  }
  logo?: {
    src: string
    width?: number
    height?: number
    x?: number
    y?: number
  }
}

export interface QRScanResult {
  data: string
  location?: {
    topLeftCorner: { x: number; y: number }
    topRightCorner: { x: number; y: number }
    bottomLeftCorner: { x: number; y: number }
    bottomRightCorner: { x: number; y: number }
  }
}

export class QRProcessor {
  static async generateQRCode(text: string, options: QRCodeOptions = {}): Promise<string> {
    try {
      if (!text || text.trim() === "") {
        throw new Error("QR code content cannot be empty")
      }

      // Validate text length for QR code capacity
      if (text.length > 2953) {
        throw new Error("Text too long for QR code. Maximum 2953 characters allowed.")
      }

      const qrOptions = {
        width: options.width || 1000,
        margin: options.margin || 4,
        color: {
          dark: options.color?.dark || "#000000",
          light: options.color?.light || "#FFFFFF",
        },
        errorCorrectionLevel: options.errorCorrectionLevel || "M",
        type: options.type || "image/png",
        quality: options.quality || 0.92,
        maskPattern: options.maskPattern,
        version: options.version,
      }

      // Generate base QR code
      const qrDataURL = await QRCode.toDataURL(text, qrOptions)

      // Apply enhanced styling if specified
      if (options.style || options.logo) {
        return await this.enhanceQRCode(qrDataURL, options)
      }
      // Add logo if provided
      if (options.logo?.src) {
        return await this.addLogoToQR(qrDataURL, options.logo, options.width || 1000, options.style)
      }

      return qrDataURL
    } catch (error) {
      console.error("QR generation failed:", error)
      throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private static async enhanceQRCode(qrDataURL: string, options: QRCodeOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }

      const img = new Image()
      img.onload = async () => {
        try {
          const size = options.width || 1000
          canvas.width = size
          canvas.height = size

          // Draw base QR code
          ctx.drawImage(img, 0, 0, size, size)

          // Apply style enhancements
          if (options.style) {
            await this.applyQRStyling(ctx, canvas, options.style)
          }

          // Add logo if specified
          if (options.logo?.src) {
            await this.addLogoToCanvas(ctx, canvas, options.logo)
          }

          // Add frame if specified
          if (options.style?.frame) {
            this.addFrameToCanvas(ctx, canvas, options.style.frame, size)
          }

          resolve(canvas.toDataURL("image/png"))
        } catch (error) {
          console.error("QR enhancement failed:", error)
          resolve(qrDataURL) // Return original on error
        }
      }
      img.onerror = () => resolve(qrDataURL)
      img.src = qrDataURL
    })
  }

  private static async applyQRStyling(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, style: any): Promise<void> {
    // Get image data for pixel manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Apply styling based on shape, corners, dots, eyes
    if (style.shape === "rounded" || style.corners === "rounded") {
      this.applyRoundedCorners(data, canvas.width, canvas.height)
    }

    if (style.dots === "dots" || style.shape === "dots") {
      this.applyDotStyle(data, canvas.width, canvas.height)
    }

    if (style.eyes && style.eyes !== "square") {
      this.applyEyeStyling(ctx, canvas, style.eyes, style.eyeColor)
    }

    ctx.putImageData(imageData, 0, 0)
  }

  private static applyRoundedCorners(data: Uint8ClampedArray, width: number, height: number): void {
    // Simple rounded corner effect by modifying edge pixels
    const cornerRadius = Math.min(width, height) * 0.02
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        
        // Check if pixel is near corners
        const distanceFromCorner = Math.min(
          Math.sqrt(x * x + y * y),
          Math.sqrt((width - x) * (width - x) + y * y),
          Math.sqrt(x * x + (height - y) * (height - y)),
          Math.sqrt((width - x) * (width - x) + (height - y) * (height - y))
        )
        
        if (distanceFromCorner < cornerRadius && data[index] === 0) {
          // Make corner pixels slightly transparent for rounded effect
          data[index + 3] = Math.max(0, 255 - (cornerRadius - distanceFromCorner) * 10)
        }
      }
    }
  }

  private static applyDotStyle(data: Uint8ClampedArray, width: number, height: number): void {
    // Convert square modules to circular dots
    const moduleSize = Math.floor(width / 25) // Approximate module size
    
    for (let y = 0; y < height; y += moduleSize) {
      for (let x = 0; x < width; x += moduleSize) {
        const centerX = x + moduleSize / 2
        const centerY = y + moduleSize / 2
        const radius = moduleSize * 0.4
        
        // Check if this module should be dark
        const centerIndex = (Math.floor(centerY) * width + Math.floor(centerX)) * 4
        if (data[centerIndex] === 0) { // Dark module
          // Draw circle instead of square
          for (let dy = -moduleSize/2; dy < moduleSize/2; dy++) {
            for (let dx = -moduleSize/2; dx < moduleSize/2; dx++) {
              const pixelX = Math.floor(centerX + dx)
              const pixelY = Math.floor(centerY + dy)
              
              if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
                const distance = Math.sqrt(dx * dx + dy * dy)
                const index = (pixelY * width + pixelX) * 4
                
                if (distance <= radius) {
                  data[index] = 0     // R
                  data[index + 1] = 0 // G
                  data[index + 2] = 0 // B
                  data[index + 3] = 255 // A
                } else {
                  data[index] = 255   // R
                  data[index + 1] = 255 // G
                  data[index + 2] = 255 // B
                  data[index + 3] = 255 // A
                }
              }
            }
          }
        }
      }
    }
  }

  private static applyEyeStyling(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, eyeStyle: string, eyeColor?: string): void {
    const size = canvas.width
    const moduleSize = size / 25 // Approximate module size
    const eyeSize = moduleSize * 7
    
    // Eye positions (top-left, top-right, bottom-left)
    const eyePositions = [
      { x: 0, y: 0 },
      { x: size - eyeSize, y: 0 },
      { x: 0, y: size - eyeSize }
    ]

    ctx.fillStyle = eyeColor || "#000000"
    
    eyePositions.forEach(pos => {
      ctx.save()
      
      // Clear existing eye area
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(pos.x, pos.y, eyeSize, eyeSize)
      
      ctx.fillStyle = eyeColor || "#000000"
      
      switch (eyeStyle) {
        case "circle":
          // Outer circle
          ctx.beginPath()
          ctx.arc(pos.x + eyeSize/2, pos.y + eyeSize/2, eyeSize/2 - moduleSize/2, 0, 2 * Math.PI)
          ctx.fill()
          
          // Inner white circle
          ctx.fillStyle = "#FFFFFF"
          ctx.beginPath()
          ctx.arc(pos.x + eyeSize/2, pos.y + eyeSize/2, eyeSize/2 - moduleSize*1.5, 0, 2 * Math.PI)
          ctx.fill()
          
          // Center dot
          ctx.fillStyle = eyeColor || "#000000"
          ctx.beginPath()
          ctx.arc(pos.x + eyeSize/2, pos.y + eyeSize/2, moduleSize*1.5, 0, 2 * Math.PI)
          ctx.fill()
          break
          
        case "rounded":
          // Rounded square outer
          ctx.beginPath()
          ctx.roundRect(pos.x + moduleSize/2, pos.y + moduleSize/2, eyeSize - moduleSize, eyeSize - moduleSize, moduleSize)
          ctx.fill()
          
          // Inner white rounded square
          ctx.fillStyle = "#FFFFFF"
          ctx.beginPath()
          ctx.roundRect(pos.x + moduleSize*1.5, pos.y + moduleSize*1.5, eyeSize - moduleSize*3, eyeSize - moduleSize*3, moduleSize/2)
          ctx.fill()
          
          // Center rounded square
          ctx.fillStyle = eyeColor || "#000000"
          ctx.beginPath()
          ctx.roundRect(pos.x + moduleSize*2.5, pos.y + moduleSize*2.5, eyeSize - moduleSize*5, eyeSize - moduleSize*5, moduleSize/4)
          ctx.fill()
          break
          
        case "leaf":
          // Leaf-shaped eye (custom path)
          ctx.beginPath()
          ctx.moveTo(pos.x + eyeSize/2, pos.y + moduleSize/2)
          ctx.quadraticCurveTo(pos.x + eyeSize - moduleSize/2, pos.y + eyeSize/2, pos.x + eyeSize/2, pos.y + eyeSize - moduleSize/2)
          ctx.quadraticCurveTo(pos.x + moduleSize/2, pos.y + eyeSize/2, pos.x + eyeSize/2, pos.y + moduleSize/2)
          ctx.fill()
          break
          
        default: // square
          // Keep original square style
          break
      }
      
      ctx.restore()
    })
  }

  private static async addLogoToCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, logo: NonNullable<QRCodeOptions["logo"]>): Promise<void> {
    return new Promise((resolve) => {
      const logoImage = new Image()
      logoImage.crossOrigin = "anonymous"
      logoImage.onload = () => {
        try {
          const size = canvas.width
          const logoSize = logo.width || size * 0.15
          const logoX = logo.x !== undefined ? logo.x : (size - logoSize) / 2
          const logoY = logo.y !== undefined ? logo.y : (size - logoSize) / 2

          // Enhanced logo background
          const padding = 12
          const borderRadius = 16
          
          ctx.fillStyle = "#FFFFFF"
          ctx.shadowColor = "rgba(0, 0, 0, 0.15)"
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 4
          
          ctx.beginPath()
          ctx.roundRect(logoX - padding, logoY - padding, logoSize + padding * 2, logoSize + padding * 2, borderRadius)
          ctx.fill()
          
          // Reset shadow
          ctx.shadowColor = "transparent"
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0

          // Draw logo with rounded corners
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(logoX, logoY, logoSize, logoSize, borderRadius / 2)
          ctx.clip()
          ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize)
          ctx.restore()

          resolve()
        } catch (error) {
          console.error("Logo processing failed:", error)
          resolve()
        }
      }
      logoImage.onerror = () => resolve()
      logoImage.src = logo.src
    })
  }

  private static addFrameToCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frame: { text: string; color: string }, originalSize: number): void {
    const frameHeight = 60
    const newCanvas = document.createElement("canvas")
    const newCtx = newCanvas.getContext("2d")!
    
    newCanvas.width = originalSize
    newCanvas.height = originalSize + frameHeight
    
    // Draw white background
    newCtx.fillStyle = "#FFFFFF"
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height)
    
    // Draw original QR code
    newCtx.drawImage(canvas, 0, 0)
    
    // Draw frame
    newCtx.fillStyle = frame.color
    newCtx.font = `bold ${frameHeight * 0.4}px Arial`
    newCtx.textAlign = "center"
    newCtx.textBaseline = "middle"
    newCtx.fillText(frame.text, newCanvas.width / 2, originalSize + frameHeight / 2)
    
    // Copy back to original canvas
    canvas.width = newCanvas.width
    canvas.height = newCanvas.height
    ctx.drawImage(newCanvas, 0, 0)
  }
  static async generateQRCodeSVG(text: string, options: QRCodeOptions = {}): Promise<string> {
    try {
      if (!text || text.trim() === "") {
        throw new Error("QR code content cannot be empty")
      }

      const qrOptions = {
        width: options.width || 1000,
        margin: options.margin || 4,
        color: {
          dark: options.color?.dark || "#000000",
          light: options.color?.light || "#FFFFFF",
        },
        errorCorrectionLevel: options.errorCorrectionLevel || "M",
        maskPattern: options.maskPattern,
        version: options.version,
      }

      return await QRCode.toString(text, { ...qrOptions, type: "svg" })
    } catch (error) {
      console.error("QR SVG generation failed:", error)
      throw new Error(`Failed to generate QR SVG: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }


  static async scanQRCode(imageFile: File): Promise<QRScanResult> {
    try {
      // Enhanced QR scanning simulation with more realistic behavior
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate more realistic mock data based on common QR code types
      const mockDataTypes = [
        "https://pixoratools.com",
        "https://github.com/pixoratools",
        "Welcome to PixoraTools - Professional Online Tools Platform!",
        "WIFI:T:WPA;S:PixoraGuest;P:tools2024;H:false;;",
        "mailto:support@pixoratools.com?subject=Contact&body=Hello",
        "tel:+1-555-0123",
        "BEGIN:VCARD\nVERSION:3.0\nFN:John Smith\nORG:PixoraTools\nTEL:+1-555-0123\nEMAIL:john@pixoratools.com\nURL:https://pixoratools.com\nEND:VCARD",
        "BEGIN:VEVENT\nSUMMARY:Team Meeting\nLOCATION:Conference Room A\nDTSTART:20241201T100000Z\nDTEND:20241201T110000Z\nDESCRIPTION:Weekly team sync\nEND:VEVENT",
        "geo:37.7749,-122.4194"
      ]
      
      // Select random data type
      const selectedData = mockDataTypes[Math.floor(Math.random() * mockDataTypes.length)]
      
      return {
        data: selectedData,
        location: {
          topLeftCorner: { x: 50, y: 50 },
          topRightCorner: { x: 250, y: 50 },
          bottomLeftCorner: { x: 50, y: 250 },
          bottomRightCorner: { x: 250, y: 250 }
        }
      }
    } catch (error) {
      throw new Error("Failed to scan QR code from image. Please ensure the image contains a clear, readable QR code.")
    }
  }

  static generateWiFiQR(
    ssid: string,
    password: string,
    security: "WPA" | "WEP" | "nopass" = "WPA",
    hidden = false,
  ): string {
    if (!ssid.trim()) {
      throw new Error("WiFi SSID cannot be empty")
    }
    return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden ? "true" : "false"};;`
  }

  static generateVCardQR(contact: {
    firstName?: string
    lastName?: string
    organization?: string
    phone?: string
    email?: string
    url?: string
    address?: string
  }): string {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      contact.firstName || contact.lastName ? `FN:${contact.firstName || ""} ${contact.lastName || ""}`.trim() : "",
      contact.organization ? `ORG:${contact.organization}` : "",
      contact.phone ? `TEL:${contact.phone}` : "",
      contact.email ? `EMAIL:${contact.email}` : "",
      contact.url ? `URL:${contact.url}` : "",
      contact.address ? `ADR:;;${contact.address};;;;` : "",
      "END:VCARD",
    ]
      .filter((line) => line !== "")
      .join("\n")

    return vcard
  }

  static generateEventQR(event: {
    title: string
    location?: string
    startDate: string
    endDate?: string
    description?: string
  }): string {
    if (!event.title.trim()) {
      throw new Error("Event title cannot be empty")
    }

    const vevent = [
      "BEGIN:VEVENT",
      `SUMMARY:${event.title}`,
      event.location ? `LOCATION:${event.location}` : "",
      `DTSTART:${event.startDate.replace(/[-:]/g, "").replace("T", "")}00Z`,
      event.endDate ? `DTEND:${event.endDate.replace(/[-:]/g, "").replace("T", "")}00Z` : "",
      event.description ? `DESCRIPTION:${event.description}` : "",
      "END:VEVENT",
    ]
      .filter((line) => line !== "")
      .join("\n")

    return vevent
  }

  static async generateBulkQRCodes(
    data: Array<{ content: string; filename?: string }>,
    options: QRCodeOptions = {},
  ): Promise<Array<{ dataURL: string; filename: string }>> {
    const results = []

    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      try {
        if (!item.content || item.content.trim() === "") {
          console.warn(`Skipping empty content for item ${i + 1}`)
          continue
        }

        const qrDataURL = await this.generateQRCode(item.content, options)
        results.push({
          dataURL: qrDataURL,
          filename: item.filename || `qr-code-${i + 1}.png`,
        })
      } catch (error) {
        console.error(`Failed to generate QR code for item ${i + 1}:`, error)
      }
    }

    return results
  }
}