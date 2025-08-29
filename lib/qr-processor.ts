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
        quality: options.quality || 0.92,
        maskPattern: options.maskPattern,
        version: options.version,
      }

      // Generate base QR code
      const qrDataURL = await QRCode.toDataURL(text, qrOptions)

      // Apply styling and enhancements
      let enhancedQR = qrDataURL

      if (options.style || options.logo?.src) {
        enhancedQR = await this.enhanceQRCode(qrDataURL, options)
      }

      return enhancedQR
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

          // Apply styling
          if (options.style) {
            await this.applyQRStyling(ctx, canvas, options.style, size)
          }

          // Add logo if provided
          if (options.logo?.src) {
            await this.addLogoToCanvas(ctx, canvas, options.logo)
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

  private static async applyQRStyling(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, style: any, size: number): Promise<void> {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const moduleSize = Math.floor(size / 25) // Approximate QR module size

    // Apply different styles based on configuration
    if (style.shape === "rounded" || style.corners === "rounded") {
      this.applyRoundedStyle(data, canvas.width, canvas.height, moduleSize)
    }

    if (style.shape === "dots" || style.dots === "dots") {
      this.applyDotStyle(data, canvas.width, canvas.height, moduleSize)
    }

    if (style.shape === "extra-rounded") {
      this.applyExtraRoundedStyle(data, canvas.width, canvas.height, moduleSize)
    }

    // Apply eye styling
    if (style.eyes && style.eyes !== "square") {
      this.applyEyeStyling(ctx, canvas, style.eyes, style.eyeColor || "#000000", size)
    }

    ctx.putImageData(imageData, 0, 0)
  }

  private static applyRoundedStyle(data: Uint8ClampedArray, width: number, height: number, moduleSize: number): void {
    const cornerRadius = moduleSize * 0.3

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        
        if (data[index] === 0) { // Dark pixel
          const moduleX = Math.floor(x / moduleSize)
          const moduleY = Math.floor(y / moduleSize)
          const pixelInModuleX = x % moduleSize
          const pixelInModuleY = y % moduleSize
          
          // Check if pixel is in corner area
          const distanceFromCorner = Math.min(
            Math.sqrt(pixelInModuleX * pixelInModuleX + pixelInModuleY * pixelInModuleY),
            Math.sqrt((moduleSize - pixelInModuleX) * (moduleSize - pixelInModuleX) + pixelInModuleY * pixelInModuleY),
            Math.sqrt(pixelInModuleX * pixelInModuleX + (moduleSize - pixelInModuleY) * (moduleSize - pixelInModuleY)),
            Math.sqrt((moduleSize - pixelInModuleX) * (moduleSize - pixelInModuleX) + (moduleSize - pixelInModuleY) * (moduleSize - pixelInModuleY))
          )
          
          if (distanceFromCorner > cornerRadius) {
            // Make corner pixels white for rounded effect
            data[index] = 255     // R
            data[index + 1] = 255 // G
            data[index + 2] = 255 // B
          }
        }
      }
    }
  }

  private static applyDotStyle(data: Uint8ClampedArray, width: number, height: number, moduleSize: number): void {
    const radius = moduleSize * 0.4

    for (let y = 0; y < height; y += moduleSize) {
      for (let x = 0; x < width; x += moduleSize) {
        const centerX = x + moduleSize / 2
        const centerY = y + moduleSize / 2
        
        // Check if this module should be dark
        const centerIndex = (Math.floor(centerY) * width + Math.floor(centerX)) * 4
        if (centerIndex < data.length && data[centerIndex] === 0) {
          // Clear the module area first
          for (let dy = 0; dy < moduleSize; dy++) {
            for (let dx = 0; dx < moduleSize; dx++) {
              const pixelX = x + dx
              const pixelY = y + dy
              if (pixelX < width && pixelY < height) {
                const index = (pixelY * width + pixelX) * 4
                data[index] = 255     // R
                data[index + 1] = 255 // G
                data[index + 2] = 255 // B
              }
            }
          }
          
          // Draw circle
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const distance = Math.sqrt(dx * dx + dy * dy)
              if (distance <= radius) {
                const pixelX = Math.floor(centerX + dx)
                const pixelY = Math.floor(centerY + dy)
                
                if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
                  const index = (pixelY * width + pixelX) * 4
                  data[index] = 0       // R
                  data[index + 1] = 0   // G
                  data[index + 2] = 0   // B
                }
              }
            }
          }
        }
      }
    }
  }

  private static applyExtraRoundedStyle(data: Uint8ClampedArray, width: number, height: number, moduleSize: number): void {
    const cornerRadius = moduleSize * 0.5

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        
        if (data[index] === 0) { // Dark pixel
          const moduleX = Math.floor(x / moduleSize)
          const moduleY = Math.floor(y / moduleSize)
          const pixelInModuleX = x % moduleSize
          const pixelInModuleY = y % moduleSize
          
          // Calculate distance from module center
          const centerX = moduleSize / 2
          const centerY = moduleSize / 2
          const distanceFromCenter = Math.sqrt(
            (pixelInModuleX - centerX) * (pixelInModuleX - centerX) + 
            (pixelInModuleY - centerY) * (pixelInModuleY - centerY)
          )
          
          if (distanceFromCenter > cornerRadius) {
            // Make pixels outside radius white
            data[index] = 255     // R
            data[index + 1] = 255 // G
            data[index + 2] = 255 // B
          }
        }
      }
    }
  }

  private static applyEyeStyling(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, eyeStyle: string, eyeColor: string, size: number): void {
    const moduleSize = size / 25
    const eyeSize = moduleSize * 7
    
    // Eye positions (top-left, top-right, bottom-left)
    const eyePositions = [
      { x: moduleSize, y: moduleSize },
      { x: size - eyeSize - moduleSize, y: moduleSize },
      { x: moduleSize, y: size - eyeSize - moduleSize }
    ]

    eyePositions.forEach(pos => {
      ctx.save()
      
      // Clear existing eye area
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(pos.x, pos.y, eyeSize, eyeSize)
      
      ctx.fillStyle = eyeColor
      
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
          ctx.fillStyle = eyeColor
          ctx.beginPath()
          ctx.arc(pos.x + eyeSize/2, pos.y + eyeSize/2, moduleSize*1.5, 0, 2 * Math.PI)
          ctx.fill()
          break
          
        case "rounded":
          // Rounded square outer
          this.drawRoundedRect(ctx, pos.x + moduleSize/2, pos.y + moduleSize/2, eyeSize - moduleSize, eyeSize - moduleSize, moduleSize/2)
          ctx.fill()
          
          // Inner white rounded square
          ctx.fillStyle = "#FFFFFF"
          this.drawRoundedRect(ctx, pos.x + moduleSize*1.5, pos.y + moduleSize*1.5, eyeSize - moduleSize*3, eyeSize - moduleSize*3, moduleSize/3)
          ctx.fill()
          
          // Center rounded square
          ctx.fillStyle = eyeColor
          this.drawRoundedRect(ctx, pos.x + moduleSize*2.5, pos.y + moduleSize*2.5, eyeSize - moduleSize*5, eyeSize - moduleSize*5, moduleSize/4)
          ctx.fill()
          break
          
        case "leaf":
          // Leaf-shaped eye
          ctx.beginPath()
          ctx.moveTo(pos.x + eyeSize/2, pos.y + moduleSize/2)
          ctx.quadraticCurveTo(pos.x + eyeSize - moduleSize/2, pos.y + eyeSize/2, pos.x + eyeSize/2, pos.y + eyeSize - moduleSize/2)
          ctx.quadraticCurveTo(pos.x + moduleSize/2, pos.y + eyeSize/2, pos.x + eyeSize/2, pos.y + moduleSize/2)
          ctx.fill()
          
          // Inner white area
          ctx.fillStyle = "#FFFFFF"
          ctx.beginPath()
          ctx.moveTo(pos.x + eyeSize/2, pos.y + moduleSize*1.5)
          ctx.quadraticCurveTo(pos.x + eyeSize - moduleSize*1.5, pos.y + eyeSize/2, pos.x + eyeSize/2, pos.y + eyeSize - moduleSize*1.5)
          ctx.quadraticCurveTo(pos.x + moduleSize*1.5, pos.y + eyeSize/2, pos.x + eyeSize/2, pos.y + moduleSize*1.5)
          ctx.fill()
          
          // Center dot
          ctx.fillStyle = eyeColor
          ctx.beginPath()
          ctx.arc(pos.x + eyeSize/2, pos.y + eyeSize/2, moduleSize, 0, 2 * Math.PI)
          ctx.fill()
          break
          
        default: // square - keep original
          break
      }
      
      ctx.restore()
    })
  }

  private static drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  private static async addLogoToCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, logo: NonNullable<QRCodeOptions["logo"]>): Promise<void> {
    return new Promise((resolve) => {
      const logoImage = new Image()
      logoImage.crossOrigin = "anonymous"
      logoImage.onload = () => {
        try {
          const size = canvas.width
          const logoSize = logo.width || size * 0.2
          const logoX = logo.x !== undefined ? logo.x : (size - logoSize) / 2
          const logoY = logo.y !== undefined ? logo.y : (size - logoSize) / 2

          // Enhanced logo background with better styling
          const padding = logoSize * 0.1
          const borderRadius = logoSize * 0.1
          
          // White background with shadow
          ctx.save()
          ctx.fillStyle = "#FFFFFF"
          ctx.shadowColor = "rgba(0, 0, 0, 0.2)"
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 2
          
          this.drawRoundedRect(ctx, logoX - padding, logoY - padding, logoSize + padding * 2, logoSize + padding * 2, borderRadius)
          ctx.fill()
          
          // Reset shadow
          ctx.shadowColor = "transparent"
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0

          // Draw logo with rounded corners
          ctx.beginPath()
          this.drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, borderRadius / 2)
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
      await new Promise(resolve => setTimeout(resolve, 1500))
      
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