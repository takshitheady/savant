'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { getBrandVoice } from '@/actions/brand-voice'
import { Loader2, Check, Mic2, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import type { BrandVoice } from '@/types/brand-voice'

interface SavantPromptsProps {
  savantId: string
  accountId: string
  initialUseBrandVoice?: boolean
}

export function SavantPrompts({ savantId, accountId, initialUseBrandVoice }: SavantPromptsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [newPrompt, setNewPrompt] = useState('')
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null)
  const [useBrandVoice, setUseBrandVoice] = useState(initialUseBrandVoice ?? true)
  const [isLoadingBrandVoice, setIsLoadingBrandVoice] = useState(true)
  const [isTogglingBrandVoice, setIsTogglingBrandVoice] = useState(false)

  // Load current system prompt and brand voice when component mounts
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      // Load savant's system prompt and model_config
      const { data: savantData } = await supabase
        .from('savants')
        .select('system_prompt, model_config')
        .eq('id', savantId)
        .single()

      if (savantData?.system_prompt) {
        setCurrentPrompt(savantData.system_prompt)
        setNewPrompt(savantData.system_prompt)
      }

      // Get use_brand_voice from model_config
      const modelConfig = savantData?.model_config as { use_brand_voice?: boolean } | null
      if (modelConfig?.use_brand_voice !== undefined) {
        setUseBrandVoice(modelConfig.use_brand_voice)
      }

      // Load brand voice
      setIsLoadingBrandVoice(true)
      const brandVoiceResult = await getBrandVoice()
      if (brandVoiceResult.success && brandVoiceResult.data) {
        setBrandVoice(brandVoiceResult.data)
      }
      setIsLoadingBrandVoice(false)
    }
    loadData()
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
    } catch (error) {
      console.error('Error updating prompt:', error)
      alert('Failed to update prompt. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleToggleBrandVoice(checked: boolean) {
    setIsTogglingBrandVoice(true)
    setUseBrandVoice(checked)

    try {
      const supabase = createClient()

      // Get current model_config
      const { data: savantData } = await supabase
        .from('savants')
        .select('model_config')
        .eq('id', savantId)
        .single()

      const currentConfig = (savantData?.model_config as Record<string, unknown>) || {}

      // Update model_config with new use_brand_voice value
      const { error } = await supabase
        .from('savants')
        .update({
          model_config: {
            ...currentConfig,
            use_brand_voice: checked
          }
        })
        .eq('id', savantId)
        .eq('account_id', accountId)

      if (error) {
        throw error
      }

      router.refresh()
    } catch (error) {
      console.error('Error toggling brand voice:', error)
      setUseBrandVoice(!checked) // Revert on error
      alert('Failed to update brand voice setting. Please try again.')
    } finally {
      setIsTogglingBrandVoice(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* System Prompt Card */}
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

      {/* Brand Voice Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Mic2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Brand Voice</CardTitle>
                <CardDescription>
                  Account-level personality that applies to this Savant
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="use-brand-voice" className="text-sm">
                {useBrandVoice ? 'Enabled' : 'Disabled'}
              </Label>
              <Switch
                id="use-brand-voice"
                checked={useBrandVoice}
                onCheckedChange={handleToggleBrandVoice}
                disabled={isTogglingBrandVoice || !brandVoice}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingBrandVoice ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : brandVoice ? (
            <div className="space-y-4">
              {/* Status indicator */}
              <div className="flex items-center gap-2 text-sm">
                {useBrandVoice && brandVoice.is_active ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Brand voice is active for this Savant</span>
                  </>
                ) : useBrandVoice && !brandVoice.is_active ? (
                  <>
                    <XCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-600">Brand voice is globally disabled</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Brand voice is disabled for this Savant</span>
                  </>
                )}
              </div>

              {/* Brand voice preview */}
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {brandVoice.prompt}
                </p>
              </div>

              {/* Edit link */}
              <div className="flex justify-end">
                <Link href="/prompts">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Edit Brand Voice
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Mic2 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No brand voice configured yet
              </p>
              <Link href="/prompts">
                <Button variant="outline" size="sm">
                  <Mic2 className="mr-2 h-3 w-3" />
                  Set Up Brand Voice
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best Practices Card */}
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
