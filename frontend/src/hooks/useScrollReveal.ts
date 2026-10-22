import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ScrollRevealOptions {
  y?: number
  duration?: number
  stagger?: number
  delay?: number
  ease?: string
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const elementRef = useRef<T>(null)
  const {
    y = 35,
    duration = 0.85,
    stagger = 0.12,
    delay = 0,
    ease = 'power3.out'
  } = options

  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const items = el.querySelectorAll('[data-reveal]')
    const targets = items.length > 0 ? items : el

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        {
          opacity: 0,
          y
        },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          delay,
          ease,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      )
    }, el)

    return () => ctx.revert()
  }, [y, duration, stagger, delay, ease])

  return elementRef
}
