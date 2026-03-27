'use client'

import React, { useMemo, useState } from 'react'

type TimeRange = '1h' | '6h' | '7d' | '30d'

interface PriceChartProps {
  mint: string
  price: number
  priceChange: number
}

function generateMockPrices(seed: string, range: TimeRange, basePrice: number): number[] {
  // Deterministic mock for demo
  const count = { '1h': 20, '6h': 30, '7d': 40, '30d': 50 }[range]
  const volatility = { '1h': 0.02, '6h': 0.05, '7d': 0.15, '30d': 0.3 }[range]

  const prices: number[] = []
  let price = basePrice * 0.8

  for (let i = 0; i < count; i++) {
    const char = seed.charCodeAt(i % seed.length) / 255
    const change = (char - 0.5) * volatility * price
    price = Math.max(price + change, 0.0000001)
    prices.push(price)
  }
  // Force last price to be current price
  prices[prices.length - 1] = basePrice
  return prices
}

export default function PriceChart({ mint, price, priceChange }: PriceChartProps) {
  const [range, setRange] = useState<TimeRange>('7d')
  const ranges: TimeRange[] = ['1h', '6h', '7d', '30d']

  const prices = useMemo(
    () => generateMockPrices(mint + range, range, price),
    [mint, range, price]
  )

  const isUp = priceChange >= 0
  const lineColor = isUp ? '#22c55e' : '#ef4444'

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const width = 400
  const height = 70
  const pad = 2

  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (width - pad * 2)
    const y = pad + ((max - p) / (max - min + 0.0000001)) * (height - pad * 2)
    return `${x},${y}`
  })

  const polyline = points.join(' ')
  const areaPath = `M${points[0]} L${points.join(' L')} L${width - pad},${height} L${pad},${height} Z`

  return (
    <div>
      {/* Time range pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {ranges.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              background: range === r ? '#1a1a1a' : 'transparent',
              color: range === r ? '#fff' : '#555',
              border: `1px solid ${range === r ? '#2a2a2a' : 'transparent'}`,
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* SVG chart */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 70, display: 'block' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaPath} fill="url(#chartGrad)" />
        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
