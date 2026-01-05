import { Mic2 } from 'lucide-react'
import { BrandVoiceForm } from '@/components/brand-voice/brand-voice-form'

export const metadata = {
  title: 'Your Voice | Savant',
  description: 'Define your brand personality that applies to all your Savants',
}

export default function YourVoicePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mic2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Your Voice</h2>
            <p className="text-muted-foreground">
              Define your brand's personality that applies to all your Savants
            </p>
          </div>
        </div>
      </div>

      <BrandVoiceForm />
    </div>
  )
}
