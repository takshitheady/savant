'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { StoreCategory, StoreListingSearchResult } from '@/types/database'

// Get all active store categories
export async function getCategories(): Promise<StoreCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('store_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  return data || []
}

// Search store listings
export async function searchStoreListings(params: {
  searchQuery?: string
  categorySlug?: string
  minRating?: number
  limit?: number
  offset?: number
}): Promise<StoreListingSearchResult[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_store_listings', {
    p_search_query: params.searchQuery || null,
    p_category_slug: params.categorySlug || null,
    p_min_rating: params.minRating || 0,
    p_limit_count: params.limit || 20,
    p_offset_count: params.offset || 0,
  })

  if (error) {
    console.error('Error searching store listings:', error)
    return []
  }

  return data || []
}

// Get featured listings
export async function getFeaturedListings(): Promise<StoreListingSearchResult[]> {
  const supabase = await createClient()

  // Get listings that are featured
  const { data, error } = await supabase
    .from('store_listings')
    .select(`
      id,
      savant_id,
      tagline,
      long_description,
      tags,
      category_id,
      import_count,
      review_count,
      average_rating,
      published_at,
      savants!inner (
        id,
        name,
        description,
        account_id,
        is_public
      ),
      store_categories!inner (
        id,
        name,
        slug
      )
    `)
    .eq('is_featured', true)
    .eq('savants.is_public', true)
    .order('import_count', { ascending: false })
    .limit(6)

  if (error) {
    console.error('Error fetching featured listings:', error)
    return []
  }

  // Transform to match search result type
  return (data || []).map((item: any) => ({
    id: item.id,
    savant_id: item.savant_id,
    savant_name: item.savants.name,
    savant_description: item.savants.description,
    tagline: item.tagline,
    long_description: item.long_description,
    tags: item.tags || [],
    category_id: item.category_id,
    category_name: item.store_categories.name,
    category_slug: item.store_categories.slug,
    import_count: item.import_count || 0,
    review_count: item.review_count || 0,
    average_rating: item.average_rating || 0,
    creator_account_id: item.savants.account_id,
    creator_display_name: '', // Will be fetched separately if needed
    published_at: item.published_at,
  }))
}

// Get a single listing by savant ID
export async function getStoreListing(savantId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('store_listings')
    .select(`
      *,
      savants!inner (
        id,
        name,
        description,
        system_prompt,
        model_config,
        account_id,
        is_public,
        accounts!savants_account_id_fkey!inner (
          id,
          name
        )
      ),
      store_categories!inner (
        id,
        name,
        slug,
        icon
      )
    `)
    .eq('savant_id', savantId)
    .eq('savants.is_public', true)
    .single()

  if (error) {
    console.error('Error fetching store listing:', error)
    return null
  }

  return data
}

// Import a savant from the store
export async function importSavant(
  sourceSavantId: string,
  newName?: string
): Promise<{ success: boolean; savantId?: string; error?: string }> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get user's account
  const { data: accountMember, error: accountError } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .single()

  if (accountError || !accountMember) {
    return { success: false, error: 'No account found' }
  }

  // Clone the savant using the database function
  const { data, error } = await supabase.rpc('clone_savant_from_store', {
    p_source_savant_id: sourceSavantId,
    p_target_account_id: accountMember.account_id,
    p_target_user_id: user.id,
    p_new_name: newName || null,
  })

  if (error) {
    console.error('Error importing savant:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/savants')
  revalidatePath('/store')

  return { success: true, savantId: data }
}

// Publish a savant to the store
export async function publishSavantToStore(
  savantId: string,
  categoryId: string,
  tagline: string,
  longDescription?: string,
  tags?: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify user owns this savant
  const { data: savant, error: savantError } = await supabase
    .from('savants')
    .select('id, account_id')
    .eq('id', savantId)
    .single()

  if (savantError || !savant) {
    return { success: false, error: 'Savant not found' }
  }

  // Check if user is a member of the account
  const { data: membership, error: memberError } = await supabase
    .from('account_members')
    .select('id')
    .eq('account_id', savant.account_id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    return { success: false, error: 'Not authorized' }
  }

  // Update savant to public
  const { error: updateError } = await supabase
    .from('savants')
    .update({ is_public: true })
    .eq('id', savantId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Create or update store listing
  const { error: listingError } = await supabase
    .from('store_listings')
    .upsert({
      savant_id: savantId,
      category_id: categoryId,
      tagline,
      long_description: longDescription,
      tags: tags || [],
      published_at: new Date().toISOString(),
    }, {
      onConflict: 'savant_id'
    })

  if (listingError) {
    return { success: false, error: listingError.message }
  }

  // Update or create creator profile
  const { error: profileError } = await supabase
    .from('creator_profiles')
    .upsert({
      account_id: savant.account_id,
      total_savants_published: 1, // Will be updated by trigger in future
    }, {
      onConflict: 'account_id'
    })

  if (profileError) {
    console.error('Error updating creator profile:', profileError)
  }

  revalidatePath('/store')
  revalidatePath(`/savants/${savantId}`)

  return { success: true }
}

// Unpublish a savant from the store
export async function unpublishFromStore(savantId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify user owns this savant
  const { data: savant, error: savantError } = await supabase
    .from('savants')
    .select('id, account_id')
    .eq('id', savantId)
    .single()

  if (savantError || !savant) {
    return { success: false, error: 'Savant not found' }
  }

  // Check membership
  const { data: membership, error: memberError } = await supabase
    .from('account_members')
    .select('id')
    .eq('account_id', savant.account_id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    return { success: false, error: 'Not authorized' }
  }

  // Update savant to private
  const { error: updateError } = await supabase
    .from('savants')
    .update({ is_public: false })
    .eq('id', savantId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Delete store listing
  const { error: deleteError } = await supabase
    .from('store_listings')
    .delete()
    .eq('savant_id', savantId)

  if (deleteError) {
    console.error('Error deleting listing:', deleteError)
  }

  revalidatePath('/store')
  revalidatePath(`/savants/${savantId}`)

  return { success: true }
}

// Get store listing reviews
export async function getListingReviews(listingId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('store_reviews')
    .select('*')
    .eq('listing_id', listingId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reviews:', error)
    return []
  }

  return data || []
}

// Submit a review
export async function submitReview(
  listingId: string,
  rating: number,
  title?: string,
  content?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if user has imported this savant (verified import)
  const { data: listing } = await supabase
    .from('store_listings')
    .select('savant_id')
    .eq('id', listingId)
    .single()

  let isVerifiedImport = false
  if (listing) {
    const { data: importRecord } = await supabase
      .from('store_imports')
      .select('id')
      .eq('source_savant_id', listing.savant_id)
      .eq('imported_by_user_id', user.id)
      .single()

    isVerifiedImport = !!importRecord
  }

  const { error } = await supabase
    .from('store_reviews')
    .upsert({
      listing_id: listingId,
      user_id: user.id,
      rating,
      title,
      content,
      is_verified_import: isVerifiedImport,
    }, {
      onConflict: 'listing_id,user_id'
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/store')

  return { success: true }
}
