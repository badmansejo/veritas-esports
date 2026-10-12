import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import MarketplaceItem from './MarketplaceItem'
import MarketplaceCategory from './MarketplaceCategory'
import './Marketplace.css'

const DEFAULT_CATEGORIES = [
  'All',
  'Name Effects',
  'Name Fonts',
  'Profile Frames',
  'Backgrounds',
  'Badges',
  'Bundles',
]

function getPreviewData(item) {
  return item?.preview_data && typeof item.preview_data === 'object'
    ? item.preview_data
    : {}
}

function getPreviewText(item, profile) {
  const preview = getPreviewData(item)

  return (
    preview.preview_text ||
    preview.text ||
    preview.display_text ||
    profile?.username ||
    'VERITAS PLAYER'
  )
}

function getPreviewStyle(item) {
  const preview = getPreviewData(item)

  const style = {
    '--preview-intensity': `${Number(preview.intensity ?? 70)}%`,
  }

  if (preview.background_color) {
    style.background = preview.background_color
  }

  if (preview.text_color) {
    style.color = preview.text_color
  }

  if (preview.glow_color) {
    style.textShadow = `0 0 14px ${preview.glow_color}`
  }

  return style
}

function MarketplacePreview({ item, profile }) {
  const preview = getPreviewData(item)

  const itemType = String(
    item?.item_type ||
      item?.category?.name ||
      ''
  ).toLowerCase()

  const name = String(item?.name || '').toLowerCase()

  const isBadge =
    itemType.includes('badge') ||
    name.includes('verified') ||
    Boolean(preview.badge) ||
    Boolean(preview.badge_design)

  const isFrame =
    itemType.includes('frame') ||
    Boolean(preview.frame) ||
    Boolean(preview.profile_frame)

  const isBackground =
    itemType.includes('background') ||
    Boolean(preview.background) ||
    Boolean(preview.profile_background)

  const isEffect =
    itemType.includes('effect') ||
    Boolean(preview.effect) ||
    Boolean(preview.name_effect)

  const isFont =
    itemType.includes('font') ||
    Boolean(preview.font) ||
    Boolean(preview.name_font)

  if (isBadge) {
    return (
      <div className="marketplace-live-preview marketplace-live-preview-badge">
        <MarketplaceItem
          item={item}
          onView={() => {}}
          onBuy={() => {}}
          compactPreview
          previewUsername={profile?.username}
        />
      </div>
    )
  }

  const previewClass = [
    'marketplace-username-preview',
    isEffect ? `preview-effect-${String(preview.effect || preview.name_effect || '').toLowerCase().replace(/\s+/g, '-')}` : '',
    isFont ? `preview-font-${String(preview.font || preview.name_font || '').toLowerCase().replace(/\s+/g, '-')}` : '',
    isFrame ? `preview-frame-${String(preview.frame || preview.profile_frame || '').toLowerCase().replace(/\s+/g, '-')}` : '',
    isBackground ? `preview-background-${String(preview.background || preview.profile_background || '').toLowerCase().replace(/\s+/g, '-')}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className="marketplace-live-preview"
      style={getPreviewStyle(item)}
    >
      <div className={previewClass || 'marketplace-username-preview'}>
        {getPreviewText(item, profile)}
      </div>
    </div>
  )
}

export default function Marketplace() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()

  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [buying, setBuying] = useState(false)

  const username = profile?.username || 'VERITAS PLAYER'

  const vcoins = Number(
    profile?.vcoins ??
      profile?.v_coins ??
      profile?.vcoins_balance ??
      0
  )

  useEffect(() => {
    loadMarketplace()
  }, [])

  async function loadMarketplace() {
    setLoading(true)
    setMessage('')

    const [{ data: itemData, error: itemError }, { data: categoryData }] =
      await Promise.all([
        supabase
          .from('marketplace_items')
          .select(`
            *,
            category:marketplace_categories(
              id,
              name,
              display_order,
              is_active
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),

        supabase
          .from('marketplace_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
      ])

    if (itemError) {
      console.error(itemError)
      setMessage(itemError.message || 'Unable to load marketplace.')
    } else {
      setItems(itemData || [])
    }

    setCategories(categoryData || [])
    setLoading(false)
  }

  const categoryNames = useMemo(() => {
    const allowed = new Set(DEFAULT_CATEGORIES.slice(1))

    const databaseCategories = (categories || [])
      .map((category) => category?.name)
      .filter((name) => name && allowed.has(name))

    return [
      'All',
      ...DEFAULT_CATEGORIES.slice(1).filter((name) =>
        databaseCategories.includes(name)
      ),
    ]
  }, [categories])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    return items.filter((item) => {
      const categoryName = item?.category?.name || ''

      const matchesCategory =
        selectedCategory === 'All' ||
        categoryName === selectedCategory

      const matchesSearch =
        !query ||
        String(item?.name || '').toLowerCase().includes(query) ||
        String(item?.description || '').toLowerCase().includes(query) ||
        String(item?.item_type || '').toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [items, selectedCategory, search])

  const featuredItems = useMemo(() => {
    return items.slice(0, 6)
  }, [items])

  async function handleBuy(item) {
    if (!item?.id) return

    const price = Number(item.price_vcoins || 0)

    if (price <= 0) {
      setMessage('This item is free.')
      return
    }

    if (vcoins < price) {
      setMessage(`You need ${price} V Coins to purchase this item.`)
      return
    }

    setBuying(true)
    setMessage('')

    try {
      const { data, error } = await supabase.rpc('spend_vcoins', {
        p_item_id: item.id,
        p_quantity: 1,
      })

      if (error) {
        console.error(error)
        setMessage(error.message || 'Purchase failed.')
        return
      }

      if (data?.success === false) {
        setMessage(data?.message || 'Purchase failed.')
        return
      }

      setMessage(`${item.name} purchased successfully.`)
      setSelectedItem(null)

      if (refreshProfile) {
        await refreshProfile()
      }

      await loadMarketplace()
    } catch (error) {
      console.error(error)
      setMessage('Purchase failed. Please try again.')
    } finally {
      setBuying(false)
    }
  }

  function openItem(item) {
    setSelectedItem(item)
    setMessage('')
  }

  function closeItem() {
    if (!buying) {
      setSelectedItem(null)
    }
  }

  return (
    <div className="marketplace-page">
      <header className="marketplace-header">
        <div>
          <button
            type="button"
            className="marketplace-back"
            onClick={() => navigate(-1)}
          >
            ? Back
          </button>

          <h1>Marketplace</h1>
          <p>Customize your VERITAS identity.</p>
        </div>

        <button
          type="button"
          className="marketplace-vcoins-card"
          onClick={() => navigate('/wallet')}
        >
          <span className="marketplace-vcoins-label">V COINS</span>
          <strong>{vcoins.toLocaleString()}</strong>
          <span className="marketplace-vcoins-plus">+</span>
        </button>
      </header>

      {message && (
        <div className="marketplace-message">
          {message}
        </div>
      )}

      <section className="marketplace-featured">
        <div className="marketplace-section-heading">
          <div>
            <span>VERITAS STORE</span>
            <h2>Featured</h2>
          </div>
        </div>

        {featuredItems.length > 0 && (
          <div className="marketplace-featured-grid">
            {featuredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="marketplace-featured-card"
                onClick={() => openItem(item)}
              >
                <MarketplacePreview
                  item={item}
                  profile={profile}
                />

                <div className="marketplace-featured-info">
                  <span>
                    {item.category?.name || item.item_type || 'Cosmetic'}
                  </span>

                  <strong>{item.name}</strong>

                  <small>
                    {Number(item.price_vcoins || 0).toLocaleString()} V Coins
                  </small>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="marketplace-controls">
        <div className="marketplace-search">
          <span>?</span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search items..."
          />
        </div>

        <div className="marketplace-category-bar">
          {categoryNames.map((category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory === category
                  ? 'active'
                  : ''
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="marketplace-catalogue">
        <div className="marketplace-section-heading">
          <div>
            <span>COLLECTION</span>
            <h2>
              {selectedCategory === 'All'
                ? 'All Items'
                : selectedCategory}
            </h2>
          </div>

          <small>
            {filteredItems.length} item
            {filteredItems.length === 1 ? '' : 's'}
          </small>
        </div>

        {loading ? (
          <div className="marketplace-empty">
            Loading marketplace...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="marketplace-empty">
            No marketplace items found.
          </div>
        ) : (
          <div className="marketplace-grid">
            {filteredItems.map((item) => (
              <MarketplaceItem
                key={item.id}
                item={item}
                onView={() => openItem(item)}
                onBuy={() => handleBuy(item)}
                previewUsername={username}
              />
            ))}
          </div>
        )}
      </section>

      {selectedItem && (
        <div
          className="marketplace-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeItem()
            }
          }}
        >
          <div className="marketplace-modal">
            <button
              type="button"
              className="marketplace-modal-close"
              onClick={closeItem}
              disabled={buying}
            >
              ×
            </button>

            <div className="marketplace-modal-preview">
              <MarketplacePreview
                item={selectedItem}
                profile={profile}
              />
            </div>

            <div className="marketplace-modal-content">
              <span className="marketplace-item-type">
                {selectedItem.category?.name ||
                  selectedItem.item_type ||
                  'Cosmetic'}
              </span>

              <h2>{selectedItem.name}</h2>

              {selectedItem.description && (
                <p>{selectedItem.description}</p>
              )}

              <div className="marketplace-modal-price">
                <span>Price</span>
                <strong>
                  {Number(
                    selectedItem.price_vcoins || 0
                  ).toLocaleString()}{' '}
                  V Coins
                </strong>
              </div>

              <div className="marketplace-modal-balance">
                Your balance:{' '}
                <strong>
                  {vcoins.toLocaleString()} V Coins
                </strong>
              </div>

              <button
                type="button"
                className="marketplace-buy-button"
                onClick={() => handleBuy(selectedItem)}
                disabled={buying}
              >
                {buying ? 'Processing...' : 'Buy Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
