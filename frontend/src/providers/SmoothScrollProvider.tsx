import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface SmoothScrollProviderProps {
  children: ReactNode
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  useEffect(() => {
    // Only activate Lenis smooth scrolling on the public Landing Page
    // Internal app/dashboard/modal routes use fast native scrolling
    if (!isLandingPage) {
      return
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      prevent: (node) => {
        return (
          node.nodeType === 1 &&
          Boolean(
            node.closest('[data-lenis-prevent]') ||
            node.closest('[role="dialog"]') ||
            node.closest('.overflow-y-auto') ||
            node.closest('.overflow-auto') ||
            node.closest('.overflow-x-auto') ||
            node.closest('select') ||
            node.closest('textarea')
          )
        )
      },
    })

    lenis.on('scroll', ScrollTrigger.update)

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(tickerCallback)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tickerCallback)
      lenis.destroy()
    }
  }, [isLandingPage])

  return <>{children}</>
}
