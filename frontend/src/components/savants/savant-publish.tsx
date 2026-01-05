'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Store,
  Globe,
  Lock,
  Loader2,
  Check,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { getCategories, publishSavantToStore, unpublishFromStore } from '@/actions/store'
import type { StoreCategory } from '@/types/database'

interface SavantPublishProps {
  savant: {
    id: string
    name: string
    description: string | null
    is_public: boolean | null
  }
}

export function SavantPublish({ savant }: SavantPublishProps) {
  const router = useRouter()
  const [isPublished, setIsPublished] = useState(savant.is_public || false)
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [tagline, setTagline] = useState('')
  const [longDescription, setLongDescription] = useState(savant.description || '')
  const [tags, setTags] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  const handlePublish = async () => {
    if (!selectedCategory) {
      setError('Please select a category')
      return
    }
    if (!tagline.trim()) {
      setError('Please enter a tagline')
      return
    }

    setIsLoading(true)
    setError('')

    const result = await publishSavantToStore(
      savant.id,
      selectedCategory,
      tagline.trim(),
      longDescription.trim() || undefined,
      tags.split(',').map((t) => t.trim()).filter(Boolean)
    )

    if (result.success) {
      setIsPublished(true)
      setSuccess('Published to store successfully!')
      router.refresh()
    } else {
      setError(result.error || 'Failed to publish')
    }

    setIsLoading(false)
  }

  const handleUnpublish = async () => {
    setIsLoading(true)
    setError('')

    const result = await unpublishFromStore(savant.id)

    if (result.success) {
      setIsPublished(false)
      setSuccess('Removed from store')
      router.refresh()
    } else {
      setError(result.error || 'Failed to unpublish')
    }

    setIsLoading(false)
  }

  if (isPublished) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-500" />
            <CardTitle>Published to Store</CardTitle>
          </div>
          <CardDescription>
            This savant is publicly available in the Savant Store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            <Check className="h-4 w-4" />
            <span>Your savant is live and can be discovered by others</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={`/store/savant/${savant.id}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Store
              </a>
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Unpublish
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-500">{success}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <CardTitle>Publish to Store</CardTitle>
        </div>
        <CardDescription>
          Share your savant with the community and let others import it
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning */}
        <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">What gets shared:</p>
            <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
              <li>System prompt and model configuration</li>
              <li>All uploaded documents and embeddings</li>
              <li>Your account name as the creator</li>
            </ul>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category *</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tagline *</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A short, catchy description (e.g., 'Your personal coding assistant')"
            maxLength={100}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">{tagline.length}/100 characters</p>
        </div>

        {/* Long Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Full Description</label>
          <textarea
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
            placeholder="Describe what your savant does, its capabilities, and best use cases..."
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="coding, python, assistant (comma-separated)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated tags to help users find your savant
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-500">{success}</p>
        )}

        <Button
          onClick={handlePublish}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Globe className="h-4 w-4 mr-2" />
          )}
          Publish to Store
        </Button>
      </CardContent>
    </Card>
  )
}
