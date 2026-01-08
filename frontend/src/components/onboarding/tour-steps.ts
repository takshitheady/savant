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
    id: 'new-savant-button',
    target: '[data-tour="new-savant-button"]',
    title: 'Create Your First Savant',
    content: 'Click here to create a new AI assistant. Choose a name, select an AI model, and define its personality.',
    placement: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'sidebar-savants',
    target: '[data-tour="sidebar-savants"]',
    title: 'Your Savants',
    content: 'All your AI assistants live here. View, edit, upload documents, or start chatting with any Savant.',
    placement: 'right',
    spotlightPadding: 4,
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
    id: 'sidebar-voice',
    target: '[data-tour="sidebar-voice"]',
    title: 'Your Brand Voice',
    content: 'Define your brand\'s personality here. Select traits like "professional" or "friendly" and we\'ll generate a consistent voice for all your Savants.',
    placement: 'right',
    spotlightPadding: 4,
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
    title: 'Build AI Assistants',
    description: 'Create custom AI assistants powered by Claude, GPT, Gemini, and more.',
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
    key: 'brandVoiceConfigured' as const,
    title: 'Set up Brand Voice',
    description: 'Define your brand personality',
    href: '/prompts',
  },
  {
    key: 'firstSavantCreated' as const,
    title: 'Create your first Savant',
    description: 'Build your first AI assistant',
    href: '/savants/new',
  },
  {
    key: 'firstDocumentUploaded' as const,
    title: 'Upload a document',
    description: 'Train your Savant with knowledge',
    href: '/savants',
  },
  {
    key: 'firstMessageSent' as const,
    title: 'Send your first message',
    description: 'Chat with your AI assistant',
    href: '/savants',
  },
  {
    key: 'storeExplored' as const,
    title: 'Explore Official Savants',
    description: 'Discover Savants by Heady',
    href: '/store',
  },
]
