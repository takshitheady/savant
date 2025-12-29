import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Bot, FileText, MessageSquare, Plus, ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: accountMember } = await adminSupabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user!.id)
    .single()

  const accountId = accountMember?.account_id || ''

  // Get all stats in parallel
  const [savantsResult, documentsCount, messagesCount, recentSavants, recentMessages] = await Promise.all([
    adminSupabase
      .from('savants')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId),
    adminSupabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId),
    adminSupabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId),
    adminSupabase
      .from('savants')
      .select('id, name, description, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(5),
    adminSupabase
      .from('messages')
      .select('id, content, role, created_at, savant_id')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const savantsCount = savantsResult.count || 0
  const totalDocs = documentsCount.count || 0
  const totalMessages = messagesCount.count || 0
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your Savants
          </p>
        </div>
        <Link href="/savants/new">
          <Button className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            New Savant
          </Button>
        </Link>
      </div>

      {/* Stats - Clean inline style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span className="text-sm">Savants</span>
          </div>
          <p className="text-3xl font-semibold">{savantsCount}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Documents</span>
          </div>
          <p className="text-3xl font-semibold">{totalDocs}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm">Messages</span>
          </div>
          <p className="text-3xl font-semibold">{totalMessages}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Active</span>
          </div>
          <p className="text-3xl font-semibold">{savantsCount}</p>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Recent Savants */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Your Savants</h2>
            <Link href="/savants" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentSavants.data && recentSavants.data.length > 0 ? (
            <div className="space-y-2">
              {recentSavants.data.map((savant) => (
                <Link
                  key={savant.id}
                  href={`/savants/${savant.id}`}
                  className="flex items-center gap-4 rounded-xl p-4 bg-white hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{savant.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {savant.description || 'No description'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No Savants yet</p>
              <Link href="/savants/new">
                <Button size="sm" className="rounded-xl gap-2">
                  <Plus className="h-4 w-4" />
                  Create your first Savant
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Start */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-medium">Quick Start</h2>
          <div className="rounded-xl bg-gradient-to-br from-primary/5 via-amber-50/50 to-orange-50/30 p-6 space-y-5">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Create a Savant</p>
                  <p className="text-xs text-muted-foreground">
                    Define your AI assistant's purpose
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Upload Documents</p>
                  <p className="text-xs text-muted-foreground">
                    Add PDFs to build knowledge
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Start Chatting</p>
                  <p className="text-xs text-muted-foreground">
                    Ask questions from your docs
                  </p>
                </div>
              </div>
            </div>

            <Link href="/savants/new" className="block">
              <Button className="w-full rounded-xl gap-2">
                <Plus className="h-4 w-4" />
                Create Savant
              </Button>
            </Link>
          </div>

          {/* Recent Activity */}
          {recentMessages.data && recentMessages.data.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Activity</h3>
              <div className="space-y-2">
                {recentMessages.data.slice(0, 3).map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <p className="text-muted-foreground truncate">
                      {msg.role === 'user' ? 'You: ' : 'AI: '}
                      {msg.content.slice(0, 50)}...
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
