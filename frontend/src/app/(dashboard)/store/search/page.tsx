import { Suspense } from 'react'
import { getCategories, searchStoreListings } from '@/actions/store'
import { CategoryNav } from '@/components/store/category-nav'
import { StoreSearch } from '@/components/store/store-search'
import { SavantCard } from '@/components/store/savant-card'
import { Search } from 'lucide-react'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  return {
    title: q ? `Search: ${q} | Savant Store` : 'Search | Savant Store',
    description: 'Search for AI assistants in the Savant Store',
  }
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

async function SearchResults({ query }: { query: string }) {
  const listings = await searchStoreListings({ searchQuery: query, limit: 30 })

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No results found</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">
          Try a different search term or browse by category
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Found {listings.length} result{listings.length !== 1 ? 's' : ''} for "{query}"
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <SavantCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams
  const categories = await getCategories()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Search Results</h1>
        <p className="mt-2 text-muted-foreground">
          Find the perfect AI assistant for your needs
        </p>
      </div>

      {/* Search */}
      <StoreSearch defaultValue={q} className="max-w-md" />

      {/* Categories */}
      <CategoryNav categories={categories} />

      {/* Results */}
      <Suspense fallback={<LoadingGrid />}>
        <SearchResults query={q} />
      </Suspense>
    </div>
  )
}
