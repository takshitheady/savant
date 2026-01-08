'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { TraitSelector } from './trait-selector'
import { Loader2, Sparkles, Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  getBrandVoice,
  generateBrandVoicePrompt,
  saveBrandVoice,
  toggleBrandVoice
} from '@/actions/brand-voice'
import { useOnboarding } from '@/components/onboarding'
import type { PersonalityTraitId, BrandVoiceTraits } from '@/types/brand-voice'

export function BrandVoiceForm() {
  const { completeMilestone } = useOnboarding()
  const [selectedTraits, setSelectedTraits] = useState<PersonalityTraitId[]>([])
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [hasBrandVoice, setHasBrandVoice] = useState(false)

  // Load existing brand voice on mount
  useEffect(() => {
    async function loadBrandVoice() {
      const result = await getBrandVoice()
      if (result.success && result.data) {
        const traits = result.data.brand_voice_traits as BrandVoiceTraits | null
        setSelectedTraits(traits?.selectedTraits || [])
        setGeneratedPrompt(result.data.prompt || '')
        setIsActive(result.data.is_active ?? true)
        setHasBrandVoice(true)
      }
      setIsLoading(false)
    }
    loadBrandVoice()
  }, [])

  const handleGeneratePrompt = async () => {
    if (selectedTraits.length === 0) return

    setIsGenerating(true)
    setGenerateError(null)
    setSaveStatus('idle')

    const result = await generateBrandVoicePrompt(selectedTraits)

    if (result.success && result.prompt) {
      setGeneratedPrompt(result.prompt)
      setHasChanges(true)
    } else {
      setGenerateError(result.error || 'Failed to generate brand voice. Please try again.')
    }

    setIsGenerating(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    const traits: BrandVoiceTraits = { selectedTraits }
    const result = await saveBrandVoice(traits, generatedPrompt, isActive)
    if (result.success) {
      setHasChanges(false)
      setSaveStatus('success')
      setHasBrandVoice(true)
      // Track milestone
      await completeMilestone('brandVoiceConfigured')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } else {
      setSaveStatus('error')
    }
    setIsSaving(false)
  }

  const handleToggleActive = async (checked: boolean) => {
    setIsActive(checked)
    if (hasBrandVoice) {
      await toggleBrandVoice(checked)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Brand Voice Status</CardTitle>
              <CardDescription>
                Enable or disable your brand voice across all savants
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="brand-voice-active" className="text-sm font-medium">
                {isActive ? 'Active' : 'Inactive'}
              </Label>
              <Switch
                id="brand-voice-active"
                checked={isActive}
                onCheckedChange={handleToggleActive}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Trait Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Personality Traits</CardTitle>
          <CardDescription>
            Select the traits that define your brand's communication style
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TraitSelector
            selectedTraits={selectedTraits}
            onTraitsChange={(traits) => {
              setSelectedTraits(traits)
              setHasChanges(true)
              setSaveStatus('idle')
              setGenerateError(null)
            }}
          />

          <div className="mt-6 flex flex-col items-center">
            <Button
              onClick={handleGeneratePrompt}
              disabled={selectedTraits.length === 0 || isGenerating}
              size="lg"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Brand Voice
            </Button>
            {generateError && (
              <div className="mt-3 flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{generateError}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>Your Brand Voice</CardTitle>
          <CardDescription>
            This prompt will be applied to all your savants (unless individually disabled)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={generatedPrompt}
            onChange={(e) => {
              setGeneratedPrompt(e.target.value)
              setHasChanges(true)
              setSaveStatus('idle')
            }}
            placeholder="Generate a brand voice from your selected traits, or write your own..."
            className="min-h-[200px] resize-none"
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saveStatus === 'success' && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Brand voice saved!</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Failed to save. Please try again.</span>
                </>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || !generatedPrompt}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Brand Voice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium text-sm mb-2">How Brand Voice Works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Your brand voice is automatically applied to all new savants you create</li>
            <li>You can disable brand voice for specific savants when creating them</li>
            <li>Imported savants from the store don't use your brand voice by default</li>
            <li>Brand voice appears before each savant's individual system prompt</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
