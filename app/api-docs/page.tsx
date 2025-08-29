import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Code, 
  Key, 
  Zap, 
  Shield, 
  Globe,
  Database,
  Settings,
  CheckCircle,
  ExternalLink,
  Copy,
  Download
} from "lucide-react"
import Link from "next/link"

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#3b82f6',
  }
}

const apiFeatures = [
  {
    icon: Zap,
    title: "High Performance",
    description: "Process thousands of files per minute with our optimized API endpoints"
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security with 99.9% uptime SLA guarantee"
  },
  {
    icon: Globe,
    title: "Global CDN",
    description: "Low latency worldwide with our distributed infrastructure"
  },
  {
    icon: Database,
    title: "Scalable",
    description: "From startup to enterprise, our API scales with your needs"
  }
]

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/pdf/merge",
    description: "Merge multiple PDF files into one document",
    category: "PDF Tools"
  },
  {
    method: "POST", 
    path: "/api/v1/pdf/split",
    description: "Split PDF files by page ranges",
    category: "PDF Tools"
  },
  {
    method: "POST",
    path: "/api/v1/image/resize", 
    description: "Resize images with custom dimensions",
    category: "Image Tools"
  },
  {
    method: "POST",
    path: "/api/v1/image/compress",
    description: "Compress images while maintaining quality",
    category: "Image Tools"
  },
  {
    method: "POST",
    path: "/api/v1/qr/generate",
    description: "Generate custom QR codes with styling options",
    category: "QR Tools"
  },
  {
    method: "POST",
    path: "/api/v1/text/format",
    description: "Format and validate JSON, XML, HTML, and CSS",
    category: "Text Tools"
  }
]

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    requests: "1,000/month",
    features: ["Basic endpoints", "Community support", "Standard rate limits"]
  },
  {
    name: "Pro",
    price: "$29",
    requests: "50,000/month", 
    features: ["All endpoints", "Priority support", "Higher rate limits", "Webhooks"]
  },
  {
    name: "Enterprise",
    price: "Custom",
    requests: "Unlimited",
    features: ["Custom endpoints", "24/7 support", "SLA guarantee", "On-premise option"]
  }
]

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto text-center">
          <Code className="h-16 w-16 text-blue-600 mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-6">
            PixoraTools API
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Integrate our powerful file processing tools directly into your applications. 
            RESTful API with comprehensive documentation and SDKs for popular languages.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              <Key className="h-5 w-5 mr-2" />
              Get API Key
            </Button>
            <Button size="lg" variant="outline">
              <Download className="h-5 w-5 mr-2" />
              Download SDK
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
              Why Choose Our API?
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for developers, designed for scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {apiFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* API Documentation */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
              API Documentation
            </h2>
            <p className="text-lg text-muted-foreground">
              Complete reference for all available endpoints
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="authentication">Auth</TabsTrigger>
                <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                    <CardDescription>Quick start guide for the PixoraTools API</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Base URL</h4>
                      <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm">
                        https://api.pixoratools.com/v1
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Rate Limits</h4>
                      <ul className="space-y-1 text-muted-foreground text-sm">
                        <li>• Free tier: 1,000 requests per month</li>
                        <li>• Pro tier: 50,000 requests per month</li>
                        <li>• Enterprise: Custom limits available</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Response Format</h4>
                      <p className="text-muted-foreground text-sm">
                        All API responses are in JSON format with consistent error handling and status codes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="authentication" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>API Authentication</CardTitle>
                    <CardDescription>Secure your API requests with authentication</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">API Key Authentication</h4>
                      <p className="text-muted-foreground text-sm mb-3">
                        Include your API key in the Authorization header:
                      </p>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                        <div>curl -H "Authorization: Bearer YOUR_API_KEY" \</div>
                        <div className="ml-4">https://api.pixoratools.com/v1/pdf/merge</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Getting Your API Key</h4>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                        <li>Sign up for a PixoraTools account</li>
                        <li>Navigate to your dashboard</li>
                        <li>Go to API settings</li>
                        <li>Generate a new API key</li>
                        <li>Copy and securely store your key</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="endpoints" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Endpoints</CardTitle>
                    <CardDescription>Complete list of API endpoints by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {endpoints.map((endpoint, index) => (
                        <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <Badge className={`${endpoint.method === 'POST' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                {endpoint.method}
                              </Badge>
                              <code className="font-mono text-sm">{endpoint.path}</code>
                            </div>
                            <Badge variant="outline">{endpoint.category}</Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">{endpoint.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="examples" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Code Examples</CardTitle>
                    <CardDescription>Sample code in popular programming languages</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">JavaScript/Node.js</h4>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{`const response = await fetch('https://api.pixoratools.com/v1/pdf/merge', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    files: ['file1.pdf', 'file2.pdf'],
    options: { addBookmarks: true }
  })
});

const result = await response.json();`}</pre>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Python</h4>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{`import requests

headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}

data = {
    'files': ['file1.pdf', 'file2.pdf'],
    'options': {'addBookmarks': True}
}

response = requests.post(
    'https://api.pixoratools.com/v1/pdf/merge',
    headers=headers,
    json=data
)`}</pre>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">PHP</h4>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{`<?php
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => 'https://api.pixoratools.com/v1/pdf/merge',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_KEY',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'files' => ['file1.pdf', 'file2.pdf'],
        'options' => ['addBookmarks' => true]
    ])
]);

$response = curl_exec($curl);
curl_close($curl);`}</pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
              API Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Flexible pricing for every use case
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <Card key={index} className={`${index === 1 ? 'ring-2 ring-blue-500 scale-105' : ''}`}>
                <CardHeader className="text-center">
                  {index === 1 && (
                    <Badge className="mb-2 bg-blue-100 text-blue-800">Most Popular</Badge>
                  )}
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="text-3xl font-bold">{tier.price}</div>
                  <CardDescription>{tier.requests}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-6" variant={index === 1 ? "default" : "outline"}>
                    {tier.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SDKs and Libraries */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
              SDKs & Libraries
            </h2>
            <p className="text-lg text-muted-foreground">
              Official SDKs for popular programming languages
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { name: "JavaScript", package: "pixora-tools-js", version: "v2.1.0" },
              { name: "Python", package: "pixora-tools-python", version: "v2.0.3" },
              { name: "PHP", package: "pixora-tools-php", version: "v1.8.2" },
              { name: "Go", package: "pixora-tools-go", version: "v1.5.1" }
            ].map((sdk, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{sdk.name}</CardTitle>
                  <Badge variant="secondary">{sdk.version}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{sdk.package}</code>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Download className="h-3 w-3 mr-1" />
                        Install
                      </Button>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-4">
            Need API Support?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Our developer support team is here to help you integrate successfully.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
              <Link href="/contact">
                Contact API Support
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link href="/help/api">
                View API Guides
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}