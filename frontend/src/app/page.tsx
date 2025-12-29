import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Zap, Lock, FileText, MessageSquare, Bot } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background">
        <div className="container px-4 flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            Savant
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container px-4 flex flex-col items-center gap-6 py-24 text-center md:py-32">
        <div className="flex max-w-[64rem] flex-col items-center gap-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Build AI Assistants
            <br />
            <span className="text-primary">Trained on Your Data</span>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Create powerful AI agents with custom knowledge bases, system prompts, and isolated
            vector stores. Deploy production-ready assistants in minutes with Savant.
          </p>
          <div className="flex gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-base">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-base">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 py-16">
        <div className="mx-auto max-w-[64rem]">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to build AI agents
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powered by Agno AgentOS for production-grade AI applications
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <Bot className="h-10 w-10 text-primary" />
                <CardTitle>Custom AI Agents</CardTitle>
                <CardDescription>
                  Create unlimited Savants with unique personalities and capabilities using custom
                  system prompts
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Database className="h-10 w-10 text-primary" />
                <CardTitle>Isolated Vector Stores</CardTitle>
                <CardDescription>
                  Each Savant has its own vector database for RAG, ensuring complete data
                  isolation and security
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Lock className="h-10 w-10 text-primary" />
                <CardTitle>Multi-Tenant Security</CardTitle>
                <CardDescription>
                  Row-level security ensures your data stays private with complete account
                  isolation
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary" />
                <CardTitle>Document Training</CardTitle>
                <CardDescription>
                  Upload your documents and train your Savants with your own knowledge base using
                  RAG
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-primary" />
                <CardTitle>Real-time Chat</CardTitle>
                <CardDescription>
                  Streaming chat interface with context-aware responses powered by your custom
                  prompts
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary" />
                <CardTitle>Production Ready</CardTitle>
                <CardDescription>
                  Built on Agno AgentOS with tracing, monitoring, and scalable architecture from
                  day one
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-16">
        <Card className="mx-auto max-w-[64rem] border-primary/50 bg-primary/5">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Ready to build your first Savant?</CardTitle>
            <CardDescription className="text-base">
              Join developers building the next generation of AI assistants
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/signup">
              <Button size="lg">Create Your Account</Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6">
        <div className="container px-4 flex flex-col items-center justify-between gap-4 md:flex-row">
          <span className="font-bold text-primary">Savant</span>
          <p className="text-sm text-muted-foreground">
            Powered by Agno AgentOS. Built for developers.
          </p>
        </div>
      </footer>
    </div>
  )
}
