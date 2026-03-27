'use client'

import React, { useState, useEffect } from 'react'

interface Builder {
  id: string
  avatar: string
  name: string
  username: string
  score?: number
}

export default function BuilderOrbit() {
  const [builders, setBuilders] = useState<Builder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTopBuilders() {
      try {
        const res = await fetch('/api/talent/top-builders')
        const data = await res.json()
        
        // Filter out profiles that are completely empty or missing both name and avatar
        const validBuilders = (data as Builder[]).filter(b => b.name || b.avatar || b.username)
        setBuilders(validBuilders.slice(0, 10))
      } catch (err) {
        console.error('Orbit fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTopBuilders()
  }, [])

  return (
    <div className="orbit-container" style={{ perspective: '2000px' }}>
      <div className="orbit-scene" style={{
        position: 'relative',
        width: '500px',
        height: '500px',
        transformStyle: 'preserve-3d',
        transform: 'rotateX(60deg) rotateY(0deg)', 
        animation: 'rotateOrbit 60s linear infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Central Core Glow */}
        <div style={{
          width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.2) 0%, transparent 70%)',
          position: 'absolute',
          transform: 'rotateX(-60deg) translateZ(0)',
          filter: 'blur(40px)',
          opacity: 0.6
        }} />

        {builders.map((b, i) => {
          const angle = (i / builders.length) * 2 * Math.PI
          const radius = 260
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          
          const displayName = b.username || b.name || 'Builder'
          const initialAvatar = b.avatar || `https://i.pravatar.cc/150?u=${displayName}`

          return (
            <div
              key={b.id + i}
              className="builder-node"
              style={{
                position: 'absolute',
                transform: `translateX(${x}px) translateY(${y}px)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div 
                className="glass-card"
                style={{
                  width: 60, height: 60, borderRadius: '18px',
                  padding: 2, 
                  background: 'rgba(13, 17, 23, 0.8)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'rotateX(-60deg) rotateZ(0deg)',
                  animation: 'counterRotate 60s linear infinite',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  position: 'relative'
                }}
                onClick={() => window.location.href = `/builder/${b.username || 'builder'}`}
              >
                <img
                  src={initialAvatar}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; 
                    target.src = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${displayName}`;
                  }}
                />
                
                {/* Score Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: -8,
                  right: -8,
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '2px 7px',
                  borderRadius: '12px',
                  border: '2px solid var(--accent-primary)',
                  boxShadow: '0 4px 10px rgba(0,212,255,0.3)',
                  zIndex: 10
                }}>
                  {b.score || '90'}
                </div>

                {/* Name Tag (Visible Always) */}
                <div style={{
                  position: 'absolute',
                  bottom: -28,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  background: 'rgba(13, 17, 23, 0.8)',
                  padding: '0 4px',
                  borderRadius: '4px'
                }}>
                  {displayName}
                </div>
                
                {/* Hover Full Name */}
                <div className="hover-info" style={{
                  position: 'absolute',
                  top: -65,
                  left: '50%',
                  transform: 'translateX(-50%) translateY(10px)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '30px',
                  fontSize: '13px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  opacity: 0,
                  pointerEvents: 'none',
                  transition: 'all 0.4s ease',
                  border: '1px solid var(--accent-primary)',
                  boxShadow: '0 15px 35px rgba(0,212,255,0.2)',
                  zIndex: 20
                }}>
                  {b.name || b.username}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .orbit-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 650px;
          overflow: visible;
        }
        @keyframes rotateOrbit {
          from { transform: rotateX(60deg) rotateZ(0deg); }
          to { transform: rotateX(60deg) rotateZ(360deg); }
        }
        @keyframes counterRotate {
          from { transform: rotateX(-60deg) rotateZ(360deg); }
          to { transform: rotateX(-60deg) rotateZ(0deg); }
        }
        .builder-node:hover .glass-card {
          transform: rotateX(-60deg) scale(1.4) translateY(-15px);
          background: var(--bg-tertiary);
          border-color: var(--accent-primary);
          box-shadow: 0 20px 60px rgba(0,212,255,0.25);
          z-index: 100;
        }
        .builder-node:hover .hover-info {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
    </div>
  )
}
