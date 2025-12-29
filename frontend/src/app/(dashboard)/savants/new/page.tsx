import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SavantForm } from '@/components/savants/savant-form'

export default function NewSavantPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create New Savant</h2>
        <p className="text-muted-foreground">
          Configure your AI assistant with custom settings and prompts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Savant Configuration</CardTitle>
          <CardDescription>
            Set up the basic details for your new AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SavantForm />
        </CardContent>
      </Card>
    </div>
  )
}
