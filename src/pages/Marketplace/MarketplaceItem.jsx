import React from 'react'

export default function MarketplaceItem({
  item,
  onPreview,
}) {
  return (
    <article
      className="
        group relative overflow-hidden rounded-2xl
        border border-white/10 bg-white/[0.045]
        backdrop-blur-xl
        transition-all duration-300
        hover:-translate-y-1
        hover:border-white/20
        hover:bg-white/[0.07]
      "
    >

      {/* Preview area */}
      <button
        type="button"
        onClick={() => onPreview(item)}
        className="block w-full text-left"
      >

        <div
          className="
            relative flex h-44 items-center justify-center
            overflow-hidden
            bg-gradient-to-br from-white/[0.08]
            via-transparent to-white/[0.03]
          "
        >

          {/* Glow */}
          <div
            className="
              absolute h-28 w-28 rounded-full
              bg-white/[0.08] blur-3xl
              transition-all duration-500
              group-hover:bg-white/[0.14]
            "
          />

          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="
                relative z-10 max-h-32 max-w-[80%]
                object-contain
                transition-transform duration-300
                group-hover:scale-105
              "
            />
          ) : (
            <div
              className="
                relative z-10 flex h-24 w-24
                items-center justify-center
                rounded-2xl border border-white/10
                bg-black/30 text-4xl
              "
            >
              ✦
            </div>
          )}

          {/* Limited badge */}
          {item.is_limited && (
            <span
              className="
                absolute right-3 top-3 rounded-full
                border border-white/15
                bg-black/60 px-2.5 py-1
                text-[10px] font-bold uppercase
                tracking-wider text-white
                backdrop-blur-md
              "
            >
              Limited
            </span>
          )}

        </div>

        {/* Item information */}
        <div className="p-4">

          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/40">
            {item.item_type || 'VERITAS Item'}
          </div>

          <h3 className="truncate text-base font-bold text-white">
            {item.name}
          </h3>

          <p className="mt-1 line-clamp-2 min-h-[40px] text-xs leading-5 text-white/50">
            {item.description ||
              'A unique VERITAS item for your profile.'}
          </p>

        </div>
      </button>

      {/* Bottom action */}
      <div
        className="
          flex items-center justify-between
          border-t border-white/10 px-4 py-3
        "
      >

        <div>

          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Price
          </div>

          <div className="mt-0.5 flex items-center gap-1.5">

            <span className="text-sm">
              🪙
            </span>

            <span className="font-bold text-white">
              {Number(
                item.price_vcoins || 0
              ).toLocaleString()}
            </span>

            <span className="text-xs text-white/40">
              V Coins
            </span>

          </div>

        </div>

        <button
          type="button"
          onClick={() => onPreview(item)}
          className="
            rounded-xl border border-white/15
            bg-white/[0.08] px-3 py-2
            text-xs font-bold text-white
            transition
            hover:bg-white
            hover:text-black
          "
        >
          View
        </button>

      </div>
    </article>
  )
}