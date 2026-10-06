import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import MarketplaceItem from './MarketplaceItem'
import MarketplaceCategory from './MarketplaceCategory'
import './Marketplace.css'

const DEFAULT_CATEGORIES = [
  { name: 'All', icon: 'âœ¦' },
  { name: 'Name Effects', icon: 'âœ¨' },
  { name: 'Fire', icon: 'ðŸ”¥' },
  { name: 'Ice', icon: 'â„ï¸' },
  { name: 'Electric', icon: 'âš¡' },
  { name: 'Name Fonts', icon: 'Aa' },
  { name: 'Profile Frames', icon: 'â–£' },
  { name: 'Backgrounds', icon: 'â—ˆ' },
  { name: 'Badges', icon: 'ðŸ†' },
  { name: 'Bundles', icon: 'ðŸŽ' },
  { name: 'Room Cards', icon: 'ðŸŽŸï¸' },
]

export default function Marketplace() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()

  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])

  const [selectedCategory, setSelectedCategory] = useState('All')
  const [search, setSearch] = useState('')

  const [selectedItem, setSelectedItem] = useState(null)

  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)

  const [error, setError] = useState('')
  const [purchaseMessage, setPurchaseMessage] = useState('')

  useEffect(() => {
    loadMarketplace()
  }, [])

  async function loadMarketplace() {
    setLoading(true)
    setError('')

    try {
      const [itemsResult, categoriesResult] = await Promise.all([
        supabase
          .from('marketplace_items')
          .select(`
            id,
            category_id,
            name,
            description,
            item_type,
            price_vcoins,
            price_kes,
            image_url,
            preview_data,
            is_active,
            is_limited,
            starts_at,
            expires_at,
            created_at
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),

        supabase
          .from('marketplace_categories')
          .select(`
            id,
            name,
            is_active
          `)
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ])

      if (itemsResult.error) {
        throw itemsResult.error
      }

      if (categoriesResult.error) {
        throw categoriesResult.error
      }

      setItems(itemsResult.data || [])
      setCategories(categoriesResult.data || [])
    } catch (err) {
      console.error('Marketplace load error:', err)

      setError(
        err.message || 'Unable to load Marketplace.'
      )
    } finally {
      setLoading(false)
    }
  }

  const categoryButtons = useMemo(() => {
    const databaseCategories = categories.map((category) => {
      const matchingDefault = DEFAULT_CATEGORIES.find(
        (defaultCategory) =>
          defaultCategory.name.toLowerCase() ===
          category.name?.toLowerCase()
      )

      return {
        name: category.name,
        icon: matchingDefault?.icon || 'âœ¦',
      }
    })

    const merged = [...DEFAULT_CATEGORIES]

    databaseCategories.forEach((category) => {
      const exists = merged.some(
        (existing) =>
          existing.name?.toLowerCase() ===
          category.name?.toLowerCase()
      )

      if (!exists) {
        merged.push(category)
      }
    })

    return merged
  }, [categories])

  const filteredItems = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return items.filter((item) => {
      const matchesSearch =
        !searchText ||
        item.name?.toLowerCase().includes(searchText) ||
        item.description?.toLowerCase().includes(searchText) ||
        item.item_type?.toLowerCase().includes(searchText)

      const matchesCategory =
        selectedCategory === 'All' ||
        item.item_type?.toLowerCase() ===
          selectedCategory.toLowerCase() ||
        item.name
          ?.toLowerCase()
          .includes(selectedCategory.toLowerCase())

      return matchesSearch && matchesCategory
    })
  }, [items, search, selectedCategory])

  const featuredItems = items.slice(0, 4)

  function handleBack() {
    navigate('/')
  }

  function openPreview(item) {
    if (purchasing) return

    setPurchaseMessage('')
    setError('')
    setSelectedItem(item)
  }

  function closePreview() {
    if (purchasing) return

    setSelectedItem(null)
    setPurchaseMessage('')
    setError('')
  }

  async function handlePurchase() {
    if (!selectedItem || purchasing) {
      return
    }

    if (!profile?.id) {
      setError('Please log in before purchasing Marketplace items.')
      return
    }

    const price = Number(selectedItem.price_vcoins || 0)
    const balance = Number(profile?.vcoins || 0)

    if (price <= 0) {
      setError('This item does not have a valid V Coin price.')
      return
    }

    if (balance < price) {
      setError(
        `You need ${price.toLocaleString()} V Coins, but you only have ${balance.toLocaleString()}.`
      )
      return
    }

    const purchasedItemName = selectedItem.name

    setPurchasing(true)
    setError('')
    setPurchaseMessage('')

    try {
      const { data, error: purchaseError } = await supabase.rpc(
        'spend_vcoins',
        {
          p_item_id: selectedItem.id,
          p_quantity: 1,
        }
      )

      if (purchaseError) {
        throw purchaseError
      }

      console.log('Marketplace purchase:', data)

      /*
       * The purchase has succeeded in Supabase.
       *
       * Close the modal first so the success message
       * underneath it becomes visible.
       */
      setSelectedItem(null)

      setPurchaseMessage(
        `${purchasedItemName} has been added to your inventory.`
      )

      setError('')

      /*
       * Refresh the displayed V Coin balance.
       *
       * A refresh problem must NOT turn a successful
       * purchase into a failed purchase message.
       */
      try {
        await refreshProfile()
      } catch (profileRefreshError) {
        console.warn(
          'Purchase succeeded, but profile refresh failed:',
          profileRefreshError
        )
      }
    } catch (err) {
      console.error('Marketplace purchase error:', err)

      setPurchaseMessage('')

      setError(
        err.message ||
          'Purchase could not be completed.'
      )
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050608] text-white">

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-15%] top-[-10%] h-80 w-80 rounded-full bg-white/[0.035] blur-[100px]" />

        <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-white/[0.025] blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-7">
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={handleBack}
                className="
                  flex h-10 w-10 items-center justify-center rounded-xl
                  border border-white/10 bg-white/[0.05]
                  text-white/70 transition
                  hover:bg-white/10 hover:text-white
                "
                aria-label="Back to Home"
              >
                â†
              </button>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
                  VERITAS
                </div>

                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Marketplace
                </h1>
              </div>

            </div>

            {/* V Coins balance */}
            <div
              className="
                flex items-center gap-2 rounded-2xl border border-white/10
                bg-white/[0.05] px-3 py-2.5 backdrop-blur-xl
              "
            >
              <span className="text-lg">
                ðŸª™
              </span>

              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/35">
                  V Coins
                </div>

                <div className="text-sm font-black text-white">
                  {Number(
                    profile?.vcoins || 0
                  ).toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/vcoins')}
                className="
                  ml-1 flex h-7 w-7 items-center justify-center
                  rounded-lg bg-white text-sm font-black text-black
                  transition hover:bg-white/80
                "
              >
                +
              </button>
            </div>

          </div>
        </header>

        {/* Hero */}
        <section
          className="
            relative mb-7 overflow-hidden rounded-3xl border border-white/10
            bg-gradient-to-br from-white/[0.09] via-white/[0.035] to-transparent
            p-6 shadow-2xl shadow-black/20 sm:p-8
          "
        >
          <div className="pointer-events-none absolute right-[-50px] top-[-80px] h-64 w-64 rounded-full bg-white/[0.05] blur-3xl" />

          <div className="relative max-w-2xl">

            <div
              className="
                mb-3 inline-flex items-center gap-2 rounded-full
                border border-white/10 bg-black/20 px-3 py-1.5
                text-[10px] font-bold uppercase tracking-[0.18em]
                text-white/55
              "
            >
              <span>âœ¦</span>
              VERITAS Collection
            </div>

            <h2 className="text-3xl font-black leading-tight sm:text-4xl">
              Make your profile

              <span className="block text-white/45">
                unmistakably yours.
              </span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
              Customize your VERITAS identity with exclusive names,
              effects, frames, backgrounds, badges and more.
            </p>

          </div>
        </section>

        {/* Search */}
        <div className="mb-5">
          <div
            className="
              flex items-center gap-3 rounded-2xl border border-white/10
              bg-white/[0.045] px-4 py-3 backdrop-blur-xl
            "
          >
            <span className="text-white/35">
              âŒ•
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search Marketplace..."
              className="
                w-full bg-transparent text-sm text-white outline-none
                placeholder:text-white/30
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-white/40 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="marketplace-scrollbar mb-8 flex gap-2 overflow-x-auto pb-2">
          {categoryButtons.map((category) => (
            <MarketplaceCategory
              key={category.name}
              name={category.name}
              icon={category.icon}
              active={
                selectedCategory === category.name
              }
              onClick={() =>
                setSelectedCategory(category.name)
              }
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            className="
              mb-6 rounded-2xl border border-red-400/20
              bg-red-400/[0.06] p-4 text-sm text-red-200
            "
          >
            {error}
          </div>
        )}

        {/* Purchase success */}
        {purchaseMessage && (
          <div
            className="
              mb-6 rounded-2xl border border-emerald-400/20
              bg-emerald-400/[0.06] p-4 text-sm text-emerald-200
            "
          >
            âœ“ {purchaseMessage}
          </div>
        )}

        {/* Featured */}
        {!loading &&
          !search &&
          selectedCategory === 'All' &&
          featuredItems.length > 0 && (
            <section className="mb-10">

              <div className="mb-4 flex items-end justify-between">

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Featured
                  </div>

                  <h2 className="mt-1 text-xl font-black">
                    Featured Items
                  </h2>
                </div>

                <span className="text-xs text-white/30">
                  {featuredItems.length} items
                </span>

              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {featuredItems.map((item) => (
                  <MarketplaceItem
                    key={`featured-${item.id}`}
                    item={item}
                    onPreview={openPreview}
                  />
                ))}
              </div>

            </section>
          )}

        {/* Collection */}
        <section>

          <div className="mb-4 flex items-end justify-between">

            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                Collection
              </div>

              <h2 className="mt-1 text-xl font-black">
                {selectedCategory === 'All'
                  ? 'All Items'
                  : selectedCategory}
              </h2>
            </div>

            {!loading && (
              <span className="text-xs text-white/30">
                {filteredItems.length} items
              </span>
            )}

          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

              {[1, 2, 3, 4].map((number) => (
                <div
                  key={number}
                  className="
                    h-72 animate-pulse rounded-2xl
                    border border-white/5 bg-white/[0.035]
                  "
                />
              ))}

            </div>
          ) : filteredItems.length === 0 ? (
            <div
              className="
                rounded-3xl border border-white/10
                bg-white/[0.035] px-6 py-16 text-center
              "
            >
              <div className="mb-3 text-4xl">
                âœ¦
              </div>

              <h3 className="text-lg font-bold">
                Nothing here yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-white/40">
                New Marketplace items will appear here when they become
                available.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

              {filteredItems.map((item) => (
                <MarketplaceItem
                  key={item.id}
                  item={item}
                  onPreview={openPreview}
                />
              ))}

            </div>
          )}

        </section>
      </div>

      {/* Item Preview Modal */}
      {selectedItem && (
        <div
          className="
            fixed inset-0 z-50 flex items-end justify-center
            bg-black/75 p-3 backdrop-blur-md
            sm:items-center
          "
          onClick={closePreview}
        >

          <div
            className="
              w-full max-w-md overflow-hidden rounded-3xl
              border border-white/10 bg-[#0b0d11]
              shadow-2xl shadow-black/60
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* Large preview */}
            <div
              className="
                relative flex h-64 items-center justify-center
                bg-gradient-to-br from-white/[0.09]
                via-white/[0.025] to-transparent
              "
            >

              <div className="absolute h-44 w-44 rounded-full bg-white/[0.08] blur-3xl" />

              {selectedItem.image_url ? (
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="
                    relative z-10 max-h-48 max-w-[78%]
                    object-contain drop-shadow-2xl
                  "
                />
              ) : (
                <div
                  className="
                    relative z-10 flex h-32 w-32
                    items-center justify-center rounded-3xl
                    border border-white/10 bg-white/[0.05]
                    text-7xl shadow-2xl
                  "
                >
                  âœ¦
                </div>
              )}

              {selectedItem.is_limited && (
                <div
                  className="
                    absolute left-4 top-4 rounded-full
                    border border-white/10 bg-black/50
                    px-3 py-1.5 text-[10px] font-bold
                    uppercase tracking-wider text-white/80
                    backdrop-blur-md
                  "
                >
                  Limited
                </div>
              )}

              <button
                type="button"
                onClick={closePreview}
                disabled={purchasing}
                className="
                  absolute right-4 top-4 flex h-9 w-9
                  items-center justify-center rounded-full
                  border border-white/10 bg-black/50
                  text-white/60 backdrop-blur-md
                  transition hover:text-white
                  disabled:cursor-not-allowed disabled:opacity-40
                "
              >
                Ã—
              </button>

            </div>

            {/* Details */}
            <div className="p-5">

              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                {selectedItem.item_type || 'VERITAS Item'}
              </div>

              <h2 className="mt-1 text-2xl font-black">
                {selectedItem.name}
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/50">
                {selectedItem.description ||
                  'A unique VERITAS item for your profile.'}
              </p>

              {/* Price */}
              <div
                className="
                  mt-5 rounded-2xl border border-white/10
                  bg-white/[0.04] p-4
                "
              >

                <div className="flex items-center justify-between">

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/35">
                      Your Balance
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <span>ðŸª™</span>

                      <span className="font-black">
                        {Number(
                          profile?.vcoins || 0
                        ).toLocaleString()}
                      </span>

                      <span className="text-xs text-white/40">
                        V Coins
                      </span>
                    </div>
                  </div>

                  <div className="text-right">

                    <div className="text-[10px] uppercase tracking-wider text-white/35">
                      Price
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <span>ðŸª™</span>

                      <span className="text-lg font-black">
                        {Number(
                          selectedItem.price_vcoins || 0
                        ).toLocaleString()}
                      </span>
                    </div>

                  </div>

                </div>

                {/* Buy button */}
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="
                    mt-4 w-full rounded-xl
                    bg-white px-5 py-3.5
                    text-sm font-black text-black
                    transition hover:bg-white/85
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {purchasing
                    ? 'Processing...'
                    : 'Buy Item'}
                </button>

              </div>

              {/* KES reference price if available */}
              {Number(selectedItem.price_kes || 0) > 0 && (
                <div className="mt-3 text-center text-xs text-white/30">
                  Reference price: KES{' '}
                  {Number(
                    selectedItem.price_kes
                  ).toLocaleString()}
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </div>
  )
}
