import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  FileText, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Globe,
  Scale,
  Users,
  Gavel,
  Mail
} from "lucide-react"

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#3b82f6',
  }
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4">Terms of Service</Badge>
          <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Please read these terms carefully before using PixoraTools services.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: January 1, 2024
          </p>
        </div>

        {/* Important Notice */}
        <Alert className="mb-8 max-w-4xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            By accessing and using PixoraTools, you accept and agree to be bound by the terms and provision of this agreement.
          </AlertDescription>
        </Alert>

        {/* Terms Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                1. Acceptance of Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                These Terms of Service ("Terms") govern your use of PixoraTools ("Service") operated by 
                PixoraTools Inc. ("us", "we", or "our").
              </p>
              <p className="text-muted-foreground">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree 
                with any part of these terms, then you may not access the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                2. Description of Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                PixoraTools provides a collection of online tools for file processing, conversion, 
                and manipulation including but not limited to:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    PDF manipulation tools
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Image processing tools
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    QR code and barcode generators
                  </li>
                </ul>
                
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Text and code formatting tools
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    SEO and web development tools
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Utility and conversion tools
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                3. User Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Acceptable Use</h4>
                <p className="text-muted-foreground text-sm mb-2">You agree to use our Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Use the Service for any illegal or unauthorized purpose</li>
                  <li>Violate any laws in your jurisdiction</li>
                  <li>Transmit any harmful, threatening, or offensive content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Use automated systems to access the Service excessively</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Content Responsibility</h4>
                <p className="text-muted-foreground text-sm">
                  You are solely responsible for any content you process through our tools. 
                  You warrant that you have the right to process such content and that it does not 
                  violate any third-party rights or applicable laws.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                4. Service Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Service Uptime</h4>
                <p className="text-muted-foreground text-sm">
                  We strive to maintain high availability of our Service, but we do not guarantee 
                  uninterrupted access. The Service may be temporarily unavailable due to maintenance, 
                  updates, or technical issues.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Feature Changes</h4>
                <p className="text-muted-foreground text-sm">
                  We reserve the right to modify, suspend, or discontinue any part of the Service 
                  at any time with or without notice. We may also impose limits on certain features 
                  or restrict access to parts of the Service.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Scale className="h-5 w-5 mr-2" />
                5. Intellectual Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Our Rights</h4>
                <p className="text-muted-foreground text-sm">
                  The Service and its original content, features, and functionality are and will remain 
                  the exclusive property of PixoraTools Inc. and its licensors. The Service is protected 
                  by copyright, trademark, and other laws.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Your Content</h4>
                <p className="text-muted-foreground text-sm">
                  You retain all rights to any content you process through our tools. We do not claim 
                  ownership of your files or data. Since processing happens locally in your browser, 
                  we never access or store your content.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                6. Disclaimers and Limitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Service "As Is"</h4>
                <p className="text-muted-foreground text-sm">
                  The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, 
                  expressed or implied, and hereby disclaim all other warranties including implied warranties 
                  of merchantability, fitness for a particular purpose, or non-infringement.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Limitation of Liability</h4>
                <p className="text-muted-foreground text-sm">
                  In no event shall PixoraTools Inc., its directors, employees, partners, agents, suppliers, 
                  or affiliates be liable for any indirect, incidental, special, consequential, or punitive 
                  damages, including without limitation, loss of profits, data, use, goodwill, or other 
                  intangible losses.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Loss</h4>
                <p className="text-muted-foreground text-sm">
                  While we strive to provide reliable tools, we are not responsible for any data loss 
                  that may occur during file processing. We recommend keeping backups of important files.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gavel className="h-5 w-5 mr-2" />
                7. Governing Law
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                These Terms shall be interpreted and governed by the laws of the State of California, 
                United States, without regard to its conflict of law provisions.
              </p>
              <p className="text-muted-foreground">
                Any disputes arising from these Terms or your use of the Service shall be resolved 
                through binding arbitration in accordance with the rules of the American Arbitration Association.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-blue-600 mr-2" />
                  <span>Email: legal@pixoratools.com</span>
                </div>
                <div className="flex items-center">
                  <Globe className="h-4 w-4 text-blue-600 mr-2" />
                  <span>Website: https://pixoratools.com/contact</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}