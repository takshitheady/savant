import { Suspense } from 'react'
import { getCategories, searchStoreListings, getFeaturedListings } from '@/actions/store'
import { CategoryNav } from '@/components/store/category-nav'
import { StoreSearch } from '@/components/store/store-search'
import { SavantCard } from '@/components/store/savant-card'
import { Sparkles, TrendingUp } from 'lucide-react'

export const metadata = {
  title: 'Store | Savant',
  description: 'Discover and import AI assistants created by the community',
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

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-yellow-500" />
        <h2 className="text-xl font-semibold text-foreground">Featured Savants</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((listing) => (
          <SavantCard key={listing.id} listing={listing} />
        ))}
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
        <h3 className="text-lg font-semibold text-foreground">No savants yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">
          Be the first to publish a savant to the store! Go to any of your savants and click "Publish to Store".
        </p>
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">All Savants</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <SavantCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  )
}

export default async function StorePage() {
  const categories = await getCategories()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Savant Store</h1>
        <p className="mt-2 text-muted-foreground">
          Discover and import AI assistants created by the community
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
