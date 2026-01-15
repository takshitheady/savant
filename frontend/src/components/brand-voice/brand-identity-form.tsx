'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import { BRAND_PILLAR_PRESETS, VOICE_STYLE_PRESETS, type BrandIdentity } from '@/types/brand-voice'
import { cn } from '@/lib/utils'

interface BrandIdentityFormProps {
  values: BrandIdentity
  onChange: (values: BrandIdentity) => void
  disabled?: boolean
}

export function BrandIdentityForm({ values, onChange, disabled }: BrandIdentityFormProps) {
  const [newPillar, setNewPillar] = useState('')

  const pillars = values.brandPillars || []

  const addPillar = () => {
    if (!newPillar.trim() || pillars.length >= 5) return
    onChange({
      ...values,
      brandPillars: [...pillars, newPillar.trim()],
    })
    setNewPillar('')
  }

  const removePillar = (index: number) => {
    onChange({
      ...values,
      brandPillars: pillars.filter((_, i) => i !== index),
    })
  }

  const updateField = <K extends keyof BrandIdentity>(field: K, value: BrandIdentity[K]) => {
    onChange({ ...values, [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* Brand Pillars */}
      <div className="space-y-2">
        <Label>Brand Pillars (3-5 core values)</Label>

        {/* Suggestions */}
        {pillars.length < 5 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Suggestions:</span>
            <div className="flex flex-wrap gap-1.5">
              {BRAND_PILLAR_PRESETS.filter(p => !pillars.includes(p)).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (pillars.length < 5) {
                      onChange({
                        ...values,
                        brandPillars: [...pillars, preset],
                      })
                    }
                  }}
                  disabled={disabled || pillars.length >= 5}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    "bg-muted text-muted-foreground",
                    "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Pillars */}
        <div className="flex flex-wrap gap-2 mt-2">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-full text-sm",
                "bg-primary/10 text-primary"
              )}
            >
              <span>{pillar}</span>
              <button
                type="button"
                onClick={() => removePillar(index)}
                disabled={disabled}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Custom Input */}
        {pillars.length < 5 && (
          <div className="flex gap-2 mt-2">
            <Input
              value={newPillar}
              onChange={(e) => setNewPillar(e.target.value)}
              placeholder="Or type your own..."
              disabled={disabled}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPillar())}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPillar}
              disabled={disabled || !newPillar.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {pillars.length}/5 pillars added
        </p>
      </div>

      {/* Voice Description */}
      <div className="space-y-2">
        <Label htmlFor="voiceDescription">How do you want to sound?</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {VOICE_STYLE_PRESETS.map((preset) => {
            const isSelected = values.voiceDescription === preset.value
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => updateField('voiceDescription', preset.value)}
                disabled={disabled}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        <Textarea
          id="voiceDescription"
          value={values.voiceDescription || ''}
          onChange={(e) => updateField('voiceDescription', e.target.value)}
          placeholder="Or describe your own voice style..."
          disabled={disabled}
          className="min-h-[60px] resize-none"
        />
      </div>

      {/* Differentiators */}
      <div className="space-y-2">
        <Label htmlFor="differentiators">What makes you different?</Label>
        <Textarea
          id="differentiators"
          value={values.differentiators || ''}
          onChange={(e) => updateField('differentiators', e.target.value)}
          placeholder="What sets your brand apart from competitors?"
          disabled={disabled}
          className="min-h-[60px] resize-none"
        />
      </div>

      {/* Past Campaigns */}
      <div className="space-y-2">
        <Label htmlFor="pastCampaigns">Past campaigns & learnings</Label>
        <Textarea
          id="pastCampaigns"
          value={values.pastCampaigns || ''}
          onChange={(e) => updateField('pastCampaigns', e.target.value)}
          placeholder="What messaging has worked or not worked in the past?"
          disabled={disabled}
          className="min-h-[60px] resize-none"
        />
      </div>

      {/* Messaging Restrictions */}
      <div className="space-y-2">
        <Label htmlFor="messagingRestrictions">Messaging restrictions</Label>
        <Textarea
          id="messagingRestrictions"
          value={values.messagingRestrictions || ''}
          onChange={(e) => updateField('messagingRestrictions', e.target.value)}
          placeholder="Any legal, policy, or brand constraints on messaging?"
          disabled={disabled}
          className="min-h-[60px] resize-none"
        />
      </div>
    </div>
  )
}
