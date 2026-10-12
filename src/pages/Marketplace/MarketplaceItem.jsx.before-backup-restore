import React from 'react'

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getPreview(item) {
  return item?.preview_data && typeof item.preview_data === 'object'
    ? item.preview_data
    : {}
}

function getCategory(item) {
  return String(
    item?.category?.name ||
    item?.item_type ||
    ''
  ).toLowerCase()
}

function getType(item) {
  const category = getCategory(item)
  const name = String(item?.name || '').toLowerCase()

  if (
    category.includes('badge') ||
    name.includes('verified')
  ) return 'badge'

  if (
    category.includes('effect') ||
    category.includes('name effect')
  ) return 'effect'

  if (
    category.includes('font') ||
    category.includes('name font')
  ) return 'font'

  if (
    category.includes('frame') ||
    category.includes('profile frame')
  ) return 'frame'

  if (
    category.includes('background') ||
    category.includes('profile background')
  ) return 'background'

  if (category.includes('bundle')) return 'bundle'

  return 'cosmetic'
}

function getUsername(item, previewUsername) {
  const preview = getPreview(item)

  return (
    preview.preview_text ||
    preview.text ||
    preview.display_text ||
    previewUsername ||
    'VERITAS PLAYER'
  )
}

function getBadgeDesign(item) {
  const preview = getPreview(item)

  return (
    preview.badge_design ||
    preview.badgeDesign ||
    null
  )
}

function getBadgeStyle(item) {
  const preview = getPreview(item)
  const design = getBadgeDesign(item)

  const itemName = String(item?.name || '').toLowerCase()
  const badgeName = String(
    preview.badge || item?.name || ''
  ).toLowerCase()

  const verified =
    itemName === 'verified' ||
    badgeName === 'verified'

  if (verified) {
    return {
      shape: 'circle',
      color: '#16c75a',
      gradient: '#087b3d',
      border: '#baffd1',
      iconColor: '#ffffff',
      glowColor: '#16c75a',
      borderWidth: 3,
      size: 62,
      glow: true,
      metallic: true,
    }
  }

  if (design) {
    return {
      shape: design.shape || 'circle',
      color: design.color || '#16c75a',
      gradient: design.gradient || '#087b3d',
      border: design.border || '#baffd1',
      iconColor: design.iconColor || '#ffffff',
      glowColor: design.glowColor || design.color || '#16c75a',
      borderWidth: Number(design.borderWidth ?? 3),
      size: Number(design.size ?? 62),
      glow: design.glow !== false,
      metallic: design.metallic !== false,
    }
  }

  const badgeStyles = {
    elite: ['#b7c5ff', '#394a9b', '#e6ebff'],
    founder: ['#ffe28a', '#8d6200', '#fff2ad'],
    legend: ['#ffcf5a', '#704400', '#fff0a8'],
    master: ['#d9e2ff', '#4a5d94', '#ffffff'],
    royal: ['#d8a8ff', '#59228c', '#f0d8ff'],
    diamond: ['#bcecff', '#277d9d', '#eaffff'],
    platinum: ['#d8dce2', '#5f6670', '#ffffff'],
    gold: ['#ffd45a', '#8b5d00', '#fff0a6'],
    silver: ['#d8dce2', '#59616b', '#ffffff'],
    champion: ['#ffe66b', '#805900', '#fff5a8'],
    warrior: ['#ff7d68', '#701b12', '#ffd0c7'],
    king: ['#ffd45a', '#684800', '#fff0a5'],
    queen: ['#ff9fe3', '#79225e', '#ffd8f2'],
    titan: ['#aebcff', '#283a82', '#dfe4ff'],
    phoenix: ['#ff8a4d', '#8a2100', '#ffd1a8'],
    lightning: ['#efff5a', '#5c6800', '#ffffff'],
    fire: ['#ff7038', '#781b00', '#ffd0b8'],
    frost: ['#9deaff', '#175d8c', '#e5fbff'],
    cyber: ['#55fff1', '#075b64', '#cffffa'],
    galaxy: ['#c9a5ff', '#452078', '#ead9ff'],
    shadow: ['#a5aab3', '#171a20', '#d8dce2'],
    neon: ['#ff64ee', '#72115f', '#ffd2f8'],
    cosmic: ['#8ea6ff', '#293c91', '#dbe2ff'],
    storm: ['#b7c6d8', '#334457', '#edf5ff'],
    thunder: ['#f4ff61', '#596500', '#ffffff'],
    crystal: ['#a9f5ff', '#28717e', '#eaffff'],
    ruby: ['#ff617b', '#721326', '#ffd0d8'],
    emerald: ['#5affac', '#08713e', '#d2ffe7'],
    sapphire: ['#68a9ff', '#154a9c', '#d6e7ff'],
    amethyst: ['#d17cff', '#5a1c83', '#efd2ff'],
    obsidian: ['#8b919b', '#101216', '#d2d5da'],
    chrome: ['#d9e1e8', '#66717d', '#ffffff'],
    carbon: ['#7c858f', '#1c2025', '#c8ced4'],
    hologram: ['#78ffe9', '#4737a0', '#ffffff'],
    prism: ['#ff8fe5', '#3d6dff', '#ffffff'],
    crown: ['#ffd45a', '#714900', '#fff1a4'],
    vip: ['#d18aff', '#5e2189', '#f0d0ff'],
    pro: ['#5ec7ff', '#174e80', '#d8f2ff'],
    supreme: ['#ff7db8', '#751343', '#ffd5e8'],
    racer: ['#ff5757', '#721111', '#ffc8c8'],
    gamer: ['#57ffcf', '#086550', '#d3fff3'],
    boss: ['#ffcb58', '#694700', '#fff0a2'],
    mvp: ['#7ec9ff', '#1a5485', '#def2ff'],
    veritas: ['#16c75a', '#087b3d', '#baffd1'],
    'veritas-gold': ['#16c75a', '#087b3d', '#ffe18a'],
    'veritas-elite': ['#16c75a', '#07572d', '#d8ffe5'],
    'veritas-champion': ['#16c75a', '#086b38', '#fff0a1'],
    'veritas-legend': ['#16c75a', '#064a27', '#ffe28b'],
    ultimate: ['#ffffff', '#343943', '#ffffff'],
  }

  const styleName = slug(
    preview.badge_style ||
    preview.badge ||
    item?.name
  )

  const colors =
    badgeStyles[styleName] ||
    ['#16c75a', '#087b3d', '#baffd1']

  return {
    shape: 'circle',
    color: colors[0],
    gradient: colors[1],
    border: colors[2],
    iconColor: '#ffffff',
    glowColor: colors[0],
    borderWidth: 3,
    size: 62,
    glow: true,
    metallic: true,
  }
}

function getBadgeIcon(item) {
  const preview = getPreview(item)
  const design = getBadgeDesign(item)

  if (design?.icon) return design.icon

  const badgeIcons = {
    verified: '?',
    elite: '?',
    founder: '?',
    legend: '?',
    master: '?',
    royal: '?',
    diamond: '?',
    platinum: 'P',
    gold: 'G',
    silver: 'S',
    champion: '?',
    warrior: '?',
    king: 'K',
    queen: 'Q',
    titan: 'T',
    phoenix: '?',
    lightning: '?',
    fire: 'F',
    frost: '?',
    cyber: 'C',
    galaxy: '?',
    shadow: 'S',
    neon: 'N',
    cosmic: '?',
    storm: '?',
    thunder: '?',
    crystal: '?',
    ruby: 'R',
    emerald: 'E',
    sapphire: 'S',
    amethyst: 'A',
    obsidian: 'O',
    chrome: 'C',
    carbon: 'C',
    hologram: 'H',
    prism: 'P',
    crown: '?',
    vip: 'V',
    pro: 'P',
    supreme: 'S',
    racer: 'R',
    gamer: 'G',
    boss: 'B',
    mvp: 'M',
    veritas: 'V',
    'veritas-gold': 'V',
    'veritas-elite': 'V',
    'veritas-champion': 'V',
    'veritas-legend': 'V',
    ultimate: 'U',
  }

  const name = slug(
    preview.badge ||
    item?.name
  )

  return badgeIcons[name] || '?'
}

function BadgePreview({ item }) {
  const design = getBadgeStyle(item)
  const icon = getBadgeIcon(item)

  const verified =
    String(item?.name || '').toLowerCase() === 'verified'

  const shapeClass = `badge-shape-${slug(design.shape)}`

  const style = {
    width: `${design.size}px`,
    height: `${design.size}px`,
    background: `linear-gradient(145deg, ${design.color}, ${design.gradient})`,
    border: `${design.borderWidth}px solid ${design.border}`,
    color: design.iconColor,
    boxShadow: design.glow
      ? `0 0 10px ${design.glowColor}, 0 0 25px ${design.glowColor}66`
      : 'none',
  }

  return (
    <div className="marketplace-badge-preview-wrap">
      <div
        className={`marketplace-custom-badge ${shapeClass} ${design.metallic ? 'badge-metallic' : ''}`}
        style={style}
      >
        <span>{icon}</span>
      </div>

      {verified && (
        <div className="marketplace-verified-label">
          VERIFIED
        </div>
      )}
    </div>
  )
}

function getVisualClass(item) {
  const preview = getPreview(item)

  const effect = slug(
    preview.effect ||
    preview.name_effect ||
    item?.name
  )

  const font = slug(
    preview.font ||
    preview.name_font ||
    item?.name
  )

  const frame = slug(
    preview.frame ||
    preview.profile_frame ||
    item?.name
  )

  const background = slug(
    preview.background ||
    preview.profile_background ||
    item?.name
  )

  return {
    effect: `marketplace-effect-${effect}`,
    font: `marketplace-font-${font}`,
    frame: `marketplace-frame-${frame}`,
    background: `marketplace-background-${background}`,
  }
}

function TextPreview({ item, previewUsername }) {
  const preview = getPreview(item)
  const classes = getVisualClass(item)
  const type = getType(item)

  const username = getUsername(
    item,
    previewUsername
  )

  const image =
    preview.background_image ||
    preview.preview_image ||
    preview.image_url ||
    null

  const style = {}

  if (image) {
    style.backgroundImage = `url("${image}")`
  }

  if (preview.text_color) {
    style.color = preview.text_color
  }

  if (preview.glow_color) {
    style.textShadow = `0 0 12px ${preview.glow_color}`
  }

  return (
    <div
      className={`marketplace-live-preview ${classes.background} marketplace-type-${type}`}
      style={style}
    >
      <div
        className={[
          'marketplace-username-preview',
          classes.effect,
          classes.font,
          classes.frame,
        ].join(' ')}
      >
        {username}
      </div>
    </div>
  )
}

export default function MarketplaceItem({
  item,
  onView,
  onBuy,
  compactPreview = false,
  previewUsername,
}) {
  const type = getType(item)

  const isBadge = type === 'badge'

  const price = Number(item?.price_vcoins || 0)

  return (
    <article
      className={[
        'marketplace-item-card',
        isBadge ? 'marketplace-card-badge' : '',
        compactPreview ? 'marketplace-card-compact' : '',
      ].join(' ')}
    >
      {isBadge ? (
        <div className="marketplace-live-preview marketplace-live-preview-badge">
          <BadgePreview item={item} />
        </div>
      ) : (
        <TextPreview
          item={item}
          previewUsername={previewUsername}
        />
      )}

      {!compactPreview && (
        <div className="marketplace-item-content">
          <div className="marketplace-item-type">
            {item?.category?.name ||
              item?.item_type ||
              'Cosmetic'}
          </div>

          <h3>{item?.name || 'Marketplace Item'}</h3>

          {item?.description && (
            <p>{item.description}</p>
          )}

          <div className="marketplace-item-bottom">
            <strong>
              {price.toLocaleString()} V Coins
            </strong>

            <button
              type="button"
              onClick={onView}
            >
              View
            </button>
          </div>

          {item?.is_limited && (
            <div className="marketplace-limited">
              LIMITED
            </div>
          )}
        </div>
      )}
    </article>
  )
}
