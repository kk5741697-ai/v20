import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Shield, 
  Lock, 
  Eye, 
  AlertTriangle, 
  CheckCircle,
  Mail,
  Clock,
  Users,
  FileText
} from "lucide-react"

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#3b82f6',
  }
}

const securityMeasures = [
  {
    icon: Lock,
    title: "Local Processing",
    description: "All file processing happens locally in your browser. Your files never leave your device.",
    status: "Active"
  },
  {
    icon: Shield,
    title: "HTTPS Encryption",
    description: "All communication is encrypted using industry-standard TLS/SSL protocols.",
    status: "Active"
  },
  {
    icon: Eye,
    title: "No Data Collection",
    description: "We don't store, log, or access your files or personal data during processing.",
    status: "Active"
  },
  {
    icon: CheckCircle,
    title: "Regular Security Audits",
    description: "Our platform undergoes regular security assessments and vulnerability testing.",
    status: "Active"
  }
]

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-100 text-green-800">Security Center</Badge>
          <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
            Security & Trust
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your security and privacy are our top priorities. Learn about our security measures and how we protect your data.
          </p>
        </div>

        {/* Security Status */}
        <Alert className="mb-8 max-w-4xl mx-auto border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>All systems secure.</strong> Our platform is operating with full security measures active.
            Last security audit: January 2024
          </AlertDescription>
        </Alert>

        {/* Security Measures */}
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Measures
              </CardTitle>
              <CardDescription>
                Comprehensive security controls protecting your data and privacy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {securityMeasures.map((measure, index) => {
                  const Icon = measure.icon
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-gray-900">{measure.title}</h3>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            {measure.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{measure.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Responsible Disclosure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Responsible Disclosure
              </CardTitle>
              <CardDescription>
                Help us maintain security by reporting vulnerabilities responsibly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Security Contact</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>security@pixoratools.com</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Response within 48 hours</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Reporting Guidelines</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Provide detailed steps to reproduce the issue</li>
                  <li>• Include screenshots or proof-of-concept if applicable</li>
                  <li>• Allow reasonable time for investigation and fixes</li>
                  <li>• Do not access or modify user data without permission</li>
                  <li>• Report issues privately before public disclosure</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">What We Cover</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Cross-site scripting (XSS)</li>
                  <li>• SQL injection vulnerabilities</li>
                  <li>• Authentication and authorization flaws</li>
                  <li>• Server-side request forgery (SSRF)</li>
                  <li>• Remote code execution</li>
                  <li>• Data exposure vulnerabilities</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Security Certifications */}
          <Card>
            <CardHeader>
              <CardTitle>Security Compliance</CardTitle>
              <CardDescription>
                Industry standards and certifications we adhere to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <h4 className="font-medium">GDPR Compliant</h4>
                  <p className="text-xs text-gray-600 mt-1">European data protection standards</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Shield className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <h4 className="font-medium">SOC 2 Type II</h4>
                  <p className="text-xs text-gray-600 mt-1">Security and availability controls</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Lock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <h4 className="font-medium">ISO 27001</h4>
                  <p className="text-xs text-gray-600 mt-1">Information security management</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Updates */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Updates</CardTitle>
              <CardDescription>
                Latest security improvements and patches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Enhanced Content Security Policy</h4>
                    <p className="text-sm text-gray-600">Implemented stricter CSP headers to prevent XSS attacks</p>
                    <p className="text-xs text-gray-500">January 2024</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Security Headers Update</h4>
                    <p className="text-sm text-gray-600">Added comprehensive security headers for better protection</p>
                    <p className="text-xs text-gray-500">January 2024</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">File Processing Security</h4>
                    <p className="text-sm text-gray-600">Enhanced client-side processing to eliminate server-side risks</p>
                    <p className="text-xs text-gray-500">December 2023</p>
                  </div>
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