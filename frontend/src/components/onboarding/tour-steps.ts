import type { TourStep } from '@/types/onboarding'

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard-welcome',
    target: '[data-tour="dashboard-welcome"]',
    title: 'Welcome to Your Dashboard',
    content: 'This is your command center. View all your Savants, recent activity, and quick stats at a glance.',
    placement: 'bottom',
    spotlightPadding: 16,
  },
  {
    id: 'sidebar-store',
    target: '[data-tour="sidebar-store"]',
    title: 'Official Savants',
    content: 'Discover pre-built Savants created by Heady. Import them with one click to get started quickly.',
    placement: 'right',
    spotlightPadding: 4,
  },
  {
    id: 'sidebar-savants',
    target: '[data-tour="sidebar-savants"]',
    title: 'Your Savants',
    content: 'All your imported AI assistants live here. View, edit, upload documents, or start chatting with any Savant.',
    placement: 'right',
    spotlightPadding: 4,
  },
  {
    id: 'sidebar-voice',
    target: '[data-tour="sidebar-voice"]',
    title: 'Your Brand Voice',
    content: 'Define your brand\'s personality here. Select traits like "professional" or "friendly" and we\'ll generate a consistent voice for all your Savants.',
    placement: 'right',
    spotlightPadding: 4,
  },
  {
    id: 'advanced-brand-voice',
    target: '[data-tour="advanced-brand-voice"]',
    title: 'Advanced Brand Options',
    content: 'Want richer results? Add your business details, brand pillars, and voice style. You can even paste your website URL to auto-fill information!',
    placement: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'sidebar-settings',
    target: '[data-tour="sidebar-settings"]',
    title: 'Settings',
    content: 'Configure your account, manage API keys for external access, and customize your experience. You can also restart this tour from here.',
    placement: 'right',
    spotlightPadding: 4,
  },
  {
    id: 'header-profile',
    target: '[data-tour="header-profile"]',
    title: 'Your Profile',
    content: 'Access your account settings and sign out from here. You\'re all set! Ready to create your first Savant?',
    placement: 'bottom',
    spotlightPadding: 8,
  },
]

export const FEATURE_CARDS = [
  {
    icon: 'Bot',
    title: 'Import AI Assistants',
    description: 'Import professionally crafted AI assistants powered by Claude, GPT, Gemini, and more.',
  },
  {
    icon: 'FileText',
    title: 'Train with Documents',
    description: 'Upload PDFs and documents to give your Savants specialized knowledge.',
  },
  {
    icon: 'Store',
    title: 'Official Savants',
    description: 'Browse pre-built Savants created by Heady and import them with one click.',
  },
  {
    icon: 'Mic2',
    title: 'Brand Voice',
    description: 'Define your brand personality that applies consistently across all Savants.',
  },
]

export const MILESTONES = [
  {
    key: 'storeExplored' as const,
    title: 'Explore Official Savants',
    description: 'Discover Savants by Heady',
    href: '/store',
  },
  {
    key: 'firstSavantImported' as const,
    title: 'Import your first Savant',
    description: 'Get started with a professional AI assistant',
    href: '/store',
  },
  {
    key: 'brandVoiceConfigured' as const,
    title: 'Set up Brand Voice',
    description: 'Define your brand personality',
    href: '/prompts',
  },
  {
    key: 'firstDocumentUploaded' as const,
    title: 'Upload a document',
    description: 'Add custom knowledge to your Savant',
    href: '/savants',
  },
  {
    key: 'firstMessageSent' as const,
    title: 'Send your first message',
    description: 'Chat with your AI assistant',
    href: '/savants',
  },
]
