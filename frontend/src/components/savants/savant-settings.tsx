'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { createClient } from '@/lib/supabase/client'
import { Loader2, Trash2 } from 'lucide-react'
import { SelectGroup, SelectLabel } from '@/components/ui/select'

// Available AI models
const AVAILABLE_MODELS = [
  // Anthropic
  { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5', provider: 'Anthropic', description: 'Balanced & fast' },
  { value: 'anthropic/claude-opus-4.5', label: 'Claude Opus 4.5', provider: 'Anthropic', description: 'Most intelligent' },
  // OpenAI
  { value: 'openai/gpt-5.1', label: 'GPT-5.1', provider: 'OpenAI', description: 'Latest GPT' },
  { value: 'openai/gpt-5.2-pro', label: 'GPT-5.2 Pro', provider: 'OpenAI', description: 'Professional' },
  { value: 'openai/gpt-5.2-chat', label: 'GPT-5.2 Chat', provider: 'OpenAI', description: 'Conversational' },
  // Google
  { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro', provider: 'Google', description: 'Powerful' },
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', provider: 'Google', description: 'Fast' },
  { value: 'google/gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', provider: 'Google', description: 'Image generation' },
  // Mistral
  { value: 'mistralai/ministral-14b-2512', label: 'Ministral 14B', provider: 'Mistral', description: 'Efficient' },
  // DeepSeek
  { value: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', provider: 'DeepSeek', description: 'Open source' },
  // ByteDance
  { value: 'bytedance-seed/seedream-4.5', label: 'Seedream 4.5', provider: 'ByteDance', description: 'Image generation' },
] as const

const savantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  model: z.string(),
  temperature: z.number().min(0).max(2),
})

type SavantFormValues = z.infer<typeof savantSchema>

interface SavantSettingsProps {
  savant: {
    id: string
    name: string
    description?: string | null
    model_config?: {
      model?: string
      temperature?: number
      provider?: string
      max_tokens?: number
    } | null
  }
}

export function SavantSettings({ savant }: SavantSettingsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<SavantFormValues>({
    resolver: zodResolver(savantSchema),
    defaultValues: {
      name: savant.name,
      description: savant.description || '',
      model: savant.model_config?.model || 'anthropic/claude-sonnet-4.5',
      temperature: savant.model_config?.temperature ?? 0.7,
    },
  })

  async function onSubmit(values: SavantFormValues) {
    try {
      setIsLoading(true)

      const supabase = createClient()

      const { error } = await supabase
        .from('savants')
        .update({
          name: values.name,
          description: values.description,
          model_config: {
            model: values.model,
            provider: 'multi',
            temperature: values.temperature,
            max_tokens: 4096,
          },
        })
        .eq('id', savant.id)

      if (error) {
        throw error
      }

      router.refresh()
      alert('Settings updated successfully!')
    } catch (error) {
      console.error('Error updating savant:', error)
      alert('Failed to update settings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    try {
      setIsDeleting(true)

      const supabase = createClient()

      const { error } = await supabase.from('savants').delete().eq('id', savant.id)

      if (error) {
        throw error
      }

      router.push('/savants')
      router.refresh()
    } catch (error) {
      console.error('Error deleting savant:', error)
      alert('Failed to delete savant. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your Savant's configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" {...field} />
                    </FormControl>
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-gray-200">
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
                      />
                    </FormControl>
                    <FormDescription>
                      Lower values make output more focused. Higher values make it more creative.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Permanently delete this Savant and all its data</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Savant
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the Savant "
                  {savant.name}" and remove all associated documents, prompts, and conversation
                  history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
