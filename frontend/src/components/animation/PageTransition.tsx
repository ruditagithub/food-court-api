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
        amici<span className="text-[#e7000b]">.</span>os
      </div>
    </div>
  )
}
