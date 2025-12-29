import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-semibold">Settings</h2>
        <p className="mt-2 text-muted-foreground">
          Configure your account preferences and settings.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Coming soon...
        </p>
      </div>
    </div>
  )
}
