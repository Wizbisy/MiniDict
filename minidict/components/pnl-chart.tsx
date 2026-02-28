"use client"

import { useMemo, useState } from "react"

interface PnLDataPoint {
  label: string
  value: number
  cumulative: number
}

interface PnLLineChartProps {
  data: PnLDataPoint[]
  height?: number
}

export function PnlChart({ data, height = 180 }: PnLLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const chartData = useMemo(() => {
    if (data.length < 2) return null

    const values = data.map((d) => d.cumulative)
    const min = Math.min(0, ...values)
    const max = Math.max(0, ...values)
    const range = max - min || 1
    const padding = range * 0.15
    const adjMin = min - padding
    const adjMax = max + padding
    const adjRange = adjMax - adjMin

    const w = 340
    const h = height - 36
    const step = w / (data.length - 1)

    const points = data.map((d, i) => ({
      x: i * step,
      y: h - ((d.cumulative - adjMin) / adjRange) * h,
    }))

    const zeroY = h - ((0 - adjMin) / adjRange) * h

    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const cp = (points[i].x - points[i - 1].x) * 0.4
      path += ` C ${points[i - 1].x + cp} ${points[i - 1].y}, ${points[i].x - cp} ${points[i].y}, ${points[i].x} ${points[i].y}`
    }

    const areaPath = `${path} L ${points[points.length - 1].x} ${zeroY} L ${points[0].x} ${zeroY} Z`

    const isPositive = data[data.length - 1].cumulative >= 0

    return { points, path, areaPath, zeroY, w, h, isPositive }
  }, [data, height])

  if (!chartData || data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-zinc-400">No resolved markets yet</p>
      </div>
    )
  }

  const { points, path, areaPath, zeroY, w, h, isPositive } = chartData
  const current = hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1]
  const color = isPositive ? "#22c55e" : "#ef4444"

  return (
    <div className="relative select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div>
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Net P&L</p>
          <p className={`text-xl font-bold ${current.cumulative >= 0 ? "text-green-500" : "text-red-500"}`}>
            {current.cumulative >= 0 ? "+" : ""}${Math.abs(current.cumulative).toFixed(2)}
          </p>
        </div>
        {hoveredIndex !== null && (
          <div className="text-right">
            <p className="text-[10px] text-zinc-400">{current.label}</p>
            <p className={`text-sm font-medium ${current.value >= 0 ? "text-green-500" : "text-red-500"}`}>
              {current.value >= 0 ? "+" : ""}${Math.abs(current.value).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* SVG */}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full overflow-visible"
        style={{ height: h }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="pnlLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#pnlLineGrad)" />

        {/* Line */}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover zones */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - w / data.length / 2}
            y={0}
            width={w / data.length}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
            onTouchStart={() => setHoveredIndex(i)}
          />
        ))}

        {/* Hovered crosshair + dot */}
        {hoveredIndex !== null && (
          <>
            <line x1={points[hoveredIndex].x} y1={0} x2={points[hoveredIndex].x} y2={h} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            <circle cx={points[hoveredIndex].x} cy={points[hoveredIndex].y} r={4} fill={color} stroke="#000" strokeWidth={2} />
          </>
        )}

        {/* Endpoint pulse */}
        {hoveredIndex === null && (
          <>
            <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3.5} fill={color} stroke="#000" strokeWidth={2} />
            <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={7} fill={color} opacity={0.15}>
              <animate attributeName="r" values="7;11;7" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
    </div>
  )
}
