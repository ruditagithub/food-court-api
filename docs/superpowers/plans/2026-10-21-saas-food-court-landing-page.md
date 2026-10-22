# SaaS Food Court Landing Page Implementation Plan (Clinical Blueprint / Monochromatic Design System)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform and align the SaaS Food Court landing page (`FoodCourt OS`) to the new **`DESIGN.md`** specification: a monochromatic developer-tool clinical blueprint on frosted paper (shadcn/ui & Vercel design language: `#f5f5f5` canvas, `#ffffff` paper cards, `#0a0a0a` ink, strict 18px interactive radius & 24px container radius, 48px/600 tight display typography with -0.05em tracking, compact density, and `#e7000b` ember red decorative accent), while preserving **GSAP 3** animations, **Lenis** smooth scroll, and interactive product simulations.

**Architecture:** 
- Monochromatic Tailwind CSS v4 design tokens configured via `@theme` in `frontend/src/index.css` (`--color-canvas: #f5f5f5`, `--color-paper: #ffffff`, `--color-surface-alt: #fafafa`, `--color-ink: #0a0a0a`, `--color-ink-soft: #171717`, `--color-mid-gray: #737373`, `--color-hairline: #e5e5e5`, `--color-ember: #e7000b`).
- Strict geometric radius system: **18px** for all buttons, inputs, and badges; **24px** for all cards and section containers; **10px** for nested elements; **6px** for small accents.
- Typography: Geist geometric sans (substitute Inter) with **48px weight 600** display headlines at **`-0.05em`** tracking, compact body text at 14px/400.
- Compact density: section gaps 48–80px, card padding 20px, element gaps 8px.
- Preserved motion layer: Lenis smooth scroll ticker synced with GSAP ScrollTrigger, Bauhaus preloader, shutter page transition curtain, and viewport scroll reveals.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, GSAP 3 (`gsap`), Lenis (`lenis`), Geist / Inter geometric font, React Router DOM.

## Global Constraints

- **Design System Fidelity:** Strict adherence to updated `DESIGN.md` — background `--color-canvas: #f5f5f5`, container surface `--color-paper: #ffffff`, subtle surface `--color-surface-alt: #fafafa`, primary text `--color-ink: #0a0a0a`, soft ink `--color-ink-soft: #171717`, muted text `--color-mid-gray: #737373`, borders `--color-hairline: #e5e5e5`, accent `--color-ember: #e7000b`.
- **Absolute Radius Rules:**
  - Interactive elements (buttons, badges, inputs): **exactly 18px** (`rounded-[18px]`).
  - Content containers (cards, showcase panels, banners): **exactly 24px** (`rounded-[24px]`).
  - No 9999px pills and no square corners.
- **Typography Scale:**
  - Display headlines: **48px, weight 600, tracking `-0.05em`** (`tracking-[-0.05em]`).
  - Headings: **24px–36px, weight 600, tracking `-0.025em`**.
  - Body: **14px, weight 400**.
  - Captions & Badges: **12px, tracking `0.05em` uppercase**.
- **Compact Density:** Section spacing 48–80px, internal card padding 20px, element gap 8px.
- **Achromatic Discipline:** 99% monochromatic (black, white, gray). Single decorative red `#e7000b` for status/error/accent dots, never for colored buttons.

---

### Task 1: Update Fonts in `index.html` & Monochromatic Tokens in `index.css`

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: Google Fonts (`Geist:wght@400;500;600` or `Inter:wght@400;500;600`)
- Produces: Tailwind v4 theme tokens `--color-canvas`, `--color-paper`, `--color-surface-alt`, `--color-ink`, `--color-ink-soft`, `--color-mid-gray`, `--color-hairline`, `--color-ember`, `--radius-interactive`, `--radius-container`, `--shadow-card`

- [x] **Step 1: Update `frontend/index.html` with Geist font and title**

Update `frontend/index.html` to load Geist font family (weights 400, 500, 600):

```html
<!doctype html>
<html lang="id" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FoodCourt OS — Clinical Multi-Tenant Operating System</title>
    <meta name="description" content="Platform sistem operasi SaaS modern untuk food court dan sentra kuliner. Satu QR per meja, keranjang multi-tenant, self-checkout Midtrans, dan KDS dapur real-time." />
    <!-- Google Fonts: Geist (400, 500, 600) & Geist Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-[#f5f5f5] text-[#0a0a0a] font-sans antialiased selection:bg-[#0a0a0a] selection:text-[#ffffff] overflow-x-hidden">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 2: Update `frontend/src/index.css` with exact tokens from `DESIGN.md`**

Replace `frontend/src/index.css`:

```css
@import "tailwindcss";

@theme {
  /* Colors from DESIGN.md */
  --color-canvas: #f5f5f5;
  --color-paper: #ffffff;
  --color-surface-alt: #fafafa;
  --color-ink: #0a0a0a;
  --color-ink-soft: #171717;
  --color-mid-gray: #737373;
  --color-hairline: #e5e5e5;
  --color-ember: #e7000b;

  /* Typography */
  --font-sans: 'Geist', 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Typography Scale */
  --text-caption: 12px;
  --text-body: 14px;
  --text-body-lg: 16px;
  --text-subheading: 18px;
  --text-heading-sm: 24px;
  --text-heading: 30px;
  --text-heading-lg: 36px;
  --text-display: 48px;

  /* Border Radii — Exact DESIGN.md Rule: 18px interactive, 24px containers */
  --radius-sm: 6px;
  --radius-nested: 10px;
  --radius-interactive: 18px;
  --radius-container: 24px;

  /* Elevation Shadows from DESIGN.md */
  --shadow-card: 0 0 0 1px rgba(23, 23, 23, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
}

/* Base Styles & Lenis Smooth Scroll Fixes */
html.lenis, html.lenis body {
  height: auto;
}

.lenis.lenis-smooth {
  scroll-behavior: auto !important;
}

.lenis.lenis-smooth [data-lenis-prevent] {
  overscroll-behavior: contain;
}

.lenis.lenis-stopped {
  overflow: hidden;
}

.lenis.lenis-smooth iframe {
  pointer-events: none;
}

@layer base {
  body {
    background-color: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-sans);
  }

  /* Engineered display headline: 48px, weight 600, aggressive -0.05em tracking */
  .font-display {
    font-family: var(--font-sans);
    font-weight: 600;
    letter-spacing: -0.05em;
  }

  .font-heading {
    font-family: var(--font-sans);
    font-weight: 600;
    letter-spacing: -0.025em;
  }
}
```

- [x] **Step 3: Verify Token Compilation**
Verify no syntax errors in `index.html` and `index.css`.

---

### Task 2: Update UI Primitives (Button, Badge, Card, Icons) to 18px/24px Geometry

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`
- Modify: `frontend/src/components/ui/Badge.tsx`
- Modify: `frontend/src/components/ui/Card.tsx`
- Modify: `frontend/src/components/ui/Icons.tsx`

**Interfaces:**
- Produces: `<Button>` with 18px radius, `<Badge>` with 18px capsule radius, `<Card>` with 24px container radius, `<Icons>` styled with 1.5–2px geometric stroke in `#0a0a0a` / `#737373`

- [x] **Step 1: Update `frontend/src/components/ui/Button.tsx`**

Set radius to **18px**, font 14px Geist 500, compact padding, and the 3 distinct variants from `DESIGN.md`:
- `primary`: `#0a0a0a` background, `#fafafa` text, no border.
- `secondary`: `#f5f5f5` background, `#0a0a0a` text, no border.
- `outline`: transparent, `#0a0a0a` text, `1px solid #e5e5e5` hairline border.

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-[18px] text-center text-sm font-sans'

  const variantStyles = {
    // Primary: #0a0a0a background, #fafafa text, no border, 18px radius
    primary: 'bg-[#0a0a0a] text-[#fafafa] hover:bg-[#171717] active:scale-[0.98]',
    // Secondary: #f5f5f5 soft gray fill, #0a0a0a text, no border
    secondary: 'bg-[#f5f5f5] text-[#0a0a0a] hover:bg-[#e5e5e5] active:scale-[0.98]',
    // Outline: transparent, #0a0a0a text, 1px solid #e5e5e5 hairline
    outline: 'bg-transparent text-[#0a0a0a] border border-[#e5e5e5] hover:bg-[#f5f5f5] active:scale-[0.98]',
    // Ghost: transparent, #0a0a0a text
    ghost: 'bg-transparent text-[#0a0a0a] hover:bg-[#f5f5f5]'
  }

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
    md: 'text-sm px-3.5 py-2 h-9 gap-2',
    lg: 'text-sm px-5 py-2.5 h-10 gap-2'
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [x] **Step 2: Update `frontend/src/components/ui/Badge.tsx`**

Set radius to **18px**, font 12px weight 500, capsule padding `2px 8px`:

```tsx
import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'solid' | 'soft' | 'outline' | 'ember'
  className?: string
}

export function Badge({ children, variant = 'soft', className = '' }: BadgeProps) {
  const variants = {
    // Solid: #171717 fill, #fafafa text
    solid: 'bg-[#171717] text-[#fafafa]',
    // Soft: #f5f5f5 fill, #171717 text
    soft: 'bg-[#f5f5f5] text-[#171717] border border-[#e5e5e5]',
    // Outline: transparent, #0a0a0a text, 1px hairline
    outline: 'bg-transparent text-[#0a0a0a] border border-[#e5e5e5]',
    // Ember: subtle red tag for critical/live indicator
    ember: 'bg-[#e7000b]/10 text-[#e7000b] border border-[#e7000b]/20'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[18px] text-xs font-mono tracking-tight ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
```

- [x] **Step 3: Update `frontend/src/components/ui/Card.tsx`**

Set radius to **24px**, background `#ffffff` paper, border `1px solid #e5e5e5`, padding `20px`, shadow subtle:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  surface?: 'paper' | 'canvas' | 'surface-alt'
  className?: string
}

export function Card({
  children,
  surface = 'paper',
  className = '',
  ...props
}: CardProps) {
  const surfaceStyles = {
    paper: 'bg-[#ffffff] border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]',
    canvas: 'bg-[#f5f5f5] border border-[#e5e5e5]',
    'surface-alt': 'bg-[#fafafa] border border-[#e5e5e5]'
  }

  return (
    <div
      className={`rounded-[24px] p-5 sm:p-6 ${surfaceStyles[surface]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
```

- [x] **Step 4: Verify UI Primitives Compilation**
Ensure all exports are intact and types align.

---

### Task 3: Update Animation Components (Preloader & PageTransition)

**Files:**
- Modify: `frontend/src/components/animation/Preloader.tsx`
- Modify: `frontend/src/components/animation/PageTransition.tsx`

**Interfaces:**
- Produces: Monochromatic clinical loading screen and page transition curtain with `#0a0a0a` ink, `#ffffff` typography, and `#e7000b` ember dot

- [x] **Step 1: Update `frontend/src/components/animation/Preloader.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

interface PreloaderProps {
  onComplete?: () => void
}

export function Preloader({ onComplete }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const topPanelRef = useRef<HTMLDivElement>(null)
  const bottomPanelRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const counterObj = { val: 0 }

      const tl = gsap.timeline({
        onComplete: () => {
          if (containerRef.current) {
            containerRef.current.style.display = 'none'
          }
          if (onComplete) onComplete()
        }
      })

      // Count 0 to 100% in 1.2s
      tl.to(counterObj, {
        val: 100,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          setPercent(Math.floor(counterObj.val))
        }
      })

      // Brand wordmark fade
      tl.to(brandRef.current, {
        opacity: 0,
        y: -15,
        duration: 0.35,
        ease: 'power3.in'
      }, '-=0.2')

      // Split panels slide away (Curtain opens)
      tl.to(topPanelRef.current, {
        yPercent: -100,
        duration: 0.7,
        ease: 'power4.inOut'
      }, 'split')

      tl.to(bottomPanelRef.current, {
        yPercent: 100,
        duration: 0.7,
        ease: 'power4.inOut'
      }, 'split')
    }, containerRef)

    return () => ctx.revert()
  }, [onComplete])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col justify-between pointer-events-auto"
    >
      {/* Top Shutter Curtain */}
      <div
        ref={topPanelRef}
        className="w-full h-1/2 bg-[#0a0a0a] border-b border-[#e5e5e5]/10 flex items-end justify-center pb-8"
      >
        <div ref={brandRef} className="text-center">
          <div className="font-heading text-3xl sm:text-4xl text-[#ffffff] tracking-[-0.05em] font-semibold">
            court<span className="text-[#e7000b]">.</span>os
          </div>
          <span className="block text-[11px] font-mono text-[#737373] tracking-widest mt-2 uppercase">
            Food Court Operating System
          </span>
        </div>
      </div>

      {/* Bottom Shutter Curtain with Percentage */}
      <div
        ref={bottomPanelRef}
        className="w-full h-1/2 bg-[#0a0a0a] border-t border-[#e5e5e5]/10 flex items-start justify-center pt-8"
      >
        <div className="font-mono text-xl text-[#ffffff] tracking-tight">
          <span>{percent.toString().padStart(2, '0')}</span>%
        </div>
      </div>
    </div>
  )
}
```

- [x] **Step 2: Update `frontend/src/components/animation/PageTransition.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'

export function PageTransition() {
  const location = useLocation()
  const overlayRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const overlay = overlayRef.current
    if (!overlay) return

    const tl = gsap.timeline()

    // 1. Shutter closes
    tl.set(overlay, { display: 'flex', yPercent: -100 })
      .to(overlay, {
        yPercent: 0,
        duration: 0.45,
        ease: 'power3.inOut'
      })
      .to({}, { duration: 0.06 })
      // 2. Shutter opens
      .to(overlay, {
        yPercent: 100,
        duration: 0.55,
        ease: 'power4.inOut',
        onComplete: () => {
          gsap.set(overlay, { display: 'none' })
        }
      })

    return () => {
      tl.kill()
    }
  }, [location.pathname])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[90] hidden bg-[#0a0a0a] text-white flex-col items-center justify-center pointer-events-none"
    >
      <div className="font-heading text-2xl text-[#ffffff] tracking-[-0.03em] font-semibold">
        court<span className="text-[#e7000b]">.</span>os
      </div>
    </div>
  )
}
```

- [x] **Step 3: Verify Animation Code**
Ensure no compilation errors.

---

### Task 4: Update Landing Navigation & Hero Section to Clinical Blueprint Style

**Files:**
- Modify: `frontend/src/components/landing/Navbar.tsx`
- Modify: `frontend/src/components/landing/HeroSection.tsx`

**Interfaces:**
- Produces: Navbar on `#f5f5f5` canvas with hairline border and 18px radius buttons; Hero section with 48px/600 `-0.05em` headline, compact 20px padding cards, 18px button geometry, and ember `#e7000b` status dot

- [x] **Step 1: Update `frontend/src/components/landing/Navbar.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '../ui/Button'
import { IconArrowRight } from '../ui/Icons'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-[#f5f5f5]/90 backdrop-blur-md border-b border-[#e5e5e5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-2 group">
            <span className="font-heading text-xl tracking-[-0.04em] font-semibold text-[#0a0a0a]">
              court<span className="text-[#e7000b]">.</span>os
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#ffffff] text-[#737373] border border-[#e5e5e5]">
              Food Court OS
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-[#737373]">
            <a href="#fitur" className="hover:text-[#0a0a0a] transition-colors">Fitur</a>
            <a href="#cara-kerja" className="hover:text-[#0a0a0a] transition-colors">Cara Kerja</a>
            <a href="#simulator" className="hover:text-[#0a0a0a] transition-colors">Simulasi Live</a>
            <a href="#kalkulator" className="hover:text-[#0a0a0a] transition-colors">Kalkulator ROI</a>
            <a href="#harga" className="hover:text-[#0a0a0a] transition-colors">Harga</a>
            <a href="#faq" className="hover:text-[#0a0a0a] transition-colors">FAQ</a>
          </nav>
        </div>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          <a href="/login">
            <Button variant="secondary" size="sm">
              Masuk Internal
            </Button>
          </a>
          <a href="#simulator">
            <Button variant="primary" size="sm">
              Coba Demo
              <IconArrowRight className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[#737373] hover:text-[#0a0a0a] rounded-[6px]"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#e5e5e5] bg-[#ffffff] px-4 pt-3 pb-5 space-y-3">
          <nav className="flex flex-col space-y-2.5 text-xs text-[#737373]">
            <a href="#fitur" onClick={() => setMobileMenuOpen(false)} className="py-1">Fitur</a>
            <a href="#cara-kerja" onClick={() => setMobileMenuOpen(false)} className="py-1">Cara Kerja</a>
            <a href="#simulator" onClick={() => setMobileMenuOpen(false)} className="py-1">Simulasi Live</a>
            <a href="#kalkulator" onClick={() => setMobileMenuOpen(false)} className="py-1">Kalkulator ROI</a>
            <a href="#harga" onClick={() => setMobileMenuOpen(false)} className="py-1">Harga</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-1">FAQ</a>
          </nav>
          <div className="pt-3 border-t border-[#e5e5e5] flex flex-col gap-2">
            <a href="/login" className="w-full">
              <Button variant="secondary" size="md" className="w-full">Masuk Internal</Button>
            </a>
            <a href="#simulator" className="w-full">
              <Button variant="primary" size="md" className="w-full">Coba Demo</Button>
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
```

- [x] **Step 2: Update `frontend/src/components/landing/HeroSection.tsx`**

Set headline to 48px/600 `-0.05em` tracking, compact card layout (20px padding, 24px radius), 18px buttons, and ember `#e7000b` accent:

```tsx
import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { IconArrowRight, IconCheck } from '../ui/Icons'

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<'customer' | 'kds' | 'admin'>('customer')
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('[data-hero-tag]', {
        opacity: 0,
        y: 15,
        duration: 0.5,
        delay: 0.15
      })
      .from('[data-hero-title]', {
        opacity: 0,
        y: 25,
        duration: 0.7
      }, '-=0.35')
      .from('[data-hero-desc]', {
        opacity: 0,
        y: 20,
        duration: 0.6
      }, '-=0.45')
      .from('[data-hero-cta]', {
        opacity: 0,
        y: 15,
        stagger: 0.08,
        duration: 0.5
      }, '-=0.4')
      .from('[data-hero-summary]', {
        opacity: 0,
        x: 20,
        duration: 0.7
      }, '-=0.5')
      .from('[data-hero-mockup]', {
        opacity: 0,
        y: 30,
        duration: 0.8
      }, '-=0.4')
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={heroRef} className="pt-10 sm:pt-16 pb-12 sm:pb-20 border-b border-[#e5e5e5] relative overflow-hidden bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Capsule Tag */}
        <div data-hero-tag className="flex items-center justify-start mb-5">
          <Badge variant="soft">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e7000b] animate-pulse" />
            FOOD COURT MULTI-TENANT OS
          </Badge>
        </div>

        {/* Clinical Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-start mb-12">
          
          {/* Left Column: 48px/600 Engineered Headline */}
          <div className="lg:col-span-7">
            <h1 data-hero-title className="font-display text-3xl sm:text-4xl lg:text-[48px] leading-[1.1] text-[#0a0a0a] mb-5">
              Satu meja. Satu QR.<br />
              Seluruh gerai dalam satu pesanan.
            </h1>
            <p data-hero-desc className="text-sm sm:text-base text-[#737373] leading-relaxed max-w-xl mb-6">
              Platform pemesanan mandiri digital untuk sentra kuliner modern. Pelanggan memesan dari banyak kios sekaligus dalam satu keranjang dan satu pembayaran Midtrans — otomatis terdistribusi ke layar dapur (KDS) tiap gerai.
            </p>

            {/* 18px Radius Action Buttons */}
            <div data-hero-cta className="flex flex-wrap items-center gap-3">
              <a href="#simulator">
                <Button variant="primary" size="lg">
                  Uji Coba Simulasi
                  <IconArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <a href="#kalkulator">
                <Button variant="outline" size="lg">
                  Kalkulator ROI
                </Button>
              </a>
            </div>

            {/* Micro Specs */}
            <div data-hero-cta className="mt-6 flex flex-wrap items-center gap-5 text-xs text-[#737373] font-mono">
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-[#0a0a0a]" /> Zero install app
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-[#0a0a0a]" /> Midtrans QRIS
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-[#0a0a0a]" /> Real-time KDS
              </span>
            </div>
          </div>

          {/* Right Column: Stat Block Card */}
          <div data-hero-summary className="lg:col-span-5 bg-[#ffffff] rounded-[24px] p-5 sm:p-6 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="text-[11px] font-mono text-[#737373] uppercase tracking-wider mb-2">
              EFISIENSI OPERASIONAL
            </div>
            <div className="font-heading text-xl text-[#0a0a0a] mb-2 font-semibold">
              Dari meja ke kompor dalam 2 detik.
            </div>
            <p className="text-xs sm:text-sm text-[#737373] leading-relaxed mb-5">
              Tanpa pelayan bolak-balik mencatat nota, tanpa antrean kasir sentral. Pengunjung langsung duduk, pesan menu lintas kios, dan memantau status masak.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e5e5e5]">
              <div>
                <div className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] font-semibold">0 Menit</div>
                <div className="text-[11px] text-[#737373] font-mono mt-0.5">Antrean Kasir Fisik</div>
              </div>
              <div>
                <div className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] font-semibold">+35%</div>
                <div className="text-[11px] text-[#737373] font-mono mt-0.5">Table Turnover</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Hero Showcase Frame */}
        <div data-hero-mockup className="w-full">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#737373] uppercase tracking-wider">
                Live Interface Preview:
              </span>
              <div className="inline-flex rounded-[18px] bg-[#ffffff] p-1 border border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => setActiveTab('customer')}
                  className={`text-xs px-3 py-1 rounded-[18px] font-medium transition-all ${
                    activeTab === 'customer'
                      ? 'bg-[#0a0a0a] text-[#fafafa]'
                      : 'text-[#737373] hover:text-[#0a0a0a]'
                  }`}
                >
                  Pelanggan (Meja 04)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('kds')}
                  className={`text-xs px-3 py-1 rounded-[18px] font-medium transition-all ${
                    activeTab === 'kds'
                      ? 'bg-[#0a0a0a] text-[#fafafa]'
                      : 'text-[#737373] hover:text-[#0a0a0a]'
                  }`}
                >
                  Layar KDS Dapur
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className={`text-xs px-3 py-1 rounded-[18px] font-medium transition-all ${
                    activeTab === 'admin'
                      ? 'bg-[#0a0a0a] text-[#fafafa]'
                      : 'text-[#737373] hover:text-[#0a0a0a]'
                  }`}
                >
                  Admin Food Court
                </button>
              </div>
            </div>

            <div className="text-xs font-mono text-[#737373]">
              Status: <span className="text-[#0a0a0a] font-medium">● Elysia Core Ready</span>
            </div>
          </div>

          {/* Card Body */}
          <Card surface="paper" className="relative overflow-hidden">
            {activeTab === 'customer' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Mobile Preview Frame */}
                <div className="md:col-span-5 bg-[#fafafa] rounded-[18px] p-4 border border-[#e5e5e5]">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#e5e5e5] text-xs">
                    <span className="font-mono text-[#737373]">SENTRA KULINER MODERN</span>
                    <span className="px-2 py-0.5 rounded-[18px] bg-[#ffffff] font-mono text-[#0a0a0a] border border-[#e5e5e5]">MEJA 04</span>
                  </div>

                  {/* Multi-tenant Cart Items */}
                  <div className="mt-3 space-y-2">
                    <div className="text-[11px] font-mono text-[#737373] uppercase tracking-wide">
                      Keranjang Gabungan (2 Kios)
                    </div>

                    <div className="p-2.5 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-[#0a0a0a]">Nasi Goreng Wagyu</div>
                        <div className="text-[#737373] text-[11px]">Kios A • Dapur Nusantara</div>
                      </div>
                      <div className="font-mono font-medium text-[#0a0a0a]">Rp 45.000</div>
                    </div>

                    <div className="p-2.5 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-[#0a0a0a]">Iced Salted Caramel Latte</div>
                        <div className="text-[#737373] text-[11px]">Kios B • Roastery Kopi</div>
                      </div>
                      <div className="font-mono font-medium text-[#0a0a0a]">Rp 28.000</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#e5e5e5] flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[#737373]">Total (1x Checkout)</div>
                      <div className="font-mono text-sm font-semibold text-[#0a0a0a]">Rp 73.000</div>
                    </div>
                    <span className="px-3 py-1.5 rounded-[18px] bg-[#0a0a0a] text-[#fafafa] text-xs font-medium flex items-center gap-1.5">
                      Bayar QRIS
                      <IconArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Narrative */}
                <div className="md:col-span-7 space-y-3">
                  <Badge variant="soft">PENGALAMAN PELANGGAN MANDIRI</Badge>
                  <h3 className="font-heading text-xl sm:text-2xl text-[#0a0a0a]">
                    Pesan dari berbagai kios berbeda, bayar cukup satu kali.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                    Pengunjung tidak perlu mendatangi tiap gerai secara terpisah. Begitu pembayaran selesai di browser ponsel, sistem backend memecah pesanan otomatis ke dapur masing-masing tenant secara real-time.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Scan Meja QR
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Multi-Tenant Cart
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-[18px] bg-[#fafafa] border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                      ✓ Self-Checkout Midtrans
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kds' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-6 bg-[#fafafa] rounded-[18px] p-4 border border-[#e5e5e5]">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#e5e5e5] text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#e7000b]" />
                      <span className="font-mono font-medium text-[#0a0a0a]">KDS DAPUR • NUSANTARA</span>
                    </div>
                    <span className="font-mono text-xs text-[#737373]">Masuk: 2 Menit Lalu</span>
                  </div>

                  <div className="mt-3 p-3.5 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-[#0a0a0a]">ORDER #FC-8902</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] font-mono border border-[#e5e5e5]">
                        SEDANG DIMASAK
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[#0a0a0a]">
                      1x Nasi Goreng Wagyu
                      <span className="block text-[11px] font-normal text-[#737373] mt-0.5">Catatan: Pedas sedang, tanpa acar</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e5] text-xs">
                      <span className="font-mono text-[#737373]">Meja 04</span>
                      <button type="button" className="px-2.5 py-1 rounded-[18px] bg-[#0a0a0a] text-[#fafafa] text-xs">
                        Selesai Masak →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-6 space-y-3">
                  <Badge variant="soft">LAYAR DAPUR KDS REAL-TIME</Badge>
                  <h3 className="font-heading text-xl sm:text-2xl text-[#0a0a0a]">
                    Koki hanya melihat tiket pesanan kiosnya sendiri.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                    Setiap tenant mendapatkan antrean dapur digital. Tanpa kertas nota hilang atau salah baca catatan masakan. Saat masakan siap, koki cukup mengetuk tombol dan notifikasi langsung tampil di ponsel pelanggan.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-6 bg-[#fafafa] rounded-[18px] p-4 border border-[#e5e5e5]">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#e5e5e5] text-xs">
                    <span className="font-mono font-medium text-[#0a0a0a]">PUSAT KONTROL FOOD COURT</span>
                    <span className="text-[#0a0a0a] font-mono text-xs">Live System</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-3 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5]">
                      <div className="text-[11px] text-[#737373] font-mono">Omzet Hari Ini</div>
                      <div className="font-heading text-xl text-[#0a0a0a] mt-0.5">Rp 14.850.000</div>
                    </div>
                    <div className="p-3 rounded-[10px] bg-[#ffffff] border border-[#e5e5e5]">
                      <div className="text-[11px] text-[#737373] font-mono">Total Transaksi</div>
                      <div className="font-heading text-xl text-[#0a0a0a] mt-0.5">182 Order</div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-6 space-y-3">
                  <Badge variant="soft">MANAJEMEN SENTRA KULINER</Badge>
                  <h3 className="font-heading text-xl sm:text-2xl text-[#0a0a0a]">
                    Pusat kendali omzet, komisi tenant, dan QR meja.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                    Pengelola memiliki transparansi penuh terhadap penjualan seluruh tenant. Dilengkapi fitur generate QR meja instan, laporan bagi hasil, dan hak akses terisolasi.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>
    </section>
  )
}
```

- [x] **Step 3: Verify HeroSection Compilation**
Ensure typography scale and radius classes compile cleanly.

---

### Task 5: Update Social Proof, Workflow, and Role Deep-Dive Sections

**Files:**
- Modify: `frontend/src/components/landing/SocialProofBand.tsx`
- Modify: `frontend/src/components/landing/WorkflowSection.tsx`
- Modify: `frontend/src/components/landing/FeatureShowcase.tsx`

**Interfaces:**
- Produces: Stat blocks adhering to `DESIGN.md` (30–48px weight 600, 12px uppercase labels, no card chrome), 24px cards on `#f5f5f5` canvas, and 18px persona pills

- [x] **Step 1: Update `frontend/src/components/landing/SocialProofBand.tsx`**

Implement Stat Block pattern from `DESIGN.md`: label in 12px uppercase `#737373`, value in 30–48px weight 600 `#0a0a0a` with tight tracking:

```tsx
import { useScrollReveal } from '../../hooks/useScrollReveal'

export function SocialProofBand() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 25, stagger: 0.12 })

  const metrics = [
    { value: '0 Antrean', label: 'Kasir manual dieliminasi dengan self-checkout QRIS' },
    { value: '< 3 Detik', label: 'Waktu buka katalog menu QR di browser ponsel tanpa install' },
    { value: '100% Akurat', label: 'Pesanan terdistribusi langsung ke KDS dapur tiap tenant' },
    { value: '+35%', label: 'Peningkatan kecepatan perputaran meja (table turnover)' },
  ]

  const partnerLogos = [
    'GRAND KULINER ARCADE',
    'PUJASERA NUSANTARA',
    'URBAN FOOD PARK',
    'METRO DINING COMMONS',
    'THE HUB EATERY'
  ]

  return (
    <section ref={sectionRef} className="py-12 sm:py-16 border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Metric Cards Grid — Stat Block from DESIGN.md */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-12">
          {metrics.map((item, idx) => (
            <div key={idx} data-reveal className="border-l border-[#e5e5e5] pl-5">
              <div className="font-heading text-2xl sm:text-3xl lg:text-4xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
                {item.value}
              </div>
              <p className="text-xs text-[#737373] mt-1.5 leading-relaxed">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* Grayscale Brands */}
        <div data-reveal className="pt-8 border-t border-[#e5e5e5]">
          <div className="text-center mb-5">
            <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider">
              Dipercaya oleh Pengelola Food Court & Sentra Kuliner Modern
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-40 grayscale">
            {partnerLogos.map((brand, idx) => (
              <span key={idx} className="font-mono text-xs font-semibold tracking-wider text-[#0a0a0a]">
                {brand}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
```

- [x] **Step 2: Update `frontend/src/components/landing/WorkflowSection.tsx`**

Set cards to 24px radius `#ffffff` paper, 20px padding, hairline borders, and 18px badge tags:

```tsx
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { IconQrCode, IconMobile, IconKitchen, IconArrowRight } from '../ui/Icons'

export function WorkflowSection() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.15 })

  const steps = [
    {
      number: '01',
      title: 'Scan QR di Meja',
      description: 'Pengunjung duduk di meja mana pun dan memindai QR code dengan kamera ponsel. Menu seluruh tenant langsung terbuka di browser tanpa download aplikasi.',
      icon: IconQrCode,
      tag: 'Customer Flow'
    },
    {
      number: '02',
      title: 'Pesan Multi-Kios & 1x Bayar',
      description: 'Pilih kopi dari Tenant A dan makanan dari Tenant B dalam 1 keranjang bersama. Bayar sekali lewat QRIS atau e-wallet via Midtrans.',
      icon: IconMobile,
      tag: 'Unified Checkout'
    },
    {
      number: '03',
      title: 'Routing Otomatis ke KDS',
      description: 'Pesanan dipecah otomatis ke layar dapur (KDS) masing-masing kios. Koki memasak, menekan selesai, dan pembeli menerima notifikasi siap ambil.',
      icon: IconKitchen,
      tag: 'Kitchen Sync'
    }
  ]

  return (
    <section id="cara-kerja" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div data-reveal className="max-w-2xl mb-10">
          <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block mb-2">
            ALUR KERJA OPERASIONAL
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Dari meja makan hingga meja saji dalam 3 langkah.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2.5 leading-relaxed">
            Eliminasi kertas nota hilang, hilangkan antrean berdiri di kasir sentral, dan sinkronkan dapur tenant secara otomatis.
          </p>
        </div>

        {/* 3 Columns Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div
                key={idx}
                data-reveal
                className="bg-[#ffffff] rounded-[24px] p-5 sm:p-6 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] flex flex-col justify-between hover:border-[#0a0a0a]/30 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-heading text-3xl text-[#737373] font-semibold">{step.number}</span>
                    <span className="p-2.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a]">
                      <Icon className="w-4 h-4" />
                    </span>
                  </div>

                  <span className="inline-block text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#737373] border border-[#e5e5e5] mb-2.5">
                    {step.tag}
                  </span>

                  <h3 className="font-heading text-lg text-[#0a0a0a] mb-2 font-semibold">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#e5e5e5] flex items-center text-xs font-medium text-[#0a0a0a] gap-1">
                  Selengkapnya <IconArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
```

- [x] **Step 3: Update `frontend/src/components/landing/FeatureShowcase.tsx`**

Update persona pills to 18px radius, cards to 24px radius `#ffffff` paper, and text sizes:

```tsx
import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Badge } from '../ui/Badge'
import { IconCheck } from '../ui/Icons'

export function FeatureShowcase() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.12 })
  const [activeRole, setActiveRole] = useState<'customer' | 'tenant' | 'admin'>('customer')

  const roleData = {
    customer: {
      tag: 'PELANGGAN / PENGUNJUNG',
      title: 'Pesan tanpa unduh aplikasi, tanpa antre kasir.',
      desc: 'Pengunjung cukup memindai QR code di meja untuk mengakses seluruh katalog kuliner food court secara bersamaan.',
      bullets: [
        'Katalog menu gabungan seluruh tenant dalam satu antarmuka web',
        'Keranjang belanja multi-kios dengan pemecahan item otomatis',
        'Pembayaran mandiri aman via QRIS, GoPay, OVO, ShopeePay & VA',
        'Pelacakan status pesanan real-time tanpa perlu registrasi akun',
        'Fitur catatan khusus (misal: "tanpa gula", "ekstra pedas") per item'
      ],
      previewBadge: 'Web App (Zero-Install)',
      metric: '< 10 detik',
      metricLabel: 'Waktu dari scan hingga checkout pertama'
    },
    tenant: {
      tag: 'TENANT / KIOS KULINER',
      title: 'Layar dapur digital (KDS) & kontrol stok presisi.',
      desc: 'Tenant hanya fokus memasak makanan lezat. Pesanan masuk secara visual dengan tiket waktu dan catatan koki.',
      bullets: [
        'Kitchen Display System (KDS) khusus untuk tiap gerai kios',
        'Tiket pesanan otomatis berurutan berdasarkan waktu masuk',
        'Tandai stok habis dalam satu ketukan agar tidak bisa dipesan',
        'Notifikasi audio saat pesanan baru masuk di dapur',
        'Laporan penjualan harian milik kios sendiri'
      ],
      previewBadge: 'KDS & Menu Management',
      metric: '0 Tiket Hilang',
      metricLabel: 'Semua pesanan tercatat di layar dapur'
    },
    admin: {
      tag: 'PENGELOLA FOOD COURT',
      title: 'Transparansi omzet, meja, dan bagi hasil tenant.',
      desc: 'Pusat komando terpadu untuk pemilik sentra kuliner, mall, dan pengelola area komunal.',
      bullets: [
        'Generator QR code meja dinamis dengan format siap cetak',
        'Pendaftaran dan manajemen akun pemilik kios dalam hitungan detik',
        'Rekonsiliasi transaksi harian dan otomatisasi bagi hasil/komisi',
        'Monitoring kapasitas meja dan kecepatan penyajian tenant',
        'Hak akses bertingkat: Super Admin dan Admin Food Court'
      ],
      previewBadge: 'Pusat Kontrol Terpadu',
      metric: '100% Real-Time',
      metricLabel: 'Laporan keuangan terintegrasi otomatis'
    }
  }

  const current = roleData[activeRole]

  return (
    <section id="fitur" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block mb-2">
              SOLUSI LENGKAP 3 PIHAK
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
              Dirancang untuk kenyamanan bersama.
            </h2>
          </div>

          {/* 18px Radius Role Switcher */}
          <div className="inline-flex rounded-[18px] bg-[#f5f5f5] p-1 border border-[#e5e5e5]">
            <button
              type="button"
              onClick={() => setActiveRole('customer')}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all ${
                activeRole === 'customer'
                  ? 'bg-[#0a0a0a] text-[#fafafa]'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Pelanggan
            </button>
            <button
              type="button"
              onClick={() => setActiveRole('tenant')}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all ${
                activeRole === 'tenant'
                  ? 'bg-[#0a0a0a] text-[#fafafa]'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Tenant
            </button>
            <button
              type="button"
              onClick={() => setActiveRole('admin')}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all ${
                activeRole === 'admin'
                  ? 'bg-[#0a0a0a] text-[#fafafa]'
                  : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Pengelola
            </button>
          </div>
        </div>

        {/* 24px Container Card */}
        <div data-reveal className="bg-[#f5f5f5] rounded-[24px] p-6 sm:p-8 border border-[#e5e5e5] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Details */}
          <div className="lg:col-span-7 space-y-4">
            <Badge variant="soft">{current.tag}</Badge>

            <h3 className="font-heading text-xl sm:text-2xl text-[#0a0a0a] font-semibold">
              {current.title}
            </h3>

            <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
              {current.desc}
            </p>

            <div className="space-y-2 pt-1">
              {current.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#0a0a0a]">
                  <span className="mt-0.5 p-0.5 rounded-[6px] bg-[#0a0a0a] text-white shrink-0">
                    <IconCheck className="w-3 h-3" />
                  </span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#e5e5e5] flex items-center gap-6">
              <div>
                <div className="font-heading text-xl sm:text-2xl text-[#0a0a0a] font-semibold">{current.metric}</div>
                <div className="text-[11px] text-[#737373] font-mono">{current.metricLabel}</div>
              </div>
            </div>
          </div>

          {/* Visual Panel */}
          <div className="lg:col-span-5 bg-[#ffffff] rounded-[20px] p-5 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <span className="text-xs font-mono text-[#737373]">{current.previewBadge}</span>
              <span className="w-2 h-2 rounded-full bg-[#e7000b]" />
            </div>

            <div className="py-4 space-y-3">
              {activeRole === 'customer' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs">
                    <div className="text-[#737373]">Meja Terdeteksi</div>
                    <div className="font-mono font-medium text-xs text-[#0a0a0a]">Meja VIP-08 (Outdoor)</div>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs flex justify-between items-center">
                    <div>
                      <div className="font-medium text-[#0a0a0a]">Sate Ayam Madura (10 tusuk)</div>
                      <div className="text-[#737373] text-[11px]">Kios Sate Pak Kumis</div>
                    </div>
                    <div className="font-mono text-[#0a0a0a]">Rp 35.000</div>
                  </div>
                  <div className="p-2.5 rounded-[18px] bg-[#0a0a0a] text-white text-xs text-center font-medium">
                    Bayar QRIS Instant Rp 35.000
                  </div>
                </div>
              )}

              {activeRole === 'tenant' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs flex justify-between">
                    <span className="font-mono font-medium text-[#0a0a0a]">STATUS KIOS</span>
                    <span className="text-[#0a0a0a] font-mono font-medium">● BUKA & MENERIMA PESANAN</span>
                  </div>
                  <div className="p-2.5 rounded-[10px] border border-[#e5e5e5] text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-semibold text-[#0a0a0a]">TIKET #104 (Meja 08)</span>
                      <span className="px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] font-mono text-[10px] border border-[#e5e5e5]">
                        BARU MASUK
                      </span>
                    </div>
                    <div className="text-[#737373]">1x Sate Ayam Madura (Bumbu dipisah)</div>
                  </div>
                </div>
              )}

              {activeRole === 'admin' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs flex justify-between">
                    <span className="text-[#737373]">Total Tenant Terdaftar</span>
                    <span className="font-mono font-medium text-[#0a0a0a]">14 Kios Aktif</span>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-[#f5f5f5] text-xs flex justify-between">
                    <span className="text-[#777169]">Total Meja Terhubung</span>
                    <span className="font-mono font-medium text-[#0a0a0a]">40 Meja QR</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
```

---

### Task 6: Update Interactive Simulator & ROI Calculator

**Files:**
- Modify: `frontend/src/components/landing/InteractiveSimulator.tsx`
- Modify: `frontend/src/components/landing/RoiCalculator.tsx`

**Interfaces:**
- Produces: Dual-screen sandbox simulator and ROI slider with clinical blueprint styling (`#ffffff` paper cards, 18px buttons, 24px container cards, `#e7000b` status dot)

- [x] **Step 1: Update `frontend/src/components/landing/InteractiveSimulator.tsx`**

```tsx
import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { IconCheck, IconQrCode, IconKitchen, IconArrowRight } from '../ui/Icons'

interface CartItem {
  id: string
  name: string
  tenant: string
  price: number
  qty: number
}

export function InteractiveSimulator() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.12 })

  const [cart] = useState<CartItem[]>([
    { id: '1', name: 'Nasi Bebek Madura Sambal Hitam', tenant: 'Kios 01 • Bebek Rempah', price: 38000, qty: 1 },
    { id: '2', name: 'Es Cendol Durian Asli', tenant: 'Kios 03 • Minuman Nusantara', price: 25000, qty: 1 }
  ])

  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'PAID' | 'COOKING' | 'READY'>('IDLE')

  const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0)

  const handleSimulateOrder = () => {
    setOrderStatus('PAID')
    setTimeout(() => setOrderStatus('COOKING'), 1200)
    setTimeout(() => setOrderStatus('READY'), 3000)
  }

  const handleReset = () => {
    setOrderStatus('IDLE')
  }

  return (
    <section id="simulator" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="soft" className="mb-2">
            SANDBOX SIMULASI INTERAKTIF
          </Badge>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Coba alur pemesanan secara langsung.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2 leading-relaxed">
            Rasakan bagaimana sistem memproses keranjang multi-kios pelanggan dan meneruskannya ke layar dapur tenant dalam hitungan detik.
          </p>
        </div>

        {/* Dual-Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Customer View */}
          <div data-reveal className="lg:col-span-6 bg-[#ffffff] rounded-[24px] p-5 sm:p-6 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <IconQrCode className="w-4 h-4 text-[#0a0a0a]" />
                <span className="font-mono text-xs font-semibold text-[#0a0a0a]">PONSEL PELANGGAN (MEJA 12)</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] border border-[#e5e5e5]">
                Scan Meja
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-[11px] font-mono text-[#737373]">Katalog Multi-Tenant:</div>

              {cart.map((item) => (
                <div key={item.id} className="p-3 rounded-[10px] bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-[#0a0a0a]">{item.name}</div>
                    <div className="text-[11px] text-[#737373]">{item.tenant}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-semibold text-[#0a0a0a]">
                      Rp {(item.price * item.qty).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}

              <div className="p-3.5 rounded-[10px] border border-[#e5e5e5] flex items-center justify-between mt-3">
                <div>
                  <div className="text-[11px] text-[#737373]">Total (1x Bayar)</div>
                  <div className="font-heading text-lg text-[#0a0a0a] font-semibold">
                    Rp {total.toLocaleString('id-ID')}
                  </div>
                </div>

                {orderStatus === 'IDLE' ? (
                  <Button variant="primary" size="md" onClick={handleSimulateOrder}>
                    Bayar Sekarang
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset Simulasi
                  </Button>
                )}
              </div>

              {/* Status */}
              {orderStatus !== 'IDLE' && (
                <div className="mt-3 p-3 rounded-[10px] bg-[#fafafa] border border-[#e5e5e5]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono font-medium text-[#0a0a0a]">STATUS #FC-9912</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-[18px] bg-[#0a0a0a] text-white">{orderStatus}</span>
                  </div>
                  <div className="text-xs text-[#737373]">
                    {orderStatus === 'PAID' && '💳 Pembayaran Midtrans diverifikasi...'}
                    {orderStatus === 'COOKING' && '👨‍🍳 Koki sedang memasak pesanan Anda...'}
                    {orderStatus === 'READY' && (
                      <span className="text-[#0a0a0a] font-medium flex items-center gap-1.5">
                        <IconCheck className="w-3.5 h-3.5 text-[#0a0a0a]" />
                        Makanan Siap Diambil di Kios 01 & Kios 03!
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KDS View */}
          <div data-reveal className="lg:col-span-6 bg-[#ffffff] rounded-[24px] p-5 sm:p-6 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <IconKitchen className="w-4 h-4 text-[#0a0a0a]" />
                <span className="font-mono text-xs font-semibold text-[#0a0a0a]">LAYAR DAPUR KIOS 01 (BEBEK)</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#737373] border border-[#e5e5e5]">
                KDS Sync
              </span>
            </div>

            <div className="mt-4">
              {orderStatus === 'IDLE' ? (
                <div className="py-14 text-center text-[#737373]">
                  <p className="text-xs">Menunggu pesanan dari pelanggan...</p>
                  <p className="text-[11px] text-[#737373] mt-1">Klik "Bayar Sekarang" di sebelah kiri untuk melihat tiket.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-[10px] bg-[#f5f5f5] border border-[#e5e5e5]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#0a0a0a]">TIKET #FC-9912</span>
                        <span className="block text-[11px] text-[#737373]">Meja 12</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-[18px] font-mono text-[10px] bg-[#0a0a0a] text-[#fafafa]">
                        {orderStatus}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-[6px] border border-[#e5e5e5] text-xs">
                      <div className="font-semibold text-[#0a0a0a]">1x Nasi Bebek Madura Sambal Hitam</div>
                      <div className="text-[#737373] text-[11px]">Catatan: Sambal dipisah</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-[10px] bg-[#fafafa] text-[11px] text-[#737373] font-mono border border-[#e5e5e5]">
                    ✓ Tiket Es Cendol otomatis masuk ke Layar KDS Kios 03 secara independen.
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
```

- [x] **Step 2: Update `frontend/src/components/landing/RoiCalculator.tsx`**

Set to 24px container cards, 18px button, and Geist 600 stat values:

```tsx
import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { IconArrowRight } from '../ui/Icons'

export function RoiCalculator() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.12 })

  const [tables, setTables] = useState<number>(30)
  const [avgOrder, setAvgOrder] = useState<number>(65000)
  const [turnoverPerDay, setTurnoverPerDay] = useState<number>(5)

  const currentDailyRevenue = tables * turnoverPerDay * avgOrder
  const improvedDailyRevenue = tables * (turnoverPerDay * 1.25) * avgOrder
  const monthlyGain = (improvedDailyRevenue - currentDailyRevenue) * 30

  return (
    <section id="kalkulator" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="max-w-2xl mb-10">
          <Badge variant="soft" className="mb-2">
            KALKULATOR POTENSI BISNIS
          </Badge>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Hitung peningkatan omzet sentra kuliner Anda.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2 leading-relaxed">
            Eliminasi antrean kasir mempercepat perputaran meja (table turnover). Simulasikan proyeksi pertumbuhan omzet.
          </p>
        </div>

        {/* Dual Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Controls */}
          <div data-reveal className="lg:col-span-7 bg-[#f5f5f5] rounded-[24px] p-5 sm:p-7 border border-[#e5e5e5] space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-[#0a0a0a]">Jumlah Meja Food Court:</label>
                <span className="font-mono text-sm font-semibold text-[#0a0a0a]">{tables} Meja</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={tables}
                onChange={(e) => setTables(Number(e.target.value))}
                className="w-full accent-[#0a0a0a] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#737373] font-mono mt-1">
                <span>10 Meja</span>
                <span>120 Meja</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-[#0a0a0a]">Rata-rata Nilai Pesanan per Meja:</label>
                <span className="font-mono text-sm font-semibold text-[#0a0a0a]">
                  Rp {avgOrder.toLocaleString('id-ID')}
                </span>
              </div>
              <input
                type="range"
                min="30000"
                max="250000"
                step="5000"
                value={avgOrder}
                onChange={(e) => setAvgOrder(Number(e.target.value))}
                className="w-full accent-[#0a0a0a] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#737373] font-mono mt-1">
                <span>Rp 30.000</span>
                <span>Rp 250.000</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-[#0a0a0a]">Perputaran Meja per Hari:</label>
                <span className="font-mono text-sm font-semibold text-[#0a0a0a]">{turnoverPerDay}x pergantian</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={turnoverPerDay}
                onChange={(e) => setTurnoverPerDay(Number(e.target.value))}
                className="w-full accent-[#0a0a0a] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#737373] font-mono mt-1">
                <span>2x</span>
                <span>12x</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div data-reveal className="lg:col-span-5 bg-[#ffffff] rounded-[24px] p-5 sm:p-7 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] space-y-5">
            <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block">
              PROYEKSI KENAIKAN OMZET
            </span>

            <div>
              <div className="text-xs text-[#737373] mb-1">Tambahan Pendapatan per Bulan (+25% Turnover)</div>
              <div className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-tight font-semibold">
                +Rp {Math.round(monthlyGain).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="pt-3 border-t border-[#e5e5e5] space-y-2 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-[#737373]">Omzet Harian Saat Ini:</span>
                <span className="font-mono text-[#0a0a0a]">Rp {currentDailyRevenue.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#737373]">Proyeksi Omzet Baru:</span>
                <span className="font-mono font-medium text-[#0a0a0a]">Rp {Math.round(improvedDailyRevenue).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-1">
              <a href="#harga" className="w-full">
                <Button variant="primary" size="lg" className="w-full">
                  Mulai Digitalisasi Sekarang
                  <IconArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
```

---

### Task 7: Update Architecture, Pricing, FAQ, Banner, and Footer to Clinical Design

**Files:**
- Modify: `frontend/src/components/landing/ArchitectureSection.tsx`
- Modify: `frontend/src/components/landing/PricingSection.tsx`
- Modify: `frontend/src/components/landing/FaqSection.tsx`
- Modify: `frontend/src/components/landing/CtaBanner.tsx`
- Modify: `frontend/src/components/landing/Footer.tsx`

**Interfaces:**
- Produces: Architecture cards in 24px `#ffffff` paper, Pricing with 18px pill buttons and 24px cards, FAQ accordion with 18px/24px cards, CtaBanner with 18px primary button, and clean developer-tool footer

- [x] **Step 1: Update `frontend/src/components/landing/ArchitectureSection.tsx`**

```tsx
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { IconShield, IconClock, IconLayers, IconSparkles } from '../ui/Icons'

export function ArchitectureSection() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.1 })

  const specs = [
    {
      title: 'ElysiaJS + Bun High-Throughput Core',
      desc: 'Pemrosesan pesanan dalam sub-milidetik, siap menangani lonjakan pesanan jam makan siang tanpa lag.',
      tag: 'Backend Core',
      icon: IconLayers
    },
    {
      title: 'Midtrans Self-Checkout Integration',
      desc: 'Mendukung QRIS, GoPay, OVO, ShopeePay, dan transfer bank otomatis dengan verifikasi instan tanpa kasir fisik.',
      tag: 'Payments',
      icon: IconShield
    },
    {
      title: 'Sub-Order Distribution Engine',
      desc: 'Otomatisasi pemecahan keranjang belanja multi-tenant menjadi sub-order mandiri yang langsung sinkron ke KDS kios.',
      tag: 'Multi-Tenant',
      icon: IconSparkles
    },
    {
      title: 'Real-Time KDS Kitchen Polling',
      desc: 'Sistem polling efisien dan ringan yang menjaga layar dapur selalu terhubung tanpa membebani browser di tablet.',
      tag: 'Real-Time Sync',
      icon: IconClock
    }
  ]

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="max-w-2xl mb-10">
          <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block mb-2">
            ARSITEKTUR & KEANDALAN TEKNIS
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Teknologi tangguh untuk jam sibuk tanpa kendala.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2 leading-relaxed">
            Didesain dari nol untuk keandalan operasional tingkat enterprise dengan performa tinggi dan nol toleransi pesanan hilang.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {specs.map((spec, idx) => {
            const Icon = spec.icon
            return (
              <div
                key={idx}
                data-reveal
                className="bg-[#ffffff] rounded-[24px] p-5 border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#737373] border border-[#e5e5e5]">
                      {spec.tag}
                    </span>
                    <Icon className="w-4 h-4 text-[#0a0a0a]" />
                  </div>
                  <h3 className="font-heading text-base text-[#0a0a0a] mb-1.5 font-semibold">
                    {spec.title}
                  </h3>
                  <p className="text-xs text-[#737373] leading-relaxed">
                    {spec.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
```

- [x] **Step 2: Update `frontend/src/components/landing/PricingSection.tsx`**

Set cards to 24px radius, buttons to 18px radius, highlighted card with 1px dark border and soft badge:

```tsx
import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { IconCheck } from '../ui/Icons'

export function PricingSection() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.12 })
  const [isAnnual, setIsAnnual] = useState(true)

  const plans = [
    {
      name: 'Starter Hub',
      desc: 'Cocok untuk food court mandiri atau pujasera komunitas kecil hingga 10 tenant.',
      monthlyPrice: 450000,
      annualPrice: 360000,
      features: [
        'Hingga 10 Tenant / Kios Kuliner',
        'Hingga 25 Meja dengan QR Code Dinamis',
        'Akses App Customer Mobile Web (No Install)',
        'Layar KDS Dapur untuk setiap Tenant',
        'Pembayaran Terintegrasi QRIS & Midtrans',
        'Laporan Penjualan Dasar (Harian)'
      ],
      ctaText: 'Pilih Starter Hub',
      highlighted: false
    },
    {
      name: 'Pro Sentra',
      desc: 'Pilihan terfavorit untuk sentra kuliner modern dan area komunal komersial ramai.',
      monthlyPrice: 950000,
      annualPrice: 760000,
      features: [
        'Hingga 30 Tenant / Kios Kuliner',
        'Hingga 80 Meja dengan Cetak QR Massal',
        'Fitur Pemesanan Multi-Tenant Tanpa Batas',
        'Layar KDS Dapur Real-Time dengan Audio Alert',
        'Manajemen Komisi & Payout Tenant Otomatis',
        'Analisis Okupansi Meja & Jam Sibuk',
        'Dukungan Prioritas 7 Hari Seminggu'
      ],
      ctaText: 'Mulai Uji Coba Pro',
      highlighted: true
    },
    {
      name: 'Enterprise Mall',
      desc: 'Untuk operator mall besar, airport lounge, atau grup multi-lokasi food court.',
      monthlyPrice: 2200000,
      annualPrice: 1760000,
      features: [
        'Unlimited Tenant & Kios Kuliner',
        'Unlimited Meja & Lokasi Food Court',
        'Multi-Lokasi dalam Satu Akun Super Admin',
        'Dedicated Server & Custom Domain',
        'Integrasi Akuntansi & Custom ERP API',
        'SLA Keandalan 99.9% & On-site Support'
      ],
      ctaText: 'Hubungi Tim Enterprise',
      highlighted: false
    }
  ]

  return (
    <section id="harga" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="soft" className="mb-2">
            PAKET LANGGANAN
          </Badge>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Paket transparan sesuai skala sentra kuliner Anda.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] mt-2">
            Tanpa biaya tersembunyi. Mulai digitalisasi food court tanpa investasi mesin kasir mahal.
          </p>

          {/* 18px Billing Switcher */}
          <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5]">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all ${
                !isAnnual ? 'bg-[#0a0a0a] text-[#fafafa]' : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`text-xs px-3.5 py-1.5 rounded-[18px] font-medium transition-all flex items-center gap-1.5 ${
                isAnnual ? 'bg-[#0a0a0a] text-[#fafafa]' : 'text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Tahunan
              <span className="text-[10px] bg-[#ffffff] text-[#0a0a0a] px-1.5 py-0.2 rounded-[18px] border border-[#e5e5e5]">Hemat 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, idx) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice

            return (
              <div
                key={idx}
                data-reveal
                className={`rounded-[24px] p-6 flex flex-col justify-between transition-all ${
                  plan.highlighted
                    ? 'bg-[#ffffff] border-2 border-[#0a0a0a] shadow-md relative'
                    : 'bg-[#ffffff] border border-[#e5e5e5] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-[18px] bg-[#0a0a0a] text-[#fafafa]">
                      REKOMENDASI UTAMA
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="font-heading text-xl text-[#0a0a0a] mb-1 font-semibold">{plan.name}</h3>
                  <p className="text-xs text-[#737373] leading-relaxed mb-5">{plan.desc}</p>

                  <div className="mb-5 pb-5 border-b border-[#e5e5e5]">
                    <div className="font-heading text-3xl text-[#0a0a0a] font-semibold">
                      Rp {price.toLocaleString('id-ID')}
                      <span className="text-xs font-mono font-normal text-[#737373]"> / bln</span>
                    </div>
                    <div className="text-[11px] text-[#737373] font-mono mt-0.5">
                      {isAnnual ? 'Ditagih tahunan' : 'Ditagih setiap bulan'}
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {plan.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-[#0a0a0a]">
                        <IconCheck className="w-3.5 h-3.5 text-[#0a0a0a] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant={plan.highlighted ? 'primary' : 'outline'}
                  size="md"
                  className="w-full"
                >
                  {plan.ctaText}
                </Button>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
```

- [x] **Step 3: Update `frontend/src/components/landing/FaqSection.tsx`**

```tsx
import { useState } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Badge } from '../ui/Badge'
import { IconChevronDown } from '../ui/Icons'

export function FaqSection() {
  const sectionRef = useScrollReveal<HTMLElement>({ y: 30, stagger: 0.1 })
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      q: 'Apakah pengunjung harus mendownload aplikasi dari Play Store / App Store?',
      a: 'Tidak. Pengunjung hanya perlu memindai QR code di meja menggunakan kamera ponsel biasa. Menu seluruh tenant akan terbuka instan di browser web tanpa instalasi aplikasi.'
    },
    {
      q: 'Bagaimana pembagian uang pesanan (payout) jika pelanggan memesan dari beberapa kios sekaligus?',
      a: 'Semua pembayaran diproses melalui payment gateway terpadu (Midtrans). Sistem backend FoodCourt OS secara otomatis memetakan sub-order ke masing-masing tenant dan mencatat laporan bagi hasil bersih secara akurat.'
    },
    {
      q: 'Apakah tenant membutuhkan perangkat atau tablet khusus untuk dapur?',
      a: 'Tidak. Layar Kitchen Display System (KDS) dapat diakses melalui browser di tablet Android/iPad apa pun, laptop, atau ponsel milik koki.'
    },
    {
      q: 'Bagaimana jika salah satu menu di kios habis di tengah hari?',
      a: 'Tenant cukup mengetuk tombol toggle pada aplikasi kios miliknya. Menu akan otomatis berstatus OUT OF STOCK dan tidak dapat dipilih oleh pelanggan secara real-time.'
    },
    {
      q: 'Bagaimana jika QR code di meja rusak atau kotor?',
      a: 'Pengelola food court dapat men-generate ulang token QR code meja kapan saja melalui dashboard internal dan langsung mencetak stiker QR baru.'
    }
  ]

  return (
    <section id="faq" ref={sectionRef} className="py-16 sm:py-20 border-b border-[#e5e5e5] bg-[#f5f5f5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div data-reveal className="max-w-2xl mb-10">
          <Badge variant="soft" className="mb-2">
            PERTANYAAN UMUM
          </Badge>
          <h2 className="font-heading text-2xl sm:text-3xl text-[#0a0a0a] tracking-[-0.03em] font-semibold">
            Hal yang sering ditanyakan pengelola food court.
          </h2>
        </div>

        {/* Accordion List */}
        <div className="max-w-3xl space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                data-reveal
                className="bg-[#ffffff] rounded-[18px] border border-[#e5e5e5] overflow-hidden transition-all shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left gap-4"
                >
                  <span className="font-heading text-sm sm:text-base text-[#0a0a0a] font-medium">{faq.q}</span>
                  <span className={`p-1 rounded-[6px] bg-[#f5f5f5] text-[#0a0a0a] transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}>
                    <IconChevronDown className="w-3.5 h-3.5" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-[#737373] leading-relaxed border-t border-[#e5e5e5] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
```

- [x] **Step 4: Update `frontend/src/components/landing/CtaBanner.tsx` and `Footer.tsx`**

`frontend/src/components/landing/CtaBanner.tsx`:
```tsx
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Button } from '../ui/Button'
import { IconArrowRight } from '../ui/Icons'

export function CtaBanner() {
  const bannerRef = useScrollReveal<HTMLElement>({ y: 30 })

  return (
    <section ref={bannerRef} className="py-16 sm:py-20 bg-[#ffffff] border-b border-[#e5e5e5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div data-reveal className="bg-[#f5f5f5] rounded-[24px] p-6 sm:p-12 border border-[#e5e5e5] text-center max-w-4xl mx-auto shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
          <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block mb-3">
            DIGITALISASI SENTRA KULINER
          </span>
          <h2 className="font-heading text-2xl sm:text-4xl text-[#0a0a0a] tracking-[-0.04em] mb-4 max-w-2xl mx-auto font-semibold">
            Tingkatkan kepuasan pengunjung dan kecepatan dapur mulai hari ini.
          </h2>
          <p className="text-xs sm:text-sm text-[#737373] max-w-xl mx-auto mb-6 leading-relaxed">
            Gabungkan kemudahan scan QR mandiri, dapur terkoordinasi rapi, dan laporan keuangan transparan dalam satu sistem operasi food court terpadu.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#simulator">
              <Button variant="primary" size="lg">
                Uji Coba Demo
                <IconArrowRight className="w-4 h-4" />
              </Button>
            </a>
            <a href="/login">
              <Button variant="outline" size="lg">
                Masuk ke Portal Internal
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
```

`frontend/src/components/landing/Footer.tsx`:
```tsx
export function Footer() {
  return (
    <footer className="py-10 bg-[#f5f5f5] text-[#737373] text-xs">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-8 border-b border-[#e5e5e5]">
          <div className="md:col-span-2 space-y-2">
            <div className="font-heading text-lg text-[#0a0a0a] font-semibold tracking-tight">
              court<span className="text-[#e7000b]">.</span>os
            </div>
            <p className="text-xs text-[#737373] max-w-sm leading-relaxed">
              Platform sistem operasi SaaS multi-tenant untuk food court, pusat kuliner, dan pujasera modern di Indonesia.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-[#0a0a0a] pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Elysia Core API: Operasional
            </div>
          </div>

          <div>
            <div className="font-mono text-xs text-[#0a0a0a] uppercase font-semibold mb-2.5">Navigasi</div>
            <ul className="space-y-1.5">
              <li><a href="#fitur" className="hover:text-[#0a0a0a] transition-colors">Fitur</a></li>
              <li><a href="#cara-kerja" className="hover:text-[#0a0a0a] transition-colors">Cara Kerja</a></li>
              <li><a href="#simulator" className="hover:text-[#0a0a0a] transition-colors">Simulasi Live</a></li>
              <li><a href="#kalkulator" className="hover:text-[#0a0a0a] transition-colors">Kalkulator ROI</a></li>
              <li><a href="#harga" className="hover:text-[#0a0a0a] transition-colors">Paket Harga</a></li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-xs text-[#0a0a0a] uppercase font-semibold mb-2.5">Akses Sistem</div>
            <ul className="space-y-1.5">
              <li><a href="/login" className="hover:text-[#0a0a0a] transition-colors">Portal Admin & Tenant</a></li>
              <li><a href="http://localhost:3000/swagger" target="_blank" rel="noreferrer" className="hover:text-[#0a0a0a] transition-colors">Dokumentasi API</a></li>
              <li><a href="#faq" className="hover:text-[#0a0a0a] transition-colors">Bantuan & FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#737373]">
          <div>
            © {new Date().getFullYear()} FoodCourt OS. Monochromatic Developer Architecture.
          </div>
          <div className="flex gap-4 text-xs">
            <a href="#" className="hover:text-[#0a0a0a]">Privasi</a>
            <a href="#" className="hover:text-[#0a0a0a]">Ketentuan</a>
            <a href="#" className="hover:text-[#0a0a0a]">Keamanan</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
```

---

### Task 8: Verification & Visual Inspection

**Files:**
- Inspect: all components and pages

- [x] **Step 1: Check build / compilation status**
Verify that all TypeScript types, Tailwind v4 tokens, and imports resolve cleanly.

- [x] **Step 2: Inspect browser preview**
Verify that the canvas is `#f5f5f5`, cards are `#ffffff` with 24px radius, buttons are 18px radius, headlines are 48px/600 with `-0.05em` tracking, and ember `#e7000b` accent appears exclusively on cues.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-21-saas-food-court-landing-page.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
