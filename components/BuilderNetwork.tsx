'use client'

import React, { useEffect, useState } from 'react'

interface Builder {
  id: string
  name: string
  avatar: string
  score: number
}

export default function BuilderNetwork() {
  const [builders, setBuilders] = useState<Builder[]>([])
  const [outerIndices, setOuterIndices] = useState<number[]>([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
  ])
  const [rotation, setRotation] = useState(0)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    fetch('/api/talent/top-builders')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 5) setBuilders(data)
      })
  }, [])

  useEffect(() => {
    let frame = 0
    const interval = setInterval(() => {
      frame++
      setRotation(prev => (prev + 0.15) % 360)
      setPulse(Math.sin(frame / 20) * 5)
    }, 30)

    const swapInterval = setInterval(() => {
      if (builders.length < 24) return
      setOuterIndices(prev => {
        const next = [...prev]
        const swapPos = Math.floor(Math.random() * next.length)
        const busy = new Set(prev)
        const available = builders.map((_, i) => i).filter(i => !busy.has(i))
        if (available.length > 0) {
          next[swapPos] = available[Math.floor(Math.random() * available.length)]
        }
        return next
      })
    }, 4500)

    return () => {
      clearInterval(interval)
      clearInterval(swapInterval)
    }
  }, [builders])

  if (builders.length === 0) return null

  const getOuterCoords = (i: number) => {
    const angle = (i * (360 / outerIndices.length) + rotation) * (Math.PI / 180)
    const radius = 240 + pulse * 0.5
    return {
      x: 300 + Math.cos(angle) * radius,
      y: 300 + Math.sin(angle) * radius
    }
  }

  return (
    <div className="builder-network-container" style={{ position: 'relative', width: '600px', height: '600px', margin: '0 auto', userSelect: 'none' }}>
      
      {/* SVG Connection Layer */}
      <svg
        width="600"
        height="600"
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Geometric Web - Higher Density */}
        {outerIndices.map((_, i) => {
          const p1 = getOuterCoords(i)
          const p2 = getOuterCoords((i + 3) % outerIndices.length)
          const p3 = getOuterCoords((i + 7) % outerIndices.length)
          const p4 = getOuterCoords((i + 11) % outerIndices.length)
          return (
            <React.Fragment key={`web-${i}`}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(0, 212, 255, 0.15)" strokeWidth="0.5" />
              <line x1={p1.x} y1={p1.y} x2={p3.x} y2={p3.y} stroke="rgba(0, 212, 255, 0.1)" strokeWidth="0.5" />
              <line x1={p1.x} y1={p1.y} x2={p4.x} y2={p4.y} stroke="rgba(0, 212, 255, 0.05)" strokeWidth="0.5" />
            </React.Fragment>
          )
        })}

        {/* Cross Dash Connections */}
        {outerIndices.map((idx, i) => {
          const p1 = getOuterCoords(i)
          const p2 = getOuterCoords((i + Math.floor(outerIndices.length/2)) % outerIndices.length)
          const p3 = getOuterCoords((i + Math.floor(outerIndices.length/3)) % outerIndices.length)
          
          if (i >= outerIndices.length / 2) return null; // Avoid duplicate lines
          
          return (
            <React.Fragment key={`dash-${idx}-${i}`}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(124, 58, 237, 0.25)" strokeWidth="0.8" strokeDasharray="4,4" />
              <line x1={p1.x} y1={p1.y} x2={p3.x} y2={p3.y} stroke="rgba(124, 58, 237, 0.15)" strokeWidth="0.8" strokeDasharray="4,4" />
            </React.Fragment>
          )
        })}
      </svg>

      {/* Outer Builders Ring */}
      {outerIndices.map((idx, i) => {
        const builder = builders[idx]
        if (!builder) return null
        const pos = getOuterCoords(i)
        return (
          <div
            key={`outer-${builder.id}-${idx}-${i}`}
            style={{
              position: 'absolute',
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: '48px',
              height: '48px',
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid rgba(0, 212, 255, 0.2)',
              backgroundColor: 'var(--bg-secondary)',
              padding: '2px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative'
            }} className="group hover:scale-150 z-20 hover:border-[var(--accent-primary)] hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]">
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                <img
                  src={builder.avatar}
                  alt={builder.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    transition: 'all 0.3s'
                  }}
                />
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                fontSize: '9px',
                fontWeight: '900',
                padding: '2px 6px',
                borderRadius: '9999px',
                zIndex: 30,
                boxShadow: '0 4px 10px rgba(0,0,0,0.8)'
              }}>
                {builder.score}
              </div>
            </div>
          </div>
        )
      })}

      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.8); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.8); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
