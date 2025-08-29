import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Wrench, 
  Shield, 
  Zap, 
  Globe, 
  Users, 
  Award,
  CheckCircle,
  Star,
  Heart,
  Target,
  Lightbulb,
  Rocket
} from "lucide-react"
import Link from "next/link"

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#3b82f6',
  }
}

const features = [
  {
    icon: Zap,
    title: "Lightning Fast Processing",
    description: "All tools run locally in your browser for instant results without server delays. Process files in seconds, not minutes."
  },
  {
    icon: Shield,
    title: "100% Secure & Private",
    description: "Your files never leave your device. All processing happens locally in your browser, ensuring complete privacy and security."
  },
  {
    icon: Globe,
    title: "Works Everywhere",
    description: "No downloads or installations required. Access all tools from any device with a modern web browser."
  },
  {
    icon: Users,
    title: "Trusted by Millions",
    description: "Join over 2 million users worldwide who trust PixoraTools for their daily productivity tasks."
  }
]

const stats = [
  { number: "300+", label: "Professional Tools", icon: Wrench },
  { number: "2M+", label: "Monthly Users", icon: Users },
  { number: "50M+", label: "Files Processed", icon: CheckCircle },
  { number: "99.9%", label: "Uptime", icon: Award }
]

const team = [
  {
    name: "Alex Chen",
    role: "Founder & CEO",
    bio: "Former Google engineer with 10+ years in web technologies. Passionate about creating tools that make work easier.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Sarah Johnson",
    role: "Head of Product",
    bio: "UX designer turned product manager. Focuses on user experience and making complex tools simple to use.",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Michael Rodriguez",
    role: "Lead Developer",
    bio: "Full-stack developer specializing in performance optimization and browser technologies.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  }
]

const timeline = [
  {
    year: "2020",
    title: "The Beginning",
    description: "Started as a simple PDF merger tool to solve a personal problem with document management."
  },
  {
    year: "2021", 
    title: "Expansion",
    description: "Added image processing tools and reached 10,000 monthly users."
  },
  {
    year: "2022",
    title: "Growth",
    description: "Launched QR code tools and text processing utilities. Crossed 100,000 users."
  },
  {
    year: "2023",
    title: "Innovation",
    description: "Introduced AI-powered background removal and advanced image filters."
  },
  {
    year: "2024",
    title: "Scale",
    description: "Reached 2 million monthly users with 300+ professional tools across multiple domains."
  }
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800">About PixoraTools</Badge>
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-6">
            Empowering Productivity
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Through Innovation
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            We believe that powerful tools should be accessible to everyone. That's why we've created the most comprehensive 
            collection of professional web tools that work instantly in your browser, completely free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/">
                <Rocket className="h-5 w-5 mr-2" />
                Explore Tools
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">
                <Heart className="h-5 w-5 mr-2" />
                Get in Touch
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-6">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              To democratize access to professional-grade tools by making them available instantly in any web browser. 
              We eliminate the barriers of software installation, subscription fees, and complex interfaces that prevent 
              people from being productive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <Target className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  A world where anyone can access professional tools instantly, regardless of their device, 
                  operating system, or technical expertise. We envision a future where productivity tools 
                  are as accessible as web search.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Lightbulb className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>Our Values</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Privacy First</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Always Free Core Features</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />No Registration Required</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Open Source Friendly</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">Why Choose PixoraTools?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We've built the most comprehensive and user-friendly tool platform on the web
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">Our Journey</h2>
            <p className="text-lg text-muted-foreground">From a simple idea to serving millions of users worldwide</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-blue-200"></div>
              
              {timeline.map((item, index) => (
                <div key={index} className={`relative flex items-center mb-8 ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className={`w-5/12 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-blue-100 text-blue-800">{item.year}</Badge>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{item.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4">Meet Our Team</h2>
            <p className="text-lg text-muted-foreground">
              The passionate people behind PixoraTools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {team.map((member, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-4">
            Ready to boost your productivity?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join millions of users who trust PixoraTools for their daily tasks. 
            Start using our professional tools today, completely free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
              <Link href="/">
                <Star className="h-5 w-5 mr-2" />
                Get Started Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link href="/contact">
                Contact Us
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}