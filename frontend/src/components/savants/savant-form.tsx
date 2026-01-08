'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mic2 } from 'lucide-react'
import { useOnboarding } from '@/components/onboarding'
import { SelectGroup, SelectLabel } from '@/components/ui/select'

// Available AI models
const AVAILABLE_MODELS = [
  // Anthropic
  { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5', provider: 'Anthropic', description: 'Balanced & fast', type: 'chat' },
  { value: 'anthropic/claude-opus-4.5', label: 'Claude Opus 4.5', provider: 'Anthropic', description: 'Most intelligent', type: 'chat' },
  // OpenAI
  { value: 'openai/gpt-5.1', label: 'GPT-5.1', provider: 'OpenAI', description: 'Latest GPT', type: 'chat' },
  { value: 'openai/gpt-5.2-pro', label: 'GPT-5.2 Pro', provider: 'OpenAI', description: 'Professional', type: 'chat' },
  { value: 'openai/gpt-5.2-chat', label: 'GPT-5.2 Chat', provider: 'OpenAI', description: 'Conversational', type: 'chat' },
  // Google
  { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro', provider: 'Google', description: 'Powerful', type: 'chat' },
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', provider: 'Google', description: 'Fast', type: 'chat' },
  { value: 'google/gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', provider: 'Google', description: 'Image generation', type: 'image' },
  // Mistral
  { value: 'mistralai/ministral-14b-2512', label: 'Ministral 14B', provider: 'Mistral', description: 'Efficient', type: 'chat' },
  // DeepSeek
  { value: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', provider: 'DeepSeek', description: 'Open source', type: 'chat' },
  // ByteDance
  { value: 'bytedance-seed/seedream-4.5', label: 'Seedream 4.5', provider: 'ByteDance', description: 'Image generation', type: 'image' },
] as const

const savantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  model: z.string(),
  temperature: z.number().min(0).max(2),
  systemPrompt: z.string().max(5000).optional(),
  useBrandVoice: z.boolean(),
})

type SavantFormValues = z.infer<typeof savantSchema>

const defaultValues: SavantFormValues = {
  name: '',
  description: '',
  model: 'anthropic/claude-sonnet-4.5',
  temperature: 0.7,
  systemPrompt: '',
  useBrandVoice: true,
}

export function SavantForm() {
  const router = useRouter()
  const { completeMilestone } = useOnboarding()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<SavantFormValues>({
    resolver: zodResolver(savantSchema),
    defaultValues,
  })

  async function onSubmit(values: SavantFormValues) {
    try {
      setIsLoading(true)

      const supabase = createClient()

      // Get user's account - refresh to get latest data
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      console.log('[Savant Form] User data:', {
        user: user ? { id: user.id, email: user.email } : null,
        error: userError
      })

      if (userError || !user) {
        console.error('[Savant Form] Auth error:', userError)
        throw new Error('Not authenticated. Please log in again.')
      }

      // Query account_members
      const { data: accountMember, error: accountError } = await supabase
        .from('account_members')
        .select('account_id, role')
        .eq('user_id', user.id)
        .single()

      console.log('[Savant Form] Account lookup result:', {
        accountMember,
        error: accountError,
        userId: user.id
      })

      if (accountError) {
        console.error('[Savant Form] Account lookup error details:', {
          code: accountError.code,
          message: accountError.message,
          details: accountError.details,
          hint: accountError.hint
        })
        throw new Error(`Failed to find account: ${accountError.message}. Code: ${accountError.code}`)
      }

      if (!accountMember) {
        console.error('[Savant Form] No account_member found for user:', user.id)
        throw new Error('Account not found. Please try logging out and back in, or contact support.')
      }

      console.log('[Savant Form] Using account:', accountMember.account_id)

      // Generate a unique slug
      const baseSlug = values.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      let slug = baseSlug
      let slugSuffix = 1

      // Check if slug already exists and append counter if needed
      while (true) {
        const { data: existingSavant } = await supabase
          .from('savants')
          .select('id')
          .eq('account_id', accountMember.account_id)
          .eq('slug', slug)
          .maybeSingle()

        if (!existingSavant) {
          // Slug is unique, we can use it
          break
        }

        // Slug exists, try with suffix
        slug = `${baseSlug}-${slugSuffix}`
        slugSuffix++
      }

      console.log('[Savant Form] Generated unique slug:', slug)

      // Create the savant with model_config as JSONB and system_prompt
      const { data: savant, error } = await supabase
        .from('savants')
        .insert({
          account_id: accountMember.account_id,
          name: values.name,
          slug: slug,
          description: values.description,
          system_prompt: values.systemPrompt || null,
          model_config: {
            model: values.model,
            provider: 'multi',
            temperature: values.temperature,
            max_tokens: 4096,
            use_brand_voice: values.useBrandVoice,
          },
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Track milestone
      await completeMilestone('firstSavantCreated')

      // Redirect to the savant's page
      router.push(`/savants/${savant.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error creating savant:', error)
      alert('Failed to create savant. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="My AI Assistant" {...field} />
              </FormControl>
              <FormDescription>
                Give your Savant a unique and memorable name
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A helpful assistant that..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Describe what this Savant is designed to do
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Anthropic</SelectLabel>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'Anthropic').map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label} - {model.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>OpenAI</SelectLabel>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'OpenAI').map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label} - {model.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Google</SelectLabel>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'Google').map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label} - {model.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Mistral</SelectLabel>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'Mistral').map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label} - {model.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>DeepSeek</SelectLabel>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'DeepSeek').map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label} - {model.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>ByteDance</SelectLabel>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'ByteDance').map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label} - {model.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the AI model that powers your Savant
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="temperature"
          render={({ field: { value, onChange } }) => (
            <FormItem>
              <FormLabel>Creativity: {value}</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={[value]}
                  onValueChange={(vals) => onChange(vals[0])}
                  className="w-full"
                />
              </FormControl>
              <FormDescription>
                Lower values make responses more focused and consistent. Higher values make them more
                creative and varied.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System Prompt (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="You are a helpful assistant that..."
                  className="min-h-[120px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Define the personality and behavior of your Savant. You can also add this later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="useBrandVoice"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg bg-muted/30 p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Mic2 className="h-4 w-4 text-primary" />
                  <FormLabel className="text-base">Use Brand Voice</FormLabel>
                </div>
                <FormDescription>
                  Apply your account's brand voice personality to this Savant
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Savant
          </Button>
        </div>
      </form>
    </Form>
  )
}
