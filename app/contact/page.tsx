import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  HelpCircle,
  Bug,
  Lightbulb,
  Star
} from "lucide-react"

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#3b82f6',
  }
}

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Get help with any questions or issues",
    contact: "support@pixoratools.com",
    responseTime: "Usually within 24 hours"
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    description: "Chat with our support team in real-time",
    contact: "Available 9 AM - 6 PM EST",
    responseTime: "Instant response"
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Speak directly with our team",
    contact: "+1 (555) 123-4567",
    responseTime: "Business hours only"
  }
]

const officeLocations = [
  {
    city: "San Francisco",
    address: "123 Tech Street, Suite 100",
    zipCode: "San Francisco, CA 94105",
    country: "United States"
  },
  {
    city: "London",
    address: "456 Innovation Lane",
    zipCode: "London EC2A 4DP",
    country: "United Kingdom"
  },
  {
    city: "Tokyo",
    address: "789 Digital Avenue",
    zipCode: "Tokyo 100-0001",
    country: "Japan"
  }
]

const faqItems = [
  {
    question: "How do I report a bug or issue?",
    answer: "Use the contact form below and select 'Bug Report' as the subject. Please include details about what you were trying to do and what went wrong."
  },
  {
    question: "Can I request a new tool or feature?",
    answer: "Absolutely! We love hearing from our users. Select 'Feature Request' in the contact form and describe the tool you'd like to see."
  },
  {
    question: "Do you offer enterprise solutions?",
    answer: "Yes, we offer custom enterprise solutions including API access, white-label options, and dedicated support. Contact us for more details."
  },
  {
    question: "How can I become a partner?",
    answer: "We're always looking for great partners. Reach out to us with details about your business and how we might collaborate."
  }
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Have questions, feedback, or need help? We'd love to hear from you. 
            Our team is here to help you get the most out of PixoraTools.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {contactMethods.map((method, index) => {
              const Icon = method.icon
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle>{method.title}</CardTitle>
                    <CardDescription>{method.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-gray-900 mb-2">{method.contact}</p>
                    <p className="text-sm text-gray-600">{method.responseTime}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Contact Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="h-5 w-5 mr-2" />
                  Send us a Message
                </CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        <div className="flex items-center">
                          <HelpCircle className="h-4 w-4 mr-2" />
                          General Question
                        </div>
                      </SelectItem>
                      <SelectItem value="bug">
                        <div className="flex items-center">
                          <Bug className="h-4 w-4 mr-2" />
                          Bug Report
                        </div>
                      </SelectItem>
                      <SelectItem value="feature">
                        <div className="flex items-center">
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Feature Request
                        </div>
                      </SelectItem>
                      <SelectItem value="business">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-2" />
                          Business Inquiry
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell us how we can help you..."
                    rows={6}
                  />
                </div>

                <Button className="w-full" size="lg">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </CardContent>
            </Card>

            {/* FAQ and Office Info */}
            <div className="space-y-8">
              {/* FAQ */}
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Quick answers to common questions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {faqItems.map((item, index) => (
                    <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <h4 className="font-medium text-gray-900 mb-2">{item.question}</h4>
                      <p className="text-sm text-gray-600">{item.answer}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Office Locations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Our Offices
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {officeLocations.map((office, index) => (
                    <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <h4 className="font-medium text-gray-900">{office.city}</h4>
                      <p className="text-sm text-gray-600">{office.address}</p>
                      <p className="text-sm text-gray-600">{office.zipCode}</p>
                      <p className="text-sm text-gray-600">{office.country}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Business Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monday - Friday</span>
                      <span>9:00 AM - 6:00 PM EST</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday</span>
                      <span>10:00 AM - 4:00 PM EST</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday</span>
                      <span>Closed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}