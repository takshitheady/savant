import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStoreListing } from '@/actions/store'
import { ImportButton } from '@/components/store/import-button'
import {
  Bot,
  Download,
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Tag,
} from 'lucide-react'

interface SavantDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: SavantDetailPageProps) {
  const { id } = await params
  const listing = await getStoreListing(id)

  if (!listing) {
    return { title: 'Savant Not Found | Savant Store' }
  }

  return {
    title: `${listing.savants.name} | Savant Store`,
    description: listing.tagline || listing.savants.description,
  }
}

export default async function SavantDetailPage({ params }: SavantDetailPageProps) {
  const { id } = await params
  const listing = await getStoreListing(id)

  if (!listing) {
    notFound()
  }

  const savant = listing.savants
  const category = listing.store_categories
  const account = savant.accounts

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link
        href="/store"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Store
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Icon */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bot className="h-12 w-12" />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{savant.name}</h1>
              {listing.tagline && (
                <p className="mt-2 text-lg text-muted-foreground">{listing.tagline}</p>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Download className="h-4 w-4" />
              <span>{listing.import_count || 0} imports</span>
            </div>
          </div>

          {/* Meta */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>by {account.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              <span>{category.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Published {new Date(listing.published_at!).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Import Button */}
      <ImportButton savantId={savant.id} savantName={savant.name} />

      {/* Description */}
      {(listing.long_description || savant.description) && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">About</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p>{listing.long_description || savant.description}</p>
          </div>
        </section>
      )}

      {/* Tags */}
      {listing.tags && listing.tags.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {listing.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* What's Included */}
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">What's Included</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border p-4">
            <FileText className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-foreground">System Prompt</h3>
            <p className="text-sm text-muted-foreground">
              Complete personality and instructions
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <Bot className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-foreground">Model Settings</h3>
            <p className="text-sm text-muted-foreground">
              Optimized model configuration
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <Download className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-foreground">Knowledge Base</h3>
            <p className="text-sm text-muted-foreground">
              All documents and embeddings
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
