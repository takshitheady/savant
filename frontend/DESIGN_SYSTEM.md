# Savant Design System

A clean, warm, and minimal design language for the Savant AI platform.

---

## Philosophy

**Core Principles:**
1. **Light & Airy** - No harsh borders, use subtle shadows and backgrounds instead
2. **Warm & Friendly** - Orange-amber accent colors create an approachable feel
3. **Clean & Minimal** - Remove visual noise, let content breathe
4. **Smooth & Soft** - Rounded corners everywhere, no sharp edges

---

## Color Palette

### Primary Colors
```css
--primary: #F97316;           /* Vibrant orange - buttons, links, accents */
--primary-foreground: #ffffff; /* White text on orange */
```

### Background Colors
```css
--background: #FAFAF9;        /* Warm off-white - page background */
--card: #ffffff;              /* Pure white - cards, inputs, chat bubbles */
--muted: #F5F5F4;             /* Light warm gray - hover states, disabled */
```

### Text Colors
```css
--foreground: #1A1817;        /* Near black - primary text */
--muted-foreground: #78716C;  /* Warm gray - secondary text, placeholders */
```

### Accent Colors
```css
--accent: #FEF3C7;            /* Soft amber - highlights, badges */
--accent-foreground: #92400E; /* Dark amber - text on accent */
```

### Semantic Colors
```css
--destructive: #EF4444;       /* Red - errors, delete actions */
--border: #F0EDE8;            /* Very subtle - barely visible borders */
--ring: #F97316;              /* Orange - focus rings */
```

### Usage Examples
```tsx
// Primary action button
<Button className="bg-primary text-primary-foreground">

// Secondary/muted text
<p className="text-muted-foreground">

// Subtle background for sections
<div className="bg-muted/50">

// Icon with primary color tint
<div className="bg-primary/10">
  <Icon className="text-primary" />
</div>
```

---

## Typography

### Font Family
```css
font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
```

### Font Sizes
| Use Case | Class | Size |
|----------|-------|------|
| Page title | `text-2xl font-semibold` | 24px |
| Section heading | `text-lg font-medium` | 18px |
| Body text | `text-sm` | 14px |
| Small/caption | `text-xs` | 12px |

### Font Weights
- `font-semibold` (600) - Titles, important labels
- `font-medium` (500) - Section headings, buttons
- `font-normal` (400) - Body text

### Line Height & Tracking
```css
tracking-tight  /* Use on headings */
leading-normal  /* Default for body */
```

---

## Spacing

### Standard Scale
```
gap-1   = 4px
gap-2   = 8px
gap-3   = 12px
gap-4   = 16px
gap-6   = 24px
gap-8   = 32px
gap-10  = 40px
```

### Page Layout
```tsx
// Main content container
<div className="max-w-6xl mx-auto space-y-10">

// Section spacing
<div className="space-y-8">

// Card internal padding
<div className="p-6">

// Page padding
<main className="p-6 lg:p-8">
```

---

## Border Radius

**Key: Always use soft, rounded corners**

| Element | Class | Radius |
|---------|-------|--------|
| Buttons | `rounded-lg` or `rounded-xl` | 8px / 12px |
| Cards | `rounded-xl` | 12px |
| Inputs | `rounded-xl` | 12px |
| Chat bubbles | `rounded-2xl` | 16px |
| Avatars/Icons | `rounded-xl` or `rounded-full` | 12px / 50% |
| Small badges | `rounded-full` | 50% |

```tsx
// Button
<Button className="rounded-xl">

// Card
<div className="rounded-xl bg-white">

// Icon container
<div className="rounded-xl bg-primary/10 p-2">
```

---

## Shadows

**Key: Minimal shadows, never heavy**

| Use Case | Class |
|----------|-------|
| Cards | `shadow-sm` |
| Inputs | `shadow-sm` |
| Dropdowns | `shadow-md` |
| Modals | `shadow-lg` |

```css
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
```

**Never use:** `shadow`, `shadow-lg` on cards, `shadow-xl`, `shadow-2xl`

---

## Borders

**Key: Avoid visible borders whenever possible**

### Instead of borders, use:
1. **Background contrast** - White card on off-white background
2. **Subtle shadows** - `shadow-sm` for depth
3. **Spacing** - Let whitespace define boundaries

### When borders are needed:
```css
border-border/50  /* Very subtle, 50% opacity */
border-0          /* No border at all */
```

### DO NOT:
```tsx
// Avoid these
<div className="border border-gray-200">
<Card className="border">
```

### DO:
```tsx
// Use these instead
<div className="bg-white rounded-xl shadow-sm">
<div className="bg-muted/50 rounded-xl">
```

---

## Components

### Buttons

```tsx
// Primary (default)
<Button>Create Savant</Button>
// Renders: bg-primary, rounded-lg, no shadow

// Ghost (for secondary actions)
<Button variant="ghost">Cancel</Button>
// Renders: transparent, hover:bg-muted

// With icon
<Button className="gap-2 rounded-xl">
  <Plus className="h-4 w-4" />
  New Savant
</Button>
```

### Cards

```tsx
// Clean card (no visible border)
<div className="rounded-xl bg-white p-6">
  {/* content */}
</div>

// Card with subtle highlight
<div className="rounded-xl bg-gradient-to-br from-primary/5 via-amber-50/50 to-orange-50/30 p-6">
  {/* content */}
</div>
```

### Inputs

```tsx
// Text input
<Input
  className="rounded-xl border-0 bg-white shadow-sm"
  placeholder="Enter text..."
/>

// Textarea
<Textarea
  className="rounded-xl border-0 bg-white shadow-sm"
  placeholder="Type your message..."
/>
```

### Icon Containers

```tsx
// Primary accent
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
  <Bot className="h-5 w-5 text-primary" />
</div>

// Muted/secondary
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
  <User className="h-5 w-5 text-muted-foreground" />
</div>

// Colored variants
<div className="rounded-lg bg-amber-100 p-2">
  <FileText className="h-4 w-4 text-amber-600" />
</div>

<div className="rounded-lg bg-blue-100 p-2">
  <MessageSquare className="h-4 w-4 text-blue-600" />
</div>

<div className="rounded-lg bg-green-100 p-2">
  <Zap className="h-4 w-4 text-green-600" />
</div>
```

### Lists / Items

```tsx
// Clickable list item
<Link
  href={url}
  className="flex items-center gap-4 rounded-xl p-4 bg-white hover:bg-muted/50 transition-colors"
>
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
    <Bot className="h-5 w-5 text-primary" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="font-medium">{title}</p>
    <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
  </div>
  <ArrowRight className="h-4 w-4 text-muted-foreground" />
</Link>
```

---

## Layout Patterns

### Page Header
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">
      Page Title
    </h1>
    <p className="text-muted-foreground mt-1">
      Subtitle or description
    </p>
  </div>
  <Button className="gap-2 rounded-xl">
    <Plus className="h-4 w-4" />
    Action
  </Button>
</div>
```

### Stats Row (No Boxes)
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="text-sm">Label</span>
    </div>
    <p className="text-3xl font-semibold">{value}</p>
  </div>
  {/* repeat */}
</div>
```

### Two Column Layout
```tsx
<div className="grid lg:grid-cols-5 gap-8">
  <div className="lg:col-span-3">
    {/* Main content */}
  </div>
  <div className="lg:col-span-2">
    {/* Sidebar content */}
  </div>
</div>
```

### Collapsible Sidebar
```tsx
<div className={cn(
  'flex h-full flex-col bg-background transition-all duration-200',
  collapsed ? 'w-16' : 'w-60'
)}>
```

---

## Chat Interface

### Message Bubbles
```tsx
// User message
<div className="max-w-[80%] rounded-2xl px-4 py-3 bg-primary text-primary-foreground">

// Assistant message
<div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white">
```

### Avatar Icons
```tsx
// Assistant
<div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
  <Bot className="h-4 w-4 text-primary" />
</div>

// User
<div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
  <User className="h-4 w-4 text-muted-foreground" />
</div>
```

---

## Do's and Don'ts

### DO ✓
- Use `bg-white` for interactive elements on `bg-background`
- Use `rounded-xl` or `rounded-2xl` for all containers
- Use `shadow-sm` sparingly for depth
- Use `text-muted-foreground` for secondary text
- Use `bg-primary/10` with `text-primary` for icon containers
- Let content breathe with generous spacing (`space-y-8`, `gap-6`)
- Use gradients subtly: `from-primary/5 via-amber-50/50 to-orange-50/30`

### DON'T ✗
- Don't use visible borders (`border`, `border-gray-*`)
- Don't use harsh shadows (`shadow-lg`, `shadow-xl`)
- Don't use sharp corners (`rounded-md`, `rounded-sm`)
- Don't overcrowd with too many boxes/cards
- Don't use dark backgrounds in light mode
- Don't use pure black (`#000`) - use `--foreground` instead
- Don't add borders to inputs - use `border-0 shadow-sm`

---

## Quick Reference

```tsx
// Standard page container
<div className="max-w-6xl mx-auto space-y-10">

// Clean card
<div className="rounded-xl bg-white p-6">

// Subtle highlighted card
<div className="rounded-xl bg-gradient-to-br from-primary/5 to-amber-50/30 p-6">

// Primary button
<Button className="gap-2 rounded-xl">

// Ghost button
<Button variant="ghost" className="rounded-xl">

// Clean input
<Input className="rounded-xl border-0 bg-white shadow-sm" />

// Icon in colored container
<div className="rounded-xl bg-primary/10 p-2">
  <Icon className="h-5 w-5 text-primary" />
</div>

// Muted secondary text
<p className="text-sm text-muted-foreground">

// Section heading
<h2 className="text-lg font-medium">
```

---

## CSS Variables Reference

Located in `src/app/globals.css`:

```css
:root {
  --primary: #F97316;
  --primary-foreground: #ffffff;
  --background: #FAFAF9;
  --foreground: #1A1817;
  --card: #ffffff;
  --card-foreground: #1A1817;
  --muted: #F5F5F4;
  --muted-foreground: #78716C;
  --accent: #FEF3C7;
  --accent-foreground: #92400E;
  --destructive: #EF4444;
  --border: #F0EDE8;
  --input: #E7E5E4;
  --ring: #F97316;
  --radius: 0.75rem;
}
```

---

*Last updated: December 2024*
*Design System v1.0 - Savant AI*
