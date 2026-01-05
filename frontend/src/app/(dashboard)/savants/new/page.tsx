import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SavantForm } from '@/components/savants/savant-form'
import { Bot, FileText, Sparkles, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Create New Savant | Savant',
  description: 'Create and configure your new AI assistant',
}

export default function NewSavantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Savant</h1>
            <p className="text-muted-foreground">
              Build your custom AI assistant in just a few steps
            </p>
          </div>
        </div>
      </div>

      {/* Steps Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            1
          </div>
          <div>
            <p className="font-medium text-sm">Configure</p>
            <p className="text-xs text-muted-foreground">Name & model</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4 opacity-60">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
            2
          </div>
          <div>
            <p className="font-medium text-sm">Add Documents</p>
            <p className="text-xs text-muted-foreground">Train with data</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4 opacity-60">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
            3
          </div>
          <div>
            <p className="font-medium text-sm">Start Chatting</p>
            <p className="text-xs text-muted-foreground">Test & refine</p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Savant Configuration
          </CardTitle>
          <CardDescription>
            Set up the basic details and behavior of your AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SavantForm />
        </CardContent>
      </Card>

      {/* Document Upload Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Training Documents</h3>
              <p className="text-sm text-muted-foreground">
                After creating your Savant, you can upload PDFs, text files, and documents to train it
                with your custom knowledge. Your Savant will use RAG (Retrieval-Augmented Generation)
                to provide accurate, context-aware responses based on your documents.
              </p>
              <div className="flex items-center gap-1 pt-2 text-sm text-primary">
                <span>Available after creation</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
