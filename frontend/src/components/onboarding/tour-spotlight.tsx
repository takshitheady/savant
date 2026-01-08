'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

interface SpotlightProps {
  target: string // CSS selector
  padding?: number
  children?: React.ReactNode
}

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

export function TourSpotlight({ target, padding = 8, children }: SpotlightProps) {
  const [mounted, setMounted] = useState(false)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        })
      }
    }

    // Initial position
    updatePosition()

    // Update on scroll and resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    // Observe element size changes
    const element = document.querySelector(target)
    if (element) {
      observerRef.current = new ResizeObserver(updatePosition)
      observerRef.current.observe(element)
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      observerRef.current?.disconnect()
    }
  }, [target, padding])

  if (!mounted || !targetRect) {
    return null
  }

  const overlayContent = (
    <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: 'none' }}>
      {/* SVG overlay with cutout */}
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left}
              y={targetRect.top}
              width={targetRect.width}
              height={targetRect.height}
              rx="12"
              ry="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
        />
      </svg>

      {/* Highlight border around target */}
      <div
        className="absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent transition-all duration-300"
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
        }}
      />

      {/* Children (tooltip) positioned relative to target */}
      {children}
    </div>
  )

  return createPortal(overlayContent, document.body)
}

// Export target rect for tooltip positioning
export function useTargetRect(target: string, padding: number = 8): TargetRect | null {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        })
      }
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [target, padding])

  return targetRect
}
