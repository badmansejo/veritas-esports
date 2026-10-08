import React from 'react'

export default function StyledUsername({
  profile = {},
  equippedItems = [],
  className = '',
}) {
  const items = Array.isArray(equippedItems) ? equippedItems : []

  const badge = items.find((item) =>
    String(item.item_type || '').toLowerCase() === 'badge'
  )

  const font = items.find((item) =>
    String(item.item_type || '').toLowerCase() === 'name font'
  )

  const effect = items.find((item) => {
    const type = String(item.item_type || '').toLowerCase()
    return [
      'name glow',
      'name fire',
      'name ice',
      'name electric',
      'fire',
      'ice',
      'electric',
    ].includes(type)
  })

  const fontData = font?.preview_data || {}
  const effectData = effect?.preview_data || {}
  const badgeData = badge?.preview_data || {}

  const fontMap = {
    orbitron: 'Orbitron, sans-serif',
    rajdhani: 'Rajdhani, sans-serif',
    audiowide: 'Audiowide, sans-serif',
    press_start_2p: '"Press Start 2P", monospace',
    'press-start-2p': '"Press Start 2P", monospace',
    bebas_neue: '"Bebas Neue", sans-serif',
    'bebas-neue': '"Bebas Neue", sans-serif',
  }

  const fontName =
    fontData.font ||
    fontData.name_font ||
    fontData.fontFamily ||
    ''

  const effectType =
    effectData.effect ||
    effectData.name_effect ||
    String(effect?.item_type || '').toLowerCase()

  let effectStyle = {}

  if (effectType.includes('fire')) {
    effectStyle = {
      color: '#ffb000',
      textShadow:
        '0 0 4px #ff6a00, 0 0 10px #ff3d00, 0 0 18px #ff0000',
    }
  } else if (effectType.includes('ice')) {
    effectStyle = {
      color: '#b9f4ff',
      textShadow:
        '0 0 5px #67e8f9, 0 0 12px #22d3ee, 0 0 20px #0284c7',
    }
  } else if (effectType.includes('electric')) {
    effectStyle = {
      color: '#fff700',
      textShadow:
        '0 0 5px #facc15, 0 0 12px #eab308, 0 0 20px #f59e0b',
    }
  } else if (effectType.includes('glow')) {
    effectStyle = {
      color: effectData.color || '#ffffff',
      textShadow: `0 0 6px ${
        effectData.glowColor || effectData.color || '#60a5fa'
      }, 0 0 14px ${
        effectData.glowColor || effectData.color || '#60a5fa'
      }`,
    }
  }

  const badgeShape = String(
    badgeData.shape || badgeData.design || ''
  ).toLowerCase()

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: badgeData.size || 22,
    height: badgeData.size || 22,
    marginRight: 6,
    fontSize: 11,
    fontWeight: 800,
    color: badgeData.iconColor || '#ffffff',
    background:
      badgeData.gradient ||
      badgeData.background ||
      badgeData.color ||
      'rgba(255,255,255,0.12)',
    border:
      badgeData.borderWidth
        ? `${badgeData.borderWidth}px solid ${
            badgeData.border || '#ffffff'
          }`
        : '1px solid rgba(255,255,255,0.25)',
    boxShadow: badgeData.glow
      ? `0 0 10px ${badgeData.glowColor || '#ffffff'}`
      : 'none',
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
    fontFamily: fontMap[fontName] || fontName || 'inherit',
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
            {badgeData.icon || '★'}
          </span>
        </span>
      )}

      <span>{username}</span>
    </span>
  )
}
