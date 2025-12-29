'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, FileText, Trash2, Download } from 'lucide-react'
import { uploadDocument, deleteDocument } from '@/actions/documents'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Document {
  id: string
  name: string
  file_size: number
  created_at: string
}

interface SavantDocumentsProps {
  savantId: string
  accountId: string
  initialDocuments: Document[]
}

export function SavantDocuments({
  savantId,
  accountId,
  initialDocuments,
}: SavantDocumentsProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      setIsUploading(true)
      setUploadProgress(0)

      const supabase = createClient()

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileName = `${savantId}/${Date.now()}-${file.name}`

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file)

        if (uploadError) {
          throw uploadError
        }

        // Create document record using server action (bypasses RLS)
        const result = await uploadDocument(
          savantId,
          accountId,
          file.name,
          uploadData.path,
          file.size,
          file.type
        )

        if (!result.success) {
          throw new Error(result.error || 'Failed to create document record')
        }

        setUploadProgress(((i + 1) / files.length) * 100)
      }

      // Reset file input
      event.target.value = ''
      router.refresh()
    } catch (error) {
      console.error('Error uploading files:', error)
      alert('Failed to upload files. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleDeleteDocument(documentId: string) {
    try {
      const result = await deleteDocument(documentId, savantId, accountId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete document')
      }

      router.refresh()
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document. Please try again.')
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Train your Savant with your own documents using RAG (Retrieval-Augmented Generation)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              multiple
              accept=".pdf,.txt,.md,.doc,.docx"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="flex-1"
            />
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{Math.round(uploadProgress)}%</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Supported formats: PDF, TXT, MD, DOC, DOCX. Maximum file size: 10MB
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents ({initialDocuments.length})</CardTitle>
          <CardDescription>Manage your training documents</CardDescription>
        </CardHeader>
        <CardContent>
          {initialDocuments.length > 0 ? (
            <div className="space-y-2">
              {initialDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)} •{' '}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{doc.name}"? This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              No documents uploaded yet. Upload your first document to start training your Savant.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>Upload documents to create a custom knowledge base for your Savant</li>
            <li>Documents are automatically chunked and embedded using OpenAI embeddings</li>
            <li>When you chat, relevant chunks are retrieved using vector similarity search</li>
            <li>The Savant uses this context to provide accurate, knowledge-based responses</li>
            <li>Each Savant has its own isolated vector store for complete data privacy</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
