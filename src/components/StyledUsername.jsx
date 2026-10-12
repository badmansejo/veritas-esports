import React from 'react'
import './StyledUsername.css'

export default function StyledUsername({
  profile = {},
  equippedItems = [],
  className = '',
}) {
  const items = Array.isArray(equippedItems) ? equippedItems : []

  const getType = (item) =>
    [
      item?.item_type,
      item?.slot_type,
      item?.name,
      item?.slug,
      item?.preview_data?.type,
      item?.preview_data?.item_type,
      item?.preview_data?.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')

  const badge = items.find((item) =>
    /\bbadge\b/.test(getType(item))
  )

  const font = items.find((item) => {
    const type = getType(item)
    const data = item?.preview_data || {}

    return (
      /name font|font name|username font|profile font/.test(type) ||
      data.font ||
      data.name_font ||
      data.fontFamily ||
      data.font_family
    )
  })

  const EFFECT_KEYS = [
    'fire','ice','electric','inferno','frostbite','thunder','neon','galaxy',
    'shadow','ember','flame','blaze','magma','storm','lightning','plasma',
    'void','solar','lunar','ocean','crystal','diamond','phoenix','spectral',
    'venom','rainbow','toxic','aurora','cosmic','royal','ruby','emerald',
    'sapphire','amethyst','obsidian','carbon','energy','pulse','radiant',
    'nova','quantum','cyber','inferno x','frost x','thunder x','galaxy x',
    'shadow x','neon x','titan','legend'
  ]

  const effect = items.find((item) => {
    const data = item?.preview_data || {}
    const text = [
      getType(item),
      item?.name,
      item?.slug,
      data.effect,
      data.name_effect,
      data.effect_type,
      data.name,
      data.category,
      data.item_type,
    ].filter(Boolean).join(' ').toLowerCase().replace(/[_-]+/g, ' ')

    return /username effect|name effect|name glow/.test(text) ||
      EFFECT_KEYS.some((key) => text.includes(key))
  })
  const fontData = font?.preview_data || {}
  const effectData = effect?.preview_data || {}
  const badgeData = badge?.preview_data || {}

  const fontMap = {
    orbitron: 'Orbitron, sans-serif',
    rajdhani: 'Rajdhani, sans-serif',
    audiowide: 'Audiowide, sans-serif',
    press_start_2p: '"Press Start 2P", monospace',
    'press start 2p': '"Press Start 2P", monospace',
    bebas_neue: '"Bebas Neue", sans-serif',
    'bebas neue': '"Bebas Neue", sans-serif',
    roboto: 'Roboto, sans-serif',
    'roboto mono': '"Roboto Mono", monospace',
    oswald: 'Oswald, sans-serif',
    montserrat: 'Montserrat, sans-serif',
    monospace: 'monospace',
    cursive: 'cursive',
    serif: 'serif',
    'sans-serif': 'sans-serif',
  }

  const fontName = String(
    fontData.font ||
    fontData.name_font ||
    fontData.fontFamily ||
    fontData.font_family ||
    fontData.family ||
    fontData.googleFont ||
    fontData.google_font ||
    font?.name ||
    ''
  ).trim()

  const normalizedFont = fontName.toLowerCase().replace(/[_-]+/g, ' ')
  const selectedFont =
    fontMap[normalizedFont] ||
    fontMap[fontName.toLowerCase()] ||
    (fontName ? `"${fontName}", sans-serif` : 'inherit')

  const effectType = [
    getType(effect || {}),
    effectData.effect,
    effectData.name_effect,
    effectData.effect_type,
  ].join(' ').toLowerCase()

  const effectKey = EFFECT_KEYS
    .slice()
    .sort((a, b) => b.length - a.length)
    .find((key) => effectType.includes(key)) || ''

  let effectStyle = {}

  const effectStyles = {
    fire: { color: '#ffb000', textShadow: '0 0 4px #ff6a00, 0 0 10px #ff3d00, 0 0 18px #ff0000' },
    ice: { color: '#b9f4ff', textShadow: '0 0 5px #67e8f9, 0 0 12px #22d3ee, 0 0 20px #0284c7' },
    electric: { color: '#fff700', textShadow: '0 0 5px #facc15, 0 0 12px #eab308, 0 0 20px #f59e0b' },
    inferno: { color: '#ff5a1f', textShadow: '0 0 6px #ff2400, 0 0 18px #ff4500' },
    frostbite: { color: '#d7fbff', textShadow: '0 0 6px #a5f3fc, 0 0 18px #38bdf8' },
    thunder: { color: '#fff56b', textShadow: '0 0 6px #facc15, 0 0 18px #a855f7' },
    neon: { color: '#ff4dff', textShadow: '0 0 6px #ff00ff, 0 0 18px #00eaff' },
    galaxy: { color: '#d8b4fe', textShadow: '0 0 6px #a855f7, 0 0 18px #4f46e5' },
    shadow: { color: '#c4b5fd', textShadow: '0 0 6px #6d28d9, 0 0 18px #111827' },
    ember: { color: '#ffb36b', textShadow: '0 0 6px #f97316, 0 0 18px #dc2626' },
    flame: { color: '#ffd166', textShadow: '0 0 6px #fb923c, 0 0 18px #ef4444' },
    blaze: { color: '#ff7547', textShadow: '0 0 6px #f97316, 0 0 18px #dc2626' },
    magma: { color: '#ff8a4c', textShadow: '0 0 6px #f97316, 0 0 18px #7f1d1d' },
    storm: { color: '#bfdbfe', textShadow: '0 0 6px #60a5fa, 0 0 18px #64748b' },
    lightning: { color: '#fff700', textShadow: '0 0 6px #fde047, 0 0 18px #38bdf8' },
    plasma: { color: '#f0abfc', textShadow: '0 0 6px #e879f9, 0 0 18px #7c3aed' },
    void: { color: '#c4b5fd', textShadow: '0 0 6px #7c3aed, 0 0 18px #312e81' },
    solar: { color: '#fde68a', textShadow: '0 0 6px #fbbf24, 0 0 18px #f97316' },
    lunar: { color: '#e0e7ff', textShadow: '0 0 6px #a5b4fc, 0 0 18px #818cf8' },
    ocean: { color: '#67e8f9', textShadow: '0 0 6px #06b6d4, 0 0 18px #1d4ed8' },
    crystal: { color: '#ccfbf1', textShadow: '0 0 6px #5eead4, 0 0 18px #22d3ee' },
    diamond: { color: '#e0f2fe', textShadow: '0 0 6px #bae6fd, 0 0 18px #38bdf8' },
    phoenix: { color: '#fda4af', textShadow: '0 0 6px #fb7185, 0 0 18px #f97316' },
    spectral: { color: '#ddd6fe', textShadow: '0 0 6px #c084fc, 0 0 18px #22d3ee' },
    venom: { color: '#89ff55', textShadow: '0 0 7px #4cff00, 0 0 25px #00a000' },
    toxic: { color: '#e4ff42', textShadow: '0 0 7px #b8ff00, 0 0 25px #35b800' },
    aurora: { color: '#a7f3d0', textShadow: '0 0 6px #34d399, 0 0 18px #818cf8' },
    cosmic: { color: '#c4b5fd', textShadow: '0 0 6px #818cf8, 0 0 18px #ec4899' },
    royal: { color: '#e9d5ff', textShadow: '0 0 6px #a855f7, 0 0 18px #7e22ce' },
    ruby: { color: '#fda4af', textShadow: '0 0 6px #e11d48, 0 0 18px #9f1239' },
    emerald: { color: '#86efac', textShadow: '0 0 6px #22c55e, 0 0 18px #166534' },
    sapphire: { color: '#93c5fd', textShadow: '0 0 6px #3b82f6, 0 0 18px #1e3a8a' },
    amethyst: { color: '#e9d5ff', textShadow: '0 0 6px #c084fc, 0 0 18px #7e22ce' },
    obsidian: { color: '#d1d5db', textShadow: '0 0 6px #6b7280, 0 0 18px #111827' },
    carbon: { color: '#e5e7eb', textShadow: '0 0 6px #9ca3af, 0 0 18px #374151' },
    energy: { color: '#a5f3fc', textShadow: '0 0 6px #22d3ee, 0 0 18px #8b5cf6' },
    pulse: { color: '#f9a8d4', textShadow: '0 0 6px #ec4899, 0 0 18px #8b5cf6' },
    radiant: { color: '#fef08a', textShadow: '0 0 6px #fde047, 0 0 18px #fb923c' },
    nova: { color: '#f5d0fe', textShadow: '0 0 6px #e879f9, 0 0 18px #6366f1' },
    quantum: { color: '#a5b4fc', textShadow: '0 0 6px #6366f1, 0 0 18px #06b6d4' },
    cyber: { color: '#67e8f9', textShadow: '0 0 6px #06b6d4, 0 0 18px #d946ef' },
    titan: { color: '#e5e7eb', textShadow: '0 0 6px #9ca3af, 0 0 18px #64748b' },
    legend: { color: '#fde68a', textShadow: '0 0 6px #fbbf24, 0 0 18px #b45309' },
  }

  effectStyle = effectStyles[effectKey.replace(/ x$/, '')] || {}

  if (effectKey === 'rainbow') {
    effectStyle = {}
  } else if (effectKey.includes('frost')) {
    effectStyle = effectStyles.frostbite
  } else if (effectKey.includes('thunder')) {
    effectStyle = effectStyles.thunder
  } else if (effectKey.includes('inferno')) {
    effectStyle = effectStyles.inferno
  } else if (!effectKey && effectType.includes('glow')) {
    const glowColor =
      effectData.glowColor || effectData.glow_color ||
      effectData.color || '#60a5fa'

    effectStyle = {
      color: effectData.color || '#ffffff',
      textShadow: `0 0 6px ${glowColor}, 0 0 14px ${glowColor}`,
    }
  }

  if (effectType.includes('fire')) {
    effectStyle = {
      color: '#ffb000',
      textShadow: '0 0 4px #ff6a00, 0 0 10px #ff3d00, 0 0 18px #ff0000',
    }
  } else if (effectType.includes('ice')) {
    effectStyle = {
      color: '#b9f4ff',
      textShadow: '0 0 5px #67e8f9, 0 0 12px #22d3ee, 0 0 20px #0284c7',
    }
  } else if (effectType.includes('electric')) {
    effectStyle = {
      color: '#fff700',
      textShadow: '0 0 5px #facc15, 0 0 12px #eab308, 0 0 20px #f59e0b',
    }
  } else if (effectType.includes('glow')) {
    const glowColor =
      effectData.glowColor || effectData.glow_color ||
      effectData.color || '#60a5fa'

    effectStyle = {
      color: effectData.color || '#ffffff',
      textShadow: `0 0 6px ${glowColor}, 0 0 14px ${glowColor}`,
    }
  }

  const badgeShape = String(
    badgeData.shape || badgeData.design || ''
  ).toLowerCase()

  const badgeSize = Number(badgeData.size) || 22

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: badgeSize,
    height: badgeSize,
    marginRight: 6,
    fontSize: 11,
    fontWeight: 800,
    color: badgeData.iconColor || badgeData.icon_color || '#ffffff',
    background:
      badgeData.gradient ||
      badgeData.background ||
      badgeData.color ||
      'rgba(255,255,255,0.12)',
    border: badgeData.borderWidth
      ? `${badgeData.borderWidth}px solid ${badgeData.border || '#ffffff'}`
      : '1px solid rgba(255,255,255,0.25)',
    boxShadow: badgeData.glow
      ? `0 0 10px ${badgeData.glowColor || '#ffffff'}`
      : 'none',
    flexShrink: 0,
  }

  if (badgeShape === 'circle') {
    badgeStyle.borderRadius = '9999px'
  } else if (badgeShape === 'rounded') {
    badgeStyle.borderRadius = '7px'
  } else if (badgeShape === 'square') {
    badgeStyle.borderRadius = '2px'
  } else if (badgeShape === 'shield') {
    badgeStyle.clipPath =
      'polygon(50% 0%, 90% 15%, 90% 60%, 50% 100%, 10% 60%, 10% 15%)'
  } else if (badgeShape === 'hexagon') {
    badgeStyle.clipPath =
      'polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)'
  } else if (badgeShape === 'diamond') {
    badgeStyle.transform = 'rotate(45deg)'
  } else if (badgeShape === 'star') {
    badgeStyle.clipPath =
      'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
  } else {
    badgeStyle.borderRadius = '6px'
  }

  const username =
    profile.username ||
    profile.name ||
    profile.display_name ||
    'Player'

  const combinedStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: selectedFont,
    fontWeight: 800,
    ...effectStyle,
  }

  return (
    <span className={className} style={combinedStyle}>
      {badge && (
        <span style={badgeStyle}>
          <span
            style={
              badgeShape === 'diamond'
                ? { transform: 'rotate(-45deg)' }
                : undefined
            }
          >
            {badgeData.icon || 'Γÿà'}
          </span>
        </span>
      )}
      <span className={effectKey === 'rainbow' ? 'veritas-username-effect-rainbow' : ''}>{username}</span>
    </span>
  )
}


