import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Bot, Settings, FileText, MessageSquare, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { SavantSettings } from '@/components/savants/savant-settings'
import { SavantPrompts } from '@/components/savants/savant-prompts'
import { SavantDocuments } from '@/components/savants/savant-documents'

interface SavantPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SavantPage({ params }: SavantPageProps) {
  const { id } = await params
  console.log('[SavantPage] Loading savant:', id)

  const supabase = await createClient()

  // Get user's account
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('[SavantPage] User:', user?.id || 'NULL')

  if (!user) {
    console.log('[SavantPage] No user, redirecting to login')
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

  console.log('[SavantPage] Account member:', accountMember?.account_id || 'NULL', 'Error:', accountError?.message || 'none')

  if (accountError || !accountMember) {
    console.log('[SavantPage] No account member, redirecting to /savants')
    redirect('/savants')
  }

  const { data: savant, error } = await adminSupabase
    .from('savants')
    .select(`
      *,
      documents:documents(id, name, file_size, created_at)
    `)
    .eq('id', id)
    .eq('account_id', accountMember.account_id)
    .single()

  console.log('[SavantPage] Savant:', savant?.name || 'NULL', 'Error:', error?.message || 'none')

  if (error || !savant) {
    console.log('[SavantPage] Savant not found, returning 404. Error:', error)
    notFound()
  }

  // Get message count separately (also use admin client)
  const { count: messageCount } = await adminSupabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('savant_id', id)

  const documentCount = savant.documents?.length || 0
  const modelConfig = savant.model_config || {}
  const modelName = modelConfig.model || 'gpt-4o-mini'
  const temperature = modelConfig.temperature || 0.7

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{savant.name}</h2>
              <p className="text-muted-foreground">{savant.description || 'No description'}</p>
            </div>
          </div>
        </div>
        <Link href={`/savants/${savant.id}/chat`}>
          <Button size="lg">
            <MessageSquare className="mr-2 h-4 w-4" />
            Open Chat
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentCount}</div>
            <p className="text-xs text-muted-foreground">Training documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageCount}</div>
            <p className="text-xs text-muted-foreground">Total conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modelName}</div>
            <p className="text-xs text-muted-foreground">Temperature: {temperature}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>
                The core instructions that define your Savant's behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savant.system_prompt ? (
                <div className="rounded-lg bg-muted p-4">
                  <p className="whitespace-pre-wrap text-sm">{savant.system_prompt}</p>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  No system prompt set. Add one in the Settings tab.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest interactions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {(messageCount ?? 0) > 0 ? (
                  <p>{messageCount} messages exchanged</p>
                ) : (
                  <p>No messages yet. Start a conversation in the chat!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts">
          <SavantPrompts savantId={savant.id} accountId={accountMember!.account_id} />
        </TabsContent>

        <TabsContent value="documents">
          <SavantDocuments
            savantId={savant.id}
            accountId={accountMember!.account_id}
            initialDocuments={savant.documents || []}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SavantSettings savant={savant} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
