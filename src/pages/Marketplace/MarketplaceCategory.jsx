import React from 'react'

export default function MarketplaceCategory({
  name,
  icon,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex min-w-max items-center gap-2 rounded-xl
        border px-4 py-2.5
        text-sm font-semibold
        transition-all duration-200

        ${
          active
            ? 'border-white/30 bg-white text-black shadow-lg shadow-white/10'
            : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
        }
      `}
    >
      <span className="text-base">
        {icon}
      </span>

      <span>
        {name}
      </span>
    </button>
  )
}