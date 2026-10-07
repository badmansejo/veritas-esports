import React from 'react'

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getDesign(item) {
  return item?.preview_data?.badge_design ||
    item?.preview_data?.badgeDesign ||
    null
}

function getPreviewStyle(item) {
  const preview = item?.preview_data || {}
  const design = getDesign(item)

  if (item?.item_type === 'Badge' && design) {
    const shape = design.shape || 'circle'

    let clipPath = 'none'
    let borderRadius = '50%'

    if (shape === 'rounded') {
      borderRadius = '18px'
    }

    if (shape === 'square') {
      borderRadius = '8px'
    }

    if (shape === 'shield') {
      clipPath =
        'polygon(50% 0%, 92% 18%, 86% 72%, 50% 100%, 14% 72%, 8% 18%)'
      borderRadius = '0'
    }

    if (shape === 'hexagon') {
      clipPath =
        'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)'
      borderRadius = '0'
    }

    if (shape === 'diamond') {
      clipPath =
        'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
      borderRadius = '0'
    }

    if (shape === 'star') {
      clipPath =
        'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 94%, 50% 72%, 21% 94%, 32% 57%, 2% 35%, 39% 35%)'
      borderRadius = '0'
    }

    const size = Number(design.size || 62)
    const borderWidth = Number(design.borderWidth || 3)
    const color = design.color || '#16c75a'
    const gradient = design.gradient || '#087b3d'
    const border = design.border || '#baffd1'
    const iconColor = design.iconColor || '#ffffff'
    const glowColor = design.glowColor || color

    return {
      width: `${Math.max(54, Math.min(size, 100))}px`,
      height: `${Math.max(54, Math.min(size, 100))}px`,
      borderRadius,
      clipPath,
      background: `linear-gradient(145deg, ${color}, ${gradient})`,
      border: `${borderWidth}px solid ${border}`,
      color: iconColor,
      fontSize: `${Math.max(20, size * 0.43)}px`,
      fontWeight: 950,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 1,
      textShadow: design.glow
        ? `0 0 8px ${glowColor}, 0 0 18px ${glowColor}`
        : 'none',
      boxShadow: design.glow
        ? `0 0 14px ${glowColor}, 0 0 32px ${glowColor}66, inset 0 1px 0 rgba(255,255,255,.45)`
        : 'inset 0 1px 0 rgba(255,255,255,.45)',
      transform: 'translateZ(0)',
    }
  }

  return null
}

function getPreviewText(item) {
  const preview = item?.preview_data || {}
  const design = getDesign(item)

  if (item?.item_type === 'Badge') {
    return design?.icon || preview.badge_icon || '✓'
  }

  if (item?.item_type === 'Name Font') {
    return 'Aa'
  }

  if (
    item?.item_type === 'Name Fire' ||
    item?.item_type === 'Fire'
  ) {
    return 'FIRE'
  }

  if (
    item?.item_type === 'Name Ice' ||
    item?.item_type === 'Ice'
  ) {
    return 'ICE'
  }

  if (
    item?.item_type === 'Name Electric' ||
    item?.item_type === 'Electric'
  ) {
    return 'VOLT'
  }

  if (item?.item_type === 'Name Glow') {
    return 'GLOW'
  }

  if (item?.item_type === 'Profile Frame') {
    return 'FRAME'
  }

  if (item?.item_type === 'Profile Background') {
    return 'BG'
  }

  if (item?.item_type === 'Room Card') {
    return 'ROOM'
  }

  if (item?.item_type === 'Bundle') {
    return 'BUNDLE'
  }

  return 'V'
}

function getVisualClass(item) {
  const preview = item?.preview_data || {}

  const effect =
    preview.effect ||
    preview.name_effect ||
    ''

  const font =
    preview.font ||
    preview.name_font ||
    ''

  const frame =
    preview.frame ||
    preview.profile_frame ||
    ''

  const background =
    preview.background ||
    preview.profile_background ||
    ''

  return [
    'inventory-visual',
    `inventory-visual-type-${slugify(item?.item_type || '')}`,
    `inventory-visual-effect-${slugify(effect)}`,
    `inventory-visual-font-${slugify(font)}`,
    `inventory-visual-frame-${slugify(frame)}`,
    `inventory-visual-bg-${slugify(background)}`,
  ]
    .filter(Boolean)
    .join(' ')
}

export default function InventoryItem({
  item,
  onView,
  onEquip,
  onUnequip,
}) {
  const quantity = Number(item?.quantity || 1)
  const equipped = item?.equipped === true
  const customBadgeStyle = getPreviewStyle(item)
  const previewText = getPreviewText(item)
  const visualClass = getVisualClass(item)

  function handleView(event) {
    event.preventDefault()
    event.stopPropagation()

    if (typeof onView === 'function') {
      onView(item)
    }
  }

  function handleEquip(event) {
    event.preventDefault()
    event.stopPropagation()

    if (typeof onEquip === 'function') {
      onEquip(item)
    }
  }

  function handleUnequip(event) {
    event.preventDefault()
    event.stopPropagation()

    if (typeof onUnequip === 'function') {
      onUnequip(item)
    }
  }

  return (
    <article className="inventory-item-card">

      <button
        type="button"
        className="inventory-item-preview-button"
        onClick={handleView}
        aria-label={`View ${item?.name || 'item'}`}
      >
        <div className={visualClass}>

          <div className="inventory-item-glow" />

          <div className="inventory-item-preview-content">

            <span className="inventory-item-type">
              {item?.item_type || 'VERITAS ITEM'}
            </span>

            {customBadgeStyle ? (
              <div
                className="inventory-item-symbol inventory-custom-badge"
                style={customBadgeStyle}
              >
                {previewText}
              </div>
            ) : (
              <div className="inventory-item-symbol">
                {previewText}
              </div>
            )}

          </div>

          {quantity > 1 && (
            <div className="inventory-item-quantity">
              x{quantity}
            </div>
          )}

          {equipped && (
            <div className="inventory-item-equipped">
              ✓ EQUIPPED
            </div>
          )}

        </div>
      </button>

      <div className="inventory-item-content">

        <h3>{item?.name || 'VERITAS Item'}</h3>

        <p>
          {item?.description ||
            'VERITAS Marketplace item.'}
        </p>

        <div className="inventory-item-meta">
          <span>
            Quantity: {quantity}
          </span>

          <span>
            {item?.purchase_price_vcoins ?? 0} V Coins
          </span>
        </div>

        <div className="inventory-item-actions">

          <button
            type="button"
            className="inventory-view-button"
            onClick={handleView}
          >
            View Item
          </button>

          {equipped ? (
            <button
              type="button"
              className="inventory-unequip-button"
              onClick={handleUnequip}
            >
              Unequip
            </button>
          ) : (
            <button
              type="button"
              className="inventory-equip-button"
              onClick={handleEquip}
            >
              Equip
            </button>
          )}

        </div>

      </div>

    </article>
  )
}
