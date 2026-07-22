"use client"

import * as React from "react"

interface ConsistencyTreeProps {
  stage: 0 | 1 | 2 | 3
  totalReports: number
  className?: string
}

const STAGE_LABELS: Record<0 | 1 | 2 | 3, { title: string; desc: string }> = {
  0: { title: "غراس البداية", desc: "بداية رحلة الغراس والمثابرة اليومية." },
  1: { title: "فسيلة ناضرة", desc: "بدأت أوراق الثبات والالتزام بالظهور." },
  2: { title: "شجرة ثابته", desc: "جذور متينة وأغصان طيّبة تنمو مع كل أسبوع." },
  3: { title: "شجرة طيبة أصلها ثابت", desc: "ثبات وإتقان مبارك بثمار الاستمرار." },
}

export function ConsistencyTree({ stage, totalReports, className = "" }: ConsistencyTreeProps) {
  const info = STAGE_LABELS[stage]

  return (
    <div className={`bg-gradient-to-b from-emerald-500/5 to-transparent border border-emerald-200/50 dark:border-emerald-950/30 p-6 rounded-2xl flex flex-col items-center text-center gap-4 ${className}`}>
      <div className="flex flex-col items-center">
        <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 font-display">
          شجرة المثابرة والرسوخ
        </h3>
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
          {info.title}
        </p>
      </div>

      {/* SVG Tree Illustration */}
      <div className="w-36 h-36 relative flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-xs">
          {/* Ground curve */}
          <path
            d="M 20 140 Q 80 130 140 140"
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.3"
          />

          {stage === 0 && (
            <g className="transition-all duration-500">
              {/* Mound */}
              <ellipse cx="80" cy="135" rx="16" ry="6" fill="#047857" opacity="0.2" />
              {/* Sprout stem */}
              <path d="M 80 135 Q 80 120 83 110" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
              {/* Left Leaf */}
              <path d="M 83 110 Q 72 102 74 114 Q 80 114 83 110" fill="#10b981" />
              {/* Right Leaf */}
              <path d="M 83 110 Q 94 102 92 114 Q 86 114 83 110" fill="#34d399" />
            </g>
          )}

          {stage === 1 && (
            <g className="transition-all duration-500">
              <ellipse cx="80" cy="136" rx="22" ry="7" fill="#047857" opacity="0.25" />
              {/* Stem */}
              <path d="M 80 136 Q 78 100 80 80" fill="none" stroke="#047857" strokeWidth="5" strokeLinecap="round" />
              {/* Leaves */}
              <path d="M 80 105 Q 60 95 65 110 Q 75 110 80 105" fill="#059669" />
              <path d="M 80 95 Q 100 85 95 100 Q 85 100 80 95" fill="#10b981" />
              <path d="M 80 80 Q 68 68 70 82 Q 78 82 80 80" fill="#34d399" />
              <path d="M 80 80 Q 92 68 90 82 Q 82 82 80 80" fill="#059669" />
            </g>
          )}

          {stage === 2 && (
            <g className="transition-all duration-500">
              {/* Shadow */}
              <ellipse cx="80" cy="138" rx="35" ry="9" fill="#047857" opacity="0.2" />
              {/* Trunk */}
              <path d="M 76 138 Q 78 100 74 75 Q 82 75 84 138 Z" fill="#78350f" opacity="0.8" />
              {/* Canopy circles */}
              <circle cx="80" cy="65" r="28" fill="#059669" />
              <circle cx="62" cy="72" r="20" fill="#047857" />
              <circle cx="98" cy="72" r="20" fill="#10b981" />
              <circle cx="80" cy="50" r="20" fill="#34d399" />
            </g>
          )}

          {stage === 3 && (
            <g className="transition-all duration-500">
              <ellipse cx="80" cy="138" rx="42" ry="10" fill="#047857" opacity="0.25" />
              {/* Thick Trunk */}
              <path d="M 73 138 Q 78 95 70 65 Q 84 65 87 138 Z" fill="#78350f" />
              {/* Lush Canopy */}
              <circle cx="80" cy="55" r="36" fill="#047857" />
              <circle cx="55" cy="65" r="26" fill="#059669" />
              <circle cx="105" cy="65" r="26" fill="#10b981" />
              <circle cx="80" cy="38" r="26" fill="#34d399" />

              {/* Golden fruit dots */}
              <circle cx="65" cy="50" r="4" fill="#fbbf24" />
              <circle cx="95" cy="52" r="4" fill="#fbbf24" />
              <circle cx="80" cy="32" r="4" fill="#fbbf24" />
              <circle cx="50" cy="70" r="3.5" fill="#f59e0b" />
              <circle cx="110" cy="72" r="3.5" fill="#f59e0b" />
            </g>
          )}
        </svg>
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs leading-relaxed">
        {info.desc} الإجمالي الحالي: <span className="font-bold text-stone-700 dark:text-stone-300 font-mono">{totalReports}</span> تقريراً.
      </p>
    </div>
  )
}
