import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  HelpCircle, 
  Search, 
  FileText, 
  ImageIcon, 
  QrCode, 
  Code,
  TrendingUp,
  Wrench,
  ChevronRight,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Book,
  Video,
  MessageSquare,
  Users,
  Shield
} from "lucide-react"
import Link from "next/link"

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#3b82f6',
  }
}

const helpCategories = [
  {
    title: "PDF Tools",
    description: "Learn how to merge, split, compress, and convert PDF files",
    icon: FileText,
    color: "text-red-600",
    bgColor: "bg-red-100",
    articles: 12,
    href: "/help/pdf-tools"
  },
  {
    title: "Image Tools", 
    description: "Master image resizing, compression, conversion, and editing",
    icon: ImageIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    articles: 15,
    href: "/help/image-tools"
  },
  {
    title: "QR & Barcode Tools",
    description: "Create and scan QR codes and barcodes effectively",
    icon: QrCode,
    color: "text-green-600", 
    bgColor: "bg-green-100",
    articles: 8,
    href: "/help/qr-tools"
  },
  {
    title: "Code & Text Tools",
    description: "Format, validate, and convert code and text efficiently",
    icon: Code,
    color: "text-orange-600",
    bgColor: "bg-orange-100", 
    articles: 10,
    href: "/help/code-tools"
  },
  {
    title: "SEO Tools",
    description: "Optimize your website with our SEO analysis tools",
    icon: TrendingUp,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    articles: 6,
    href: "/help/seo-tools"
  },
  {
    title: "Utilities",
    description: "Use generators, converters, and utility tools effectively",
    icon: Wrench,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    articles: 9,
    href: "/help/utilities"
  }
]

const popularArticles = [
  {
    title: "How to Merge Multiple PDF Files",
    description: "Step-by-step guide to combining PDF documents",
    category: "PDF Tools",
    readTime: "3 min read",
    views: "45.2k",
    href: "/help/merge-pdf-files"
  },
  {
    title: "Compress Images Without Losing Quality",
    description: "Best practices for image compression and optimization",
    category: "Image Tools", 
    readTime: "5 min read",
    views: "38.7k",
    href: "/help/compress-images"
  },
  {
    title: "Creating Custom QR Codes with Logos",
    description: "Advanced QR code customization techniques",
    category: "QR Tools",
    readTime: "4 min read", 
    views: "29.1k",
    href: "/help/custom-qr-codes"
  },
  {
    title: "JSON Formatting and Validation Guide",
    description: "Complete guide to working with JSON data",
    category: "Code Tools",
    readTime: "6 min read",
    views: "22.8k", 
    href: "/help/json-formatting"
  }
]

const quickHelp = [
  {
    question: "How do I upload files?",
    answer: "Click the upload area or drag and drop files directly onto the tool page.",
    icon: CheckCircle
  },
  {
    question: "Are my files stored on your servers?",
    answer: "No, all processing happens locally in your browser. Files never leave your device.",
    icon: Shield
  },
  {
    question: "What file formats are supported?",
    answer: "Each tool supports specific formats. Check the tool page for supported file types.",
    icon: FileText
  },
  {
    question: "Is there a file size limit?",
    answer: "Free users can process files up to 100MB. Premium users have higher limits.",
    icon: AlertCircle
  }
]

const resourceTypes = [
  {
    title: "Video Tutorials",
    description: "Watch step-by-step video guides",
    icon: Video,
    count: "25+ videos",
    href: "/help/videos"
  },
  {
    title: "Documentation",
    description: "Comprehensive tool documentation",
    icon: Book,
    count: "60+ articles", 
    href: "/help/docs"
  },
  {
    title: "Community Forum",
    description: "Get help from other users",
    icon: MessageSquare,
    count: "1.2k discussions",
    href: "/help/forum"
  }
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto text-center">
          <HelpCircle className="h-16 w-16 text-blue-600 mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-6">
            Help Center
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find answers, learn how to use our tools effectively, and get the most out of PixoraTools.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input 
                placeholder="Search for help articles, tutorials, and guides..."
                className="pl-12 py-4 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Help */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-2xl font-heading font-bold text-center mb-8">Quick Answers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {quickHelp.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Icon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">{item.question}</h4>
                    <p className="text-sm text-gray-600">{item.answer}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">Browse by Category</h2>
            <p className="text-lg text-muted-foreground">
              Find detailed guides and tutorials for each tool category
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category, index) => {
              const Icon = category.icon
              return (
                <Link key={index} href={category.href}>
                  <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-lg ${category.bgColor}`}>
                          <Icon className={`h-6 w-6 ${category.color}`} />
                        </div>
                        <Badge variant="secondary">{category.articles} articles</Badge>
                      </div>
                      <CardTitle className="group-hover:text-blue-600 transition-colors">
                        {category.title}
                      </CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-blue-600 group-hover:text-blue-700">
                        <span>View articles</span>
                        <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">Popular Articles</h2>
            <p className="text-lg text-muted-foreground">
              Most viewed help articles and tutorials
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {popularArticles.map((article, index) => (
              <Link key={index} href={article.href}>
                <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{article.category}</Badge>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{article.readTime}</span>
                      </div>
                    </div>
                    <CardTitle className="group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </CardTitle>
                    <CardDescription>{article.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Star className="h-4 w-4 mr-1" />
                        <span>{article.views} views</span>
                      </div>
                      <div className="flex items-center text-sm text-blue-600 group-hover:text-blue-700">
                        <span>Read article</span>
                        <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">Learning Resources</h2>
            <p className="text-lg text-muted-foreground">
              Multiple ways to learn and get help
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {resourceTypes.map((resource, index) => {
              const Icon = resource.icon
              return (
                <Link key={index} href={resource.href}>
                  <Card className="text-center hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <CardHeader>
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                        <Icon className="h-8 w-8 text-blue-600" />
                      </div>
                      <CardTitle className="group-hover:text-blue-600 transition-colors">
                        {resource.title}
                      </CardTitle>
                      <CardDescription>{resource.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary">{resource.count}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Still Need Help */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-4">
            Still Need Help?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
              <Link href="/contact">
                <MessageSquare className="h-5 w-5 mr-2" />
                Contact Support
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link href="/help/forum">
                <Users className="h-5 w-5 mr-2" />
                Community Forum
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}