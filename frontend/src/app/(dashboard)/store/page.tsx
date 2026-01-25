import { Suspense } from 'react'
import { getCategories, searchStoreListings, getFeaturedListings } from '@/actions/store'
import { CategoryNav } from '@/components/store/category-nav'
import { StoreSearch } from '@/components/store/store-search'
import { SavantCard } from '@/components/store/savant-card'
import { MilestoneTracker } from '@/components/onboarding'
import { Sparkles, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Official Savants | Savant',
  description: 'Discover and import official AI assistants created by Heady',
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  )
}

async function FeaturedSection() {
  const featured = await getFeaturedListings()

  if (featured.length === 0) return null

  // Get user's update status for imported savants
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  let updateStatusMap: Record<string, { current_version: number, latest_version: number, update_available: boolean }> = {}

  if (user) {
    const { data: updateStatuses } = await adminSupabase
      .from('savant_update_status')
      .select('template_id, current_version, latest_version, update_available')
      .eq('account_id', (await adminSupabase.from('account_members').select('account_id').eq('user_id', user.id).single()).data?.account_id)

    if (updateStatuses) {
      updateStatuses.forEach(status => {
        updateStatusMap[status.template_id] = status
      })
    }
  }

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-yellow-500" />
        <h2 className="text-xl font-semibold text-foreground">Featured Savants</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((listing) => {
          const updateStatus = updateStatusMap[listing.savant_id]
          return (
            <SavantCard
              key={listing.id}
              listing={{
                ...listing,
                template_version: (listing as any).savants?.version,
                user_current_version: updateStatus?.current_version,
                has_update: updateStatus?.update_available || false,
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

async function AllListingsSection() {
  const listings = await searchStoreListings({ limit: 20 })

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Coming soon</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">
          Official Savants created by Heady will appear here. Check back soon!
        </p>
      </div>
    )
  }

  // Get user's update status for imported savants
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  let updateStatusMap: Record<string, { current_version: number, latest_version: number, update_available: boolean }> = {}

  if (user) {
    const accountMember = await adminSupabase.from('account_members').select('account_id').eq('user_id', user.id).single()
    if (accountMember.data) {
      const { data: updateStatuses } = await adminSupabase
        .from('savant_update_status')
        .select('template_id, current_version, latest_version, update_available')
        .eq('account_id', accountMember.data.account_id)

      if (updateStatuses) {
        updateStatuses.forEach(status => {
          updateStatusMap[status.template_id] = status
        })
      }
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">All Savants</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          const updateStatus = updateStatusMap[listing.savant_id]
          return (
            <SavantCard
              key={listing.id}
              listing={{
                ...listing,
                template_version: (listing as any).savants?.version,
                user_current_version: updateStatus?.current_version,
                has_update: updateStatus?.update_available || false,
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

export default async function StorePage() {
  const categories = await getCategories()

  return (
    <div className="space-y-8">
      {/* Track store visit milestone */}
      <MilestoneTracker milestone="storeExplored" />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Official Savants</h1>
        <p className="mt-2 text-muted-foreground">
          Discover and import official AI assistants created by Heady
        </p>
      </div>

      {/* Search */}
      <StoreSearch className="max-w-md" />

      {/* Categories */}
      <CategoryNav categories={categories} />

      {/* Featured */}
      <Suspense fallback={<LoadingGrid />}>
        <FeaturedSection />
      </Suspense>

      {/* All Listings */}
      <Suspense fallback={<LoadingGrid />}>
        <AllListingsSection />
      </Suspense>
    </div>
  )
}
