'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Building2, Palette, Sliders } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BusinessInfoForm } from './business-info-form'
import { BrandIdentityForm } from './brand-identity-form'
import { VoiceDimensions } from './voice-dimensions'
import type {
  BrandVoiceAdvanced,
  BusinessInfo,
  BrandIdentity,
  VoiceDimensionValues,
  WebsiteAnalysis
} from '@/types/brand-voice'
import { cn } from '@/lib/utils'

interface AdvancedSectionProps {
  values: BrandVoiceAdvanced
  onChange: (values: BrandVoiceAdvanced) => void
  disabled?: boolean
}

type SectionId = 'business' | 'identity' | 'dimensions'

export function AdvancedSection({ values, onChange, disabled }: AdvancedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [openSection, setOpenSection] = useState<SectionId | null>(null)

  // Calculate completion status
  const businessComplete = !!(values.businessInfo?.businessName || values.businessInfo?.websiteUrl)
  const identityComplete = !!(values.brandIdentity?.brandPillars?.length || values.brandIdentity?.voiceDescription)
  const dimensionsComplete = Object.keys(values.voiceDimensions || {}).some(
    k => k !== 'dimensionNotes' && values.voiceDimensions?.[k as keyof VoiceDimensionValues]
  )

  const completedCount = [businessComplete, identityComplete, dimensionsComplete].filter(Boolean).length

  const toggleSection = (sectionId: SectionId) => {
    setOpenSection(openSection === sectionId ? null : sectionId)
  }

  const handleBusinessChange = (businessInfo: BusinessInfo) => {
    onChange({ ...values, businessInfo })
  }

  const handleIdentityChange = (brandIdentity: BrandIdentity) => {
    onChange({ ...values, brandIdentity })
  }

  const handleDimensionsChange = (voiceDimensions: VoiceDimensionValues) => {
    onChange({ ...values, voiceDimensions })
  }

  const handleWebsiteAnalysis = (websiteAnalysis: WebsiteAnalysis) => {
    onChange({ ...values, websiteAnalysis })
  }

  return (
    <Card className="mt-6" data-tour="advanced-brand-voice">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-base">Advanced Options</CardTitle>
              <CardDescription>
                Add more detail about your brand for richer voice generation
              </CardDescription>
            </div>
          </div>
          {completedCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {completedCount}/3 sections
            </span>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          {/* Business Information Section */}
          <div className={cn(
            "rounded-lg border transition-colors",
            openSection === 'business' ? "border-primary/50" : "border-border"
          )}>
            <button
              type="button"
              onClick={() => toggleSection('business')}
              disabled={disabled}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <Building2 className={cn(
                  "h-5 w-5",
                  businessComplete ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <div className="font-medium text-sm">Business Information</div>
                  <div className="text-xs text-muted-foreground">Name, website, category</div>
                </div>
              </div>
              {openSection === 'business' ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {openSection === 'business' && (
              <div className="px-4 pb-4">
                <BusinessInfoForm
                  values={values.businessInfo || {}}
                  onChange={handleBusinessChange}
                  websiteAnalysis={values.websiteAnalysis}
                  onWebsiteAnalysis={handleWebsiteAnalysis}
                  disabled={disabled}
                />
              </div>
            )}
          </div>

          {/* Brand Identity Section */}
          <div className={cn(
            "rounded-lg border transition-colors",
            openSection === 'identity' ? "border-primary/50" : "border-border"
          )}>
            <button
              type="button"
              onClick={() => toggleSection('identity')}
              disabled={disabled}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <Palette className={cn(
                  "h-5 w-5",
                  identityComplete ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <div className="font-medium text-sm">Brand Identity</div>
                  <div className="text-xs text-muted-foreground">Values, differentiators, restrictions</div>
                </div>
              </div>
              {openSection === 'identity' ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {openSection === 'identity' && (
              <div className="px-4 pb-4">
                <BrandIdentityForm
                  values={values.brandIdentity || {}}
                  onChange={handleIdentityChange}
                  disabled={disabled}
                />
              </div>
            )}
          </div>

          {/* Voice Dimensions Section */}
          <div className={cn(
            "rounded-lg border transition-colors",
            openSection === 'dimensions' ? "border-primary/50" : "border-border"
          )}>
            <button
              type="button"
              onClick={() => toggleSection('dimensions')}
              disabled={disabled}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <Sliders className={cn(
                  "h-5 w-5",
                  dimensionsComplete ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <div className="font-medium text-sm">Voice Dimensions</div>
                  <div className="text-xs text-muted-foreground">Casual vs formal, playful vs serious</div>
                </div>
              </div>
              {openSection === 'dimensions' ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {openSection === 'dimensions' && (
              <div className="px-4 pb-4">
                <VoiceDimensions
                  values={values.voiceDimensions || {}}
                  onChange={handleDimensionsChange}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
