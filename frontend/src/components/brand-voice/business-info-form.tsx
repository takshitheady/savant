'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Globe, CheckCircle2, AlertCircle } from 'lucide-react'
import { BUSINESS_CATEGORIES, LOCATION_PRESETS, CUSTOMER_TYPE_PRESETS, type BusinessInfo, type WebsiteAnalysis } from '@/types/brand-voice'
import { analyzeWebsite } from '@/actions/brand-voice'
import { cn } from '@/lib/utils'

interface BusinessInfoFormProps {
  values: BusinessInfo
  onChange: (values: BusinessInfo) => void
  websiteAnalysis?: WebsiteAnalysis
  onWebsiteAnalysis: (analysis: WebsiteAnalysis) => void
  disabled?: boolean
}

export function BusinessInfoForm({
  values,
  onChange,
  websiteAnalysis,
  onWebsiteAnalysis,
  disabled
}: BusinessInfoFormProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const handleAnalyzeWebsite = async () => {
    if (!values.websiteUrl) return

    setIsAnalyzing(true)
    setAnalyzeError(null)

    try {
      const result = await analyzeWebsite(values.websiteUrl)
      if (result.success) {
        onWebsiteAnalysis({
          title: result.title,
          description: result.description,
          content: result.content,
          analyzedAt: new Date().toISOString(),
        })

        // Build updated values with AI-extracted data
        const extracted = result.extracted || {}
        const updatedValues = { ...values }

        // Auto-fill from AI extraction (prefer extracted over raw metadata)
        if (!values.businessName) {
          updatedValues.businessName = extracted.businessName || result.title || ''
        }
        if (!values.businessDescription) {
          updatedValues.businessDescription = extracted.businessDescription || result.description || ''
        }
        if (!values.primaryCategory && extracted.primaryCategory) {
          // Match to our category options
          const matchedCategory = BUSINESS_CATEGORIES.find(
            cat => cat.toLowerCase().includes(extracted.primaryCategory?.toLowerCase() || '') ||
                   extracted.primaryCategory?.toLowerCase().includes(cat.toLowerCase())
          )
          if (matchedCategory) {
            updatedValues.primaryCategory = matchedCategory
          }
        }
        if (!values.idealCustomer && extracted.targetAudience) {
          updatedValues.idealCustomer = extracted.targetAudience
        }

        onChange(updatedValues)
      } else {
        setAnalyzeError(result.error || 'Failed to analyze website')
        onWebsiteAnalysis({ error: result.error, analyzedAt: new Date().toISOString() })
      }
    } catch {
      setAnalyzeError('Failed to analyze website')
      onWebsiteAnalysis({ error: 'Failed to analyze website', analyzedAt: new Date().toISOString() })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const updateField = <K extends keyof BusinessInfo>(field: K, value: BusinessInfo[K]) => {
    onChange({ ...values, [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName">Business Name</Label>
        <Input
          id="businessName"
          value={values.businessName || ''}
          onChange={(e) => updateField('businessName', e.target.value)}
          placeholder="Your company name"
          disabled={disabled}
        />
      </div>

      {/* Website URL with Analyze button */}
      <div className="space-y-2">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <div className="flex gap-2">
          <Input
            id="websiteUrl"
            type="url"
            value={values.websiteUrl || ''}
            onChange={(e) => updateField('websiteUrl', e.target.value)}
            placeholder="https://yourcompany.com"
            disabled={disabled}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAnalyzeWebsite}
            disabled={disabled || isAnalyzing || !values.websiteUrl}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Analyze
          </Button>
        </div>
        {websiteAnalysis?.analyzedAt && !websiteAnalysis.error && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>Website analyzed</span>
          </div>
        )}
        {analyzeError && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            <span>
              {analyzeError === 'credits_exhausted'
                ? 'Credits exhausted - this step is optional, continue without it'
                : analyzeError}
            </span>
          </div>
        )}
      </div>

      {/* Business Description */}
      <div className="space-y-2">
        <Label htmlFor="businessDescription">Business Description</Label>
        <Textarea
          id="businessDescription"
          value={values.businessDescription || ''}
          onChange={(e) => updateField('businessDescription', e.target.value)}
          placeholder="What does your business do? Who do you serve?"
          disabled={disabled}
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* Primary Category */}
      <div className="space-y-2">
        <Label htmlFor="primaryCategory">Primary Category</Label>
        <Select
          value={values.primaryCategory || ''}
          onValueChange={(value) => updateField('primaryCategory', value as BusinessInfo['primaryCategory'])}
          disabled={disabled}
        >
          <SelectTrigger id="primaryCategory">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Locations */}
      <div className="space-y-2">
        <Label htmlFor="locations">Locations</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {LOCATION_PRESETS.map((preset) => {
            const isSelected = values.locations?.includes(preset)
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    // Remove preset from locations
                    const newLocations = values.locations?.replace(preset, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim()
                    updateField('locations', newLocations || '')
                  } else {
                    // Add preset to locations
                    const newLocations = values.locations ? `${values.locations}, ${preset}` : preset
                    updateField('locations', newLocations)
                  }
                }}
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
                {preset}
              </button>
            )
          })}
        </div>
        <Input
          id="locations"
          value={values.locations || ''}
          onChange={(e) => updateField('locations', e.target.value)}
          placeholder="e.g., Global, US-based, New York & LA"
          disabled={disabled}
        />
      </div>

      {/* Ideal Customer */}
      <div className="space-y-2">
        <Label htmlFor="idealCustomer">Ideal Customer</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {CUSTOMER_TYPE_PRESETS.map((preset) => {
            const isSelected = values.idealCustomer?.includes(preset)
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    // Remove preset
                    const newValue = values.idealCustomer?.replace(preset, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim()
                    updateField('idealCustomer', newValue || '')
                  } else {
                    // Add preset
                    const newValue = values.idealCustomer ? `${values.idealCustomer}, ${preset}` : preset
                    updateField('idealCustomer', newValue)
                  }
                }}
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
                {preset}
              </button>
            )
          })}
        </div>
        <Textarea
          id="idealCustomer"
          value={values.idealCustomer || ''}
          onChange={(e) => updateField('idealCustomer', e.target.value)}
          placeholder="Describe your target audience..."
          disabled={disabled}
          className="min-h-[60px] resize-none"
        />
      </div>
    </div>
  )
}
