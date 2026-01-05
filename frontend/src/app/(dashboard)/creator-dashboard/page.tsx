import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Star, Bot, TrendingUp, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Creator Dashboard | Savant',
  description: 'View your published savants and analytics',
}

async function getCreatorStats(accountId: string) {
  const supabase = await createClient()

  // Get creator profile
  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('account_id', accountId)
    .single()

  // Get published savants with stats
  const { data: listings } = await supabase
    .from('store_listings')
    .select(`
      *,
      savants!inner (
        id,
        name,
        description,
        account_id
      )
    `)
    .eq('savants.account_id', accountId)

  // Get recent imports
  const { data: recentImports } = await supabase
    .from('store_imports')
    .select(`
      *,
      savants!source_savant_id (
        name,
        account_id
      )
    `)
    .eq('savants.account_id', accountId)
    .order('import_timestamp', { ascending: false })
    .limit(10)

  return {
    profile,
    listings: listings || [],
    recentImports: recentImports || [],
    totalImports: profile?.total_imports || 0,
    totalPublished: listings?.length || 0,
    averageRating: profile?.average_rating || 0,
  }
}

export default async function CreatorDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: accountMember } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .single()

  if (!accountMember) {
    redirect('/dashboard')
  }

  const stats = await getCreatorStats(accountMember.account_id)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Creator Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Track your published savants and see how they're performing
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Savants</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPublished}</div>
            <p className="text-xs text-muted-foreground">Available in the store</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Imports</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalImports}</div>
            <p className="text-xs text-muted-foreground">Times your savants were imported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Across all savants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.recentImports.length > 0 ? '+' + stats.recentImports.length : '0'}
            </div>
            <p className="text-xs text-muted-foreground">Recent imports</p>
          </CardContent>
        </Card>
      </div>

      {/* Published Savants */}
      <Card>
        <CardHeader>
          <CardTitle>Your Published Savants</CardTitle>
          <CardDescription>
            Manage your savants in the store
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.listings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No published savants yet</p>
              <p className="text-sm mt-1">
                Go to any of your savants and click "Publish" to share it with the community
              </p>
              <Link
                href="/savants"
                className="inline-flex items-center gap-1 mt-4 text-primary hover:underline"
              >
                View your savants
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.listings.map((listing: any) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{listing.savants.name}</h3>
                      <p className="text-sm text-muted-foreground">{listing.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Download className="h-4 w-4" />
                      <span>{listing.import_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{listing.average_rating?.toFixed(1) || '0.0'}</span>
                    </div>
                    <Link
                      href={`/store/savant/${listing.savant_id}`}
                      className="text-primary hover:underline"
                    >
                      View in Store
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>
            Recent users who imported your savants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentImports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No imports yet</p>
              <p className="text-sm mt-1">
                When users import your savants, you'll see the activity here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentImports.map((importRecord: any) => (
                <div
                  key={importRecord.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Someone imported <span className="font-medium">{importRecord.savants?.name}</span>
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(importRecord.import_timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
