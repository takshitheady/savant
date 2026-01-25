import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Plus, FileText, MessageSquare, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function SavantsPage() {
  const supabase = await createClient()

  // Get user's account
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Use admin client for queries (bypasses RLS)
  const adminSupabase = createAdminClient()

  const { data: accountMember } = await adminSupabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user!.id)
    .single()

  // Check if user is platform admin
  const { data: isAdmin } = await adminSupabase
    .rpc('is_platform_admin', { check_user_id: user!.id })

  // Get all savants for this account
  const { data: savants } = await adminSupabase
    .from('savants')
    .select(`
      id,
      name,
      description,
      model_config,
      created_at
    `)
    .eq('account_id', accountMember?.account_id || '')
    .order('created_at', { ascending: false })

  // Get counts for each savant
  const savantsWithCounts = await Promise.all(
    (savants || []).map(async (savant) => {
      const { count: documentsCount } = await adminSupabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('savant_id', savant.id)

      const { count: messagesCount } = await adminSupabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('savant_id', savant.id)

      return {
        ...savant,
        documents: [{ count: documentsCount || 0 }],
        messages: [{ count: messagesCount || 0 }]
      }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Savants</h2>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Manage your AI assistants and their configurations'
              : 'Manage your imported AI assistants. Browse the Store to import more.'
            }
          </p>
        </div>
        {isAdmin && (
          <Link href="/savants/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Savant
            </Button>
          </Link>
        )}
      </div>

      {savantsWithCounts && savantsWithCounts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {savantsWithCounts.map((savant) => (
            <Card key={savant.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Bot className="h-10 w-10 text-primary" />
                  <div className="text-xs text-muted-foreground">
                    {new Date(savant.created_at).toLocaleDateString()}
                  </div>
                </div>
                <CardTitle className="mt-4">{savant.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {savant.description || 'No description provided'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{savant.documents?.[0]?.count || 0} documents</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>{savant.messages?.[0]?.count || 0} messages</span>
                  </div>
                  <div className="mt-4 rounded-md bg-muted px-3 py-2">
                    <div className="text-xs text-muted-foreground">Model</div>
                    <div className="font-medium">{savant.model_config?.model || 'gpt-4o-mini'}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Link href={`/savants/${savant.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Configure
                  </Button>
                </Link>
                <Link href={`/savants/${savant.id}/chat`} className="flex-1">
                  <Button className="w-full">Chat</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Bot className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle>No Savants yet</CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Get started by creating your first AI assistant'
                : 'Import your first Savant from the Official Store'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            {isAdmin ? (
              <Link href="/savants/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Savant
                </Button>
              </Link>
            ) : (
              <Link href="/store">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Browse Official Store
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
