'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface UploadDocumentResult {
  success: boolean
  error?: string
  documentId?: string
}

export async function uploadDocument(
  savantId: string,
  accountId: string,
  fileName: string,
  storagePath: string,
  fileSize: number,
  fileType: string
): Promise<UploadDocumentResult> {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Use admin client for database operations (bypasses RLS)
    const adminSupabase = createAdminClient()

    // Verify user is a member of this account
    const { data: membership } = await adminSupabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .single()

    if (!membership) {
      return { success: false, error: 'Not authorized for this account' }
    }

    // Verify savant belongs to this account
    const { data: savant } = await adminSupabase
      .from('savants')
      .select('id')
      .eq('id', savantId)
      .eq('account_id', accountId)
      .single()

    if (!savant) {
      return { success: false, error: 'Savant not found' }
    }

    // Insert document record using admin client
    const { data: docData, error: dbError } = await adminSupabase
      .from('documents')
      .insert({
        account_id: accountId,
        savant_id: savantId,
        name: fileName,
        file_path: storagePath,
        file_size: fileSize,
        file_type: fileType,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      console.error('[uploadDocument] Error inserting document:', dbError)
      return { success: false, error: dbError.message }
    }

    console.log('[uploadDocument] Document inserted:', docData.id)

    // Queue document for background processing (text extraction, chunking, embeddings)
    const { data: queueResult, error: queueError } = await adminSupabase.rpc(
      'queue_document_for_processing_admin',
      {
        p_document_id: docData.id,
        p_account_id: accountId,
        p_savant_id: savantId,
        p_storage_path: storagePath,
        p_mime_type: fileType
      }
    )

    if (queueError) {
      console.error('[uploadDocument] Error queueing for processing:', queueError)
      // Don't fail the upload - document is saved, processing can be retried
    } else {
      console.log('[uploadDocument] Document queued for processing, msg_id:', queueResult)
    }

    // Revalidate the savant page to show new document
    revalidatePath(`/savants/${savantId}`)

    return { success: true, documentId: docData.id }
  } catch (error) {
    console.error('Error in uploadDocument:', error)
    return { success: false, error: 'Failed to upload document' }
  }
}

export async function deleteDocument(
  documentId: string,
  savantId: string,
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Use admin client for database operations
    const adminSupabase = createAdminClient()

    // Verify user is a member of this account
    const { data: membership } = await adminSupabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .single()

    if (!membership) {
      return { success: false, error: 'Not authorized for this account' }
    }

    // Delete document
    const { error } = await adminSupabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('account_id', accountId)

    if (error) {
      console.error('Error deleting document:', error)
      return { success: false, error: error.message }
    }

    // Revalidate the savant page
    revalidatePath(`/savants/${savantId}`)

    return { success: true }
  } catch (error) {
    console.error('Error in deleteDocument:', error)
    return { success: false, error: 'Failed to delete document' }
  }
}
