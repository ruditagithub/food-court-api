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
            amici<span className="text-[#e7000b]">.</span>os
          </div>
          <span className="block text-[11px] font-mono text-[#737373] tracking-widest mt-2 uppercase">
            Amici Food Court Operating System
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
