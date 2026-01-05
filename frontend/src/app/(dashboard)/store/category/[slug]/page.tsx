import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getCategories, searchStoreListings } from '@/actions/store'
import { CategoryNav } from '@/components/store/category-nav'
import { StoreSearch } from '@/components/store/store-search'
import { SavantCard } from '@/components/store/savant-card'
import { FolderOpen } from 'lucide-react'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params
  const categories = await getCategories()
  const category = categories.find((c) => c.slug === slug)

  return {
    title: category ? `${category.name} | Savant Store` : 'Category | Savant Store',
    description: category?.description || 'Browse savants in this category',
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

async function CategoryListings({ slug }: { slug: string }) {
  const listings = await searchStoreListings({ categorySlug: slug, limit: 30 })

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No savants in this category</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">
          Be the first to publish a savant in this category!
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <SavantCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const categories = await getCategories()
  const category = categories.find((c) => c.slug === slug)

  if (!category) {
    notFound()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
      </div>

      {/* Search */}
      <StoreSearch className="max-w-md" />

      {/* Categories */}
      <CategoryNav categories={categories} activeCategory={slug} />

      {/* Listings */}
      <Suspense fallback={<LoadingGrid />}>
        <CategoryListings slug={slug} />
      </Suspense>
    </div>
  )
}
