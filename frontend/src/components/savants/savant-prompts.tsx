'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Check } from 'lucide-react'

interface SavantPromptsProps {
  savantId: string
  accountId: string
}

export function SavantPrompts({ savantId, accountId }: SavantPromptsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [newPrompt, setNewPrompt] = useState('')
  const [currentPrompt, setCurrentPrompt] = useState('')

  // Load current system prompt when component mounts
  useEffect(() => {
    async function loadPrompt() {
      const supabase = createClient()
      const { data } = await supabase
        .from('savants')
        .select('system_prompt')
        .eq('id', savantId)
        .single()

      if (data?.system_prompt) {
        setCurrentPrompt(data.system_prompt)
        setNewPrompt(data.system_prompt)
      }
    }
    loadPrompt()
  }, [savantId])

  async function handleCreatePrompt() {
    if (!newPrompt.trim()) return

    try {
      setIsLoading(true)

      const supabase = createClient()

      // Update the system_prompt column on the savants table
      const { error } = await supabase
        .from('savants')
        .update({ system_prompt: newPrompt })
        .eq('id', savantId)
        .eq('account_id', accountId)

      if (error) {
        throw error
      }

      setCurrentPrompt(newPrompt)
      router.refresh()
      alert('System prompt updated successfully!')
    } catch (error) {
      console.error('Error updating prompt:', error)
      alert('Failed to update prompt. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Define the personality, behavior, and capabilities of your Savant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="You are a helpful assistant that specializes in..."
            className="min-h-[200px] resize-none"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
          />
          {currentPrompt && (
            <div className="text-xs text-muted-foreground">
              Current prompt is set. Edit above to update it.
            </div>
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleCreatePrompt}
              disabled={isLoading || !newPrompt.trim() || newPrompt === currentPrompt}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {currentPrompt ? 'Update System Prompt' : 'Save System Prompt'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account-Level Prompts</CardTitle>
          <CardDescription>
            These prompts apply to all Savants in your account (coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Account-level prompts will be available in a future update.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>Be specific about the role and expertise of your Savant</li>
            <li>Define the tone and style of responses (formal, casual, technical, etc.)</li>
            <li>Specify any constraints or guidelines for responses</li>
            <li>Include examples of desired behavior when relevant</li>
            <li>Keep prompts concise but comprehensive</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
