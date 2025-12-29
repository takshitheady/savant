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
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { SelectGroup, SelectLabel } from '@/components/ui/select'

// Available models via OpenRouter
const AVAILABLE_MODELS = [
  // OpenAI
  { value: 'openai/gpt-4o', label: 'GPT-4o', provider: 'OpenAI', description: 'Most capable' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast & efficient' },
  { value: 'openai/o1', label: 'o1', provider: 'OpenAI', description: 'Advanced reasoning' },
  { value: 'openai/o3-mini', label: 'o3 Mini', provider: 'OpenAI', description: 'Efficient reasoning' },
  // Anthropic
  { value: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Balanced & capable' },
  { value: 'anthropic/claude-opus-4-20250514', label: 'Claude Opus 4', provider: 'Anthropic', description: 'Most intelligent' },
  // Google
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', provider: 'Google', description: 'Fast & multimodal' },
  { value: 'google/gemini-pro-1.5', label: 'Gemini 1.5 Pro', provider: 'Google', description: 'Powerful & versatile' },
] as const

const savantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  model: z.string(),
  temperature: z.number().min(0).max(2),
  systemPrompt: z.string().max(5000).optional(),
})

type SavantFormValues = z.infer<typeof savantSchema>

const defaultValues: SavantFormValues = {
  name: '',
  description: '',
  model: 'openai/gpt-4o-mini',
  temperature: 0.7,
  systemPrompt: '',
}

export function SavantForm() {
  const router = useRouter()
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
            provider: 'openrouter',
            temperature: values.temperature,
            max_tokens: 4096,
          },
        })
        .select()
        .single()

      if (error) {
        throw error
      }

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
                    <SelectLabel>OpenAI</SelectLabel>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'OpenAI').map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label} - {model.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Anthropic</SelectLabel>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'Anthropic').map(model => (
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
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the AI model that powers your Savant (via OpenRouter)
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
              <FormLabel>Temperature: {value}</FormLabel>
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
                Lower values make output more focused and deterministic. Higher values make it more
                creative.
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
