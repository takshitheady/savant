import { FileText } from 'lucide-react'

export default function PromptsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-semibold">Account Prompts</h2>
        <p className="mt-2 text-muted-foreground">
          Manage account-level system prompts that apply to all your Savants.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Coming soon...
        </p>
      </div>
    </div>
  )
}
