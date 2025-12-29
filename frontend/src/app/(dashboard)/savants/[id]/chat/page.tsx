import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings } from 'lucide-react'
import Link from 'next/link'

interface ChatPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get user's account
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use admin client for all queries (bypasses RLS since auth.uid() is NULL in server context)
  // Authorization is ensured by checking user_id and account_id matches
  const adminSupabase = createAdminClient()

  const { data: accountMember, error: accountError } = await adminSupabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .single()

  if (accountError || !accountMember) {
    redirect('/savants')
  }

  const { data: savant, error } = await adminSupabase
    .from('savants')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountMember.account_id)
    .single()

  if (error || !savant) {
    notFound()
  }

  // Get messages for this savant (also use admin client)
  const { data: messages } = await adminSupabase
    .from('messages')
    .select('*')
    .eq('savant_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href={`/savants/${savant.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-semibold">{savant.name}</h2>
            <p className="text-sm text-muted-foreground">{savant.description || 'AI Assistant'}</p>
          </div>
        </div>
        <Link href={`/savants/${savant.id}`}>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </Link>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          savantId={savant.id}
          savantName={savant.name}
          initialMessages={messages || []}
          accountId={accountMember.account_id}
        />
      </div>
    </div>
  )
}
