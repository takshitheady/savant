import { Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RestartTourButton } from '@/components/onboarding/restart-tour-button'

export const metadata = {
  title: 'Settings | Savant',
  description: 'Configure your account preferences and settings',
}

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your account preferences and settings
        </p>
      </div>

      {/* Onboarding Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Onboarding
          </CardTitle>
          <CardDescription>
            Restart the welcome tour to learn about Savant's features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Welcome Tour</p>
              <p className="text-sm text-muted-foreground">
                Take a guided tour of all the key features
              </p>
            </div>
            <RestartTourButton />
          </div>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your account settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            More account settings coming soon...
          </p>
        </CardContent>
      </Card>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage API keys for external integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            API key management coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
