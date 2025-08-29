"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Shield, X, CheckCircle } from "lucide-react"

export function SecurityBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [hasAcknowledged, setHasAcknowledged] = useState(false)

  useEffect(() => {
    // Check if user has already acknowledged security notice
    const acknowledged = localStorage.getItem('security-acknowledged')
    if (!acknowledged) {
      setIsVisible(true)
    } else {
      setHasAcknowledged(true)
    }
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem('security-acknowledged', 'true')
    setIsVisible(false)
    setHasAcknowledged(true)
  }

  if (!isVisible || hasAcknowledged) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-green-50 border-b border-green-200 p-4">
      <div className="container mx-auto">
        <Alert className="border-green-300 bg-green-50">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <strong>Secure Processing:</strong> All your files are processed locally in your browser. 
                We never upload or store your data on our servers.
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <Button 
                  size="sm" 
                  onClick={handleAcknowledge}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Got it
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsVisible(false)}
                  className="text-green-600 hover:text-green-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}