// Security utilities and validation functions

export class SecurityValidator {
  // Validate file types to prevent malicious uploads
  static validateFileType(file: File, allowedTypes: string[]): boolean {
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    
    // Check MIME type
    const isValidMimeType = allowedTypes.some(type => {
      if (type.includes('/*')) {
        return fileType.startsWith(type.replace('/*', ''))
      }
      return fileType === type
    })
    
    // Check file extension as additional validation
    const fileExtension = fileName.split('.').pop() || ''
    const dangerousExtensions = [
      'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
      'app', 'deb', 'pkg', 'dmg', 'msi', 'run', 'ipa', 'apk'
    ]
    
    if (dangerousExtensions.includes(fileExtension)) {
      return false
    }
    
    return isValidMimeType
  }

  // Sanitize file names to prevent path traversal
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars
      .replace(/\.{2,}/g, '.') // Remove multiple dots
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 255) // Limit length
  }

  // Validate URLs to prevent SSRF
  static validateURL(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false
      }
      
      // Block private/local addresses
      const hostname = parsedUrl.hostname.toLowerCase()
      const privateRanges = [
        'localhost', '127.0.0.1', '0.0.0.0',
        '10.', '172.16.', '172.17.', '172.18.', '172.19.',
        '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
        '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
        '172.30.', '172.31.', '192.168.'
      ]
      
      if (privateRanges.some(range => hostname.startsWith(range))) {
        return false
      }
      
      return true
    } catch {
      return false
    }
  }

  // Content Security Policy validation
  static validateContent(content: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = []
    
    // Check for potentially dangerous content
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi, // Event handlers
    ]
    
    dangerousPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        issues.push('Potentially dangerous script content detected')
      }
    })
    
    // Check for suspicious URLs
    const urlPattern = /https?:\/\/[^\s<>"']+/gi
    const urls = content.match(urlPattern) || []
    
    urls.forEach(url => {
      if (!this.validateURL(url)) {
        issues.push(`Suspicious URL detected: ${url}`)
      }
    })
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }

  // Rate limiting helper
  static createRateLimiter(maxRequests: number, windowMs: number) {
    const requests = new Map<string, number[]>()
    
    return (identifier: string): boolean => {
      const now = Date.now()
      const userRequests = requests.get(identifier) || []
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(time => now - time < windowMs)
      
      if (validRequests.length >= maxRequests) {
        return false // Rate limit exceeded
      }
      
      validRequests.push(now)
      requests.set(identifier, validRequests)
      
      return true // Request allowed
    }
  }
}

// Security headers configuration
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://fundingchoicesmessages.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https://googleads.g.doubleclick.net",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ')
}