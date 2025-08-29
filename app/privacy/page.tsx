import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Eye, Lock, Database, Globe, UserCheck, Mail, MapPin } from "lucide-react"

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#3b82f6',
  }
}

const privacyPrinciples = [
  {
    icon: Shield,
    title: "Privacy by Design",
    description: "Privacy is built into every tool from the ground up, not added as an afterthought."
  },
  {
    icon: Lock,
    title: "Local Processing",
    description: "Your files are processed locally in your browser and never uploaded to our servers."
  },
  {
    icon: Eye,
    title: "No Tracking",
    description: "We don't track your usage patterns or store personal information without consent."
  },
  {
    icon: Database,
    title: "Minimal Data Collection",
    description: "We only collect essential data needed to provide and improve our services."
  }
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4">Privacy Policy</Badge>
          <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
            Your Privacy Matters
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We are committed to protecting your privacy and being transparent about how we handle your data.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: January 1, 2024
          </p>
        </div>

        {/* Privacy Principles */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-8 text-center">
            Our Privacy Principles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {privacyPrinciples.map((principle, index) => {
              const Icon = principle.icon
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">{principle.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{principle.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Privacy Policy Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Information You Provide</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Contact information when you reach out to us</li>
                  <li>Account information if you create an account (optional)</li>
                  <li>Feedback and survey responses</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Automatically Collected Information</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Basic usage analytics (page views, tool usage)</li>
                  <li>Technical information (browser type, device type)</li>
                  <li>Error logs for debugging purposes</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Information We DON'T Collect</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Your uploaded files or their contents</li>
                  <li>Personal documents or data you process</li>
                  <li>Detailed browsing history outside our site</li>
                  <li>Location data beyond country-level for analytics</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start">
                  <UserCheck className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Service Provision:</strong> To provide and maintain our tools and services</span>
                </li>
                <li className="flex items-start">
                  <Globe className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Communication:</strong> To respond to your inquiries and provide support</span>
                </li>
                <li className="flex items-start">
                  <Database className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Improvement:</strong> To analyze usage patterns and improve our tools</span>
                </li>
                <li className="flex items-start">
                  <Shield className="h-5 w-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Security:</strong> To detect and prevent fraud and abuse</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. File Processing and Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">✓ Local Processing</h4>
                <p className="text-green-700 text-sm">
                  All file processing happens locally in your browser. Your files are never uploaded to our servers, 
                  ensuring complete privacy and security of your documents.
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">✓ No File Storage</h4>
                <p className="text-blue-700 text-sm">
                  We do not store, cache, or retain any files you process through our tools. 
                  Files exist only in your browser's memory during processing.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-2">✓ Secure Transmission</h4>
                <p className="text-purple-700 text-sm">
                  All communication with our servers uses HTTPS encryption. 
                  Any data transmitted is encrypted in transit.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Essential Cookies</h4>
                <p className="text-muted-foreground text-sm mb-2">
                  We use essential cookies to remember your preferences and provide basic functionality:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Theme preferences (dark/light mode)</li>
                  <li>Language settings</li>
                  <li>Tool configuration preferences</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Analytics Cookies</h4>
                <p className="text-muted-foreground text-sm">
                  With your consent, we use analytics cookies to understand how our tools are used 
                  and improve the user experience. You can opt out at any time.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Advertising Cookies</h4>
                <p className="text-muted-foreground text-sm">
                  We may display ads to support our free services. Ad cookies help show relevant ads 
                  and measure ad performance. You can manage ad preferences in your browser settings.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Google Analytics</h4>
                <p className="text-muted-foreground text-sm">
                  We use Google Analytics to understand website usage. Google Analytics may collect 
                  information about your use of our website. You can opt out using Google's opt-out tools.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Google AdSense</h4>
                <p className="text-muted-foreground text-sm">
                  We may display ads through Google AdSense to support our free services. 
                  Google may use cookies to show relevant ads based on your interests.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Content Delivery Network (CDN)</h4>
                <p className="text-muted-foreground text-sm">
                  We use CDN services to deliver our website content faster. 
                  These services may log basic request information.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Your Rights and Choices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Your Rights Include:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                    <li>Access to your personal data</li>
                    <li>Correction of inaccurate data</li>
                    <li>Deletion of your data</li>
                    <li>Data portability</li>
                    <li>Objection to processing</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">How to Exercise Rights:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                    <li>Contact us at privacy@pixoratools.com</li>
                    <li>Use browser settings for cookies</li>
                    <li>Opt out of analytics tracking</li>
                    <li>Manage ad preferences</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal data:
              </p>
              
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <Shield className="h-4 w-4 text-green-600 mr-2" />
                  HTTPS encryption for all data transmission
                </li>
                <li className="flex items-center">
                  <Lock className="h-4 w-4 text-green-600 mr-2" />
                  Secure hosting infrastructure
                </li>
                <li className="flex items-center">
                  <Database className="h-4 w-4 text-green-600 mr-2" />
                  Regular security audits and updates
                </li>
                <li className="flex items-center">
                  <UserCheck className="h-4 w-4 text-green-600 mr-2" />
                  Access controls and authentication
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. International Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Our services are hosted globally to provide the best performance. When you use our services, 
                your data may be transferred to and processed in countries other than your own.
              </p>
              <p className="text-muted-foreground">
                We ensure that any international transfers comply with applicable data protection laws 
                and implement appropriate safeguards to protect your data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Our services are not directed to children under 13 years of age. We do not knowingly 
                collect personal information from children under 13.
              </p>
              <p className="text-muted-foreground">
                If you are a parent or guardian and believe your child has provided us with personal information, 
                please contact us so we can delete such information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
              <p className="text-muted-foreground">
                We encourage you to review this Privacy Policy periodically for any changes. 
                Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-blue-600 mr-2" />
                  <span>Email: privacy@pixoratools.com</span>
                </div>
                <div className="flex items-center">
                  <Globe className="h-4 w-4 text-blue-600 mr-2" />
                  <span>Website: https://pixoratools.com/contact</span>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <div>PixoraTools Inc.</div>
                    <div>123 Tech Street, Suite 100</div>
                    <div>San Francisco, CA 94105</div>
                    <div>United States</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GDPR and CCPA Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>12. Regional Privacy Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">European Union (GDPR)</h4>
                <p className="text-muted-foreground text-sm mb-2">
                  If you are located in the EU, you have additional rights under the General Data Protection Regulation:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Right to access your personal data</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure ("right to be forgotten")</li>
                  <li>Right to restrict processing</li>
                  <li>Right to data portability</li>
                  <li>Right to object to processing</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">California (CCPA)</h4>
                <p className="text-muted-foreground text-sm mb-2">
                  If you are a California resident, you have rights under the California Consumer Privacy Act:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Right to know what personal information is collected</li>
                  <li>Right to delete personal information</li>
                  <li>Right to opt-out of the sale of personal information</li>
                  <li>Right to non-discrimination for exercising privacy rights</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}