import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminMarketplace.css'

const EFFECTS = [
  'None','Fire','Ice','Electric','Inferno','Frostbite','Thunder','Plasma','Void','Galaxy',
  'Shadow','Ember','Flame','Blaze','Magma','Storm','Lightning','Aurora','Cosmic','Royal',
  'Venom','Toxic','Solar','Lunar','Ocean','Crystal','Diamond','Phoenix','Spectral','Energy'
]

const FONTS = [
  'Default','Bold','Elite','Neon','Royal','Cyber','Titan','Warrior','Street','Future',
  'Matrix','Arcade','Hacker','Tech','Glitch','Digital','Retro','Gamer','Champion','Legend',
  'Luxury','Hero','Heavy','Sharp','Speed','Power','Military','SciFi','Pixel','Ultra'
]

const FRAMES = [
  'None','Metallic','Gold','Diamond','Neon','Royal','Titan','Champion','Inferno','Frost',
  'Cyber','Shadow','Galaxy','Platinum','Chrome','Ruby','Emerald','Sapphire','Amethyst','Obsidian',
  'Crystal','Phoenix','Lightning','Carbon','Steel','Copper','Pearl','Legend','Elite','Mythic'
]

const BACKGROUNDS = [
  'None','Night','Carbon','Galaxy','Arena','Neon','Cyber','Inferno','Frost','Storm',
  'Shadow','Void','Ocean','Sunset','Midnight','Aurora','Space','Matrix','Tech','City',
  'Desert','Volcano','Iceberg','Royal','Diamond','Purple','Red','Blue','Green','Gold'
]

const BADGES = [
  'None','Verified','Champion','Elite','Founder','Legend','Winner','Master','Pro','Veteran',
  'MVP','Top 10','Top 50','Top 100','Tournament King','Fair Play','Rising Star','Hot Streak',
  'Unstoppable','Invincible','Gladiator','Warrior','Titan','Phoenix','Royal','Diamond','Platinum',
  'Gold','Silver','Bronze'
]

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const money = (value) => Number(value || 0)

export default function AdminMarketplace() {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [username, setUsername] = useState('USER')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    category_id: '',
    item_type: 'Name Effect',
    price_vcoins: '',
    price_kes: '',
    image_url: '',
    starts_at: '',
    expires_at: '',
    intensity: 70,
    is_active: true,
    is_limited: false,
    effect: 'None',
    font: 'Default',
    frame: 'None',
    background: 'None',
    badge: 'None',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [
        { data: categoryData, error: categoryError },
        { data: itemData, error: itemError },
        { data: userData, error: userError },
      ] = await Promise.all([
        supabase
          .from('marketplace_categories')
          .select('*')
          .order('display_order', { ascending: true })
          .order('name', { ascending: true }),

        supabase
          .from('marketplace_items')
          .select(`
            *,
            marketplace_categories (
              id,
              name
            )
          `)
          .order('created_at', { ascending: false }),

        supabase.auth.getUser(),
      ])

      if (categoryError) throw categoryError
      if (itemError) throw itemError
      if (userError) throw userError

      setCategories(categoryData || [])
      setItems(itemData || [])

      const userId = userData?.user?.id

      if (userId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .maybeSingle()

        if (profileError) throw profileError

        if (profile?.username) {
          setUsername(profile.username)
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to load marketplace.')
    } finally {
      setLoading(false)
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function getCategoryId(categoryName) {
    const category = categories.find(
      (item) =>
        String(item.name).toLowerCase() ===
        String(categoryName).toLowerCase()
    )

    return category?.id || ''
  }

  function chooseEffect(effect) {
    let categoryName = 'Name Effects'

    if (['Fire', 'Inferno', 'Ember', 'Flame', 'Blaze', 'Magma', 'Phoenix'].includes(effect)) {
      categoryName = 'Fire'
    }

    if (['Ice', 'Frostbite', 'Frost', 'Crystal', 'Diamond', 'Iceberg'].includes(effect)) {
      categoryName = 'Ice'
    }

    if (['Electric', 'Thunder', 'Lightning', 'Storm'].includes(effect)) {
      categoryName = 'Electric'
    }

    setForm((current) => ({
      ...current,
      name: effect === 'None' ? 'No Name Effect' : `${effect} Name`,
      slug: slugify(effect === 'None' ? 'no-name-effect' : `${effect}-name`),
      item_type:
        categoryName === 'Fire'
          ? 'Name Fire'
          : categoryName === 'Ice'
          ? 'Name Ice'
          : categoryName === 'Electric'
          ? 'Name Electric'
          : 'Name Effect',
      category_id: getCategoryId(categoryName),
      effect,
    }))

    setMessage(`${effect} effect selected.`)
    setError('')
  }

  function chooseFont(font) {
    const itemName = font === 'Default' ? 'Default Font' : `${font} Font`

    setForm((current) => ({
      ...current,
      name: itemName,
      slug: slugify(itemName),
      item_type: 'Name Font',
      category_id: getCategoryId('Name Fonts'),
      font,
    }))

    setMessage(`${font} font selected.`)
    setError('')
  }

  function chooseFrame(frame) {
    const itemName = frame === 'None' ? 'No Frame' : `${frame} Frame`

    setForm((current) => ({
      ...current,
      name: itemName,
      slug: slugify(itemName),
      item_type: 'Profile Frame',
      category_id: getCategoryId('Profile Frames'),
      frame,
    }))

    setMessage(`${frame} frame selected.`)
    setError('')
  }

  function chooseBackground(background) {
    const itemName =
      background === 'None'
        ? 'No Background'
        : `${background} Background`

    setForm((current) => ({
      ...current,
      name: itemName,
      slug: slugify(itemName),
      item_type: 'Profile Background',
      category_id: getCategoryId('Backgrounds'),
      background,
    }))

    setMessage(`${background} background selected.`)
    setError('')
  }

  function chooseBadge(badge) {
    const itemName = badge === 'None' ? 'No Badge' : `${badge} Badge`

    setForm((current) => ({
      ...current,
      name: itemName,
      slug: slugify(itemName),
      item_type: 'Badge',
      category_id: getCategoryId('Badges'),
      badge,
    }))

    setMessage(`${badge} badge selected.`)
    setError('')
  }

  const effectClass = slugify(form.effect || 'none')
  const fontClass = slugify(form.font || 'default')
  const frameClass = slugify(form.frame || 'none')
  const backgroundClass = slugify(form.background || 'none')
  const badgeClass = slugify(form.badge || 'none')

  const previewData = useMemo(
    () => ({
      effects: form.effect,
      font: form.font,
      frame: form.frame,
      background: form.background,
      badge: form.badge,
      intensity: Number(form.intensity || 70),
    }),
    [
      form.effect,
      form.font,
      form.frame,
      form.background,
      form.badge,
      form.intensity,
    ]
  )

  async function createItem(event) {
    event.preventDefault()

    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (!form.name.trim()) {
        throw new Error('Choose an item first.')
      }

      if (!form.category_id) {
        throw new Error('The selected item has no matching category.')
      }

      const vcoins = money(form.price_vcoins)

      if (vcoins < 0) {
        throw new Error('V Coins price cannot be negative.')
      }

      const payload = {
        category_id: form.category_id,
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim() || null,
        item_type: form.item_type,
        price_vcoins: vcoins,
        price_kes:
          form.price_kes === ''
            ? null
            : money(form.price_kes),
        image_url: form.image_url.trim() || null,
        preview_data: previewData,
        is_active: form.is_active,
        is_limited: form.is_limited,
        starts_at: form.starts_at
          ? new Date(form.starts_at).toISOString()
          : null,
        expires_at: form.expires_at
          ? new Date(form.expires_at).toISOString()
          : null,
      }

      const { error: insertError } = await supabase
        .from('marketplace_items')
        .insert(payload)

      if (insertError) throw insertError

      setMessage(`${payload.name} created successfully.`)

      clearForm()
      await loadData()
    } catch (err) {
      setError(err?.message || 'Could not create item.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleItem(item) {
    setError('')
    setMessage('')

    try {
      const { error: updateError } = await supabase
        .from('marketplace_items')
        .update({
          is_active: !item.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      setMessage(
        `${item.name} is now ${
          !item.is_active ? 'active' : 'paused'
        }.`
      )

      await loadData()
    } catch (err) {
      setError(err?.message || 'Could not update item.')
    }
  }

  async function deleteItem(item) {
    const first = window.confirm(
      `Delete "${item.name}" from the marketplace?`
    )

    if (!first) return

    const second = window.confirm(
      'This permanently deletes the marketplace item. Continue?'
    )

    if (!second) return

    setError('')
    setMessage('')

    try {
      const { error: deleteError } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', item.id)

      if (deleteError) throw deleteError

      setMessage(`${item.name} deleted.`)
      await loadData()
    } catch (err) {
      setError(err?.message || 'Could not delete item.')
    }
  }

  function clearForm() {
    setForm({
      name: '',
      slug: '',
      description: '',
      category_id: '',
      item_type: 'Name Effect',
      price_vcoins: '',
      price_kes: '',
      image_url: '',
      starts_at: '',
      expires_at: '',
      intensity: 70,
      is_active: true,
      is_limited: false,
      effect: 'None',
      font: 'Default',
      frame: 'None',
      background: 'None',
      badge: 'None',
    })

    setMessage('')
    setError('')
  }

  return (
    <div className="admin-marketplace-page">
      <div className="admin-marketplace-header">
        <div>
          <div className="admin-marketplace-kicker">
            VERITAS MARKETPLACE
          </div>

          <h1>Marketplace</h1>

          <p>
            Select a visual item, let VERITAS fill the name automatically,
            then create it.
          </p>
        </div>

        <div className="marketplace-total">
          <strong>{items.length}</strong>
          <span>Items</span>
        </div>
      </div>

      {message && (
        <div className="marketplace-message success">
          {message}
        </div>
      )}

      {error && (
        <div className="marketplace-message error">
          {error}
        </div>
      )}

      <form
        className="marketplace-builder"
        onSubmit={createItem}
      >
        <div className="builder-title-row">
          <div>
            <span className="builder-number">CREATE ITEM</span>
            <h2>Build a marketplace item</h2>
            <p>
              Tap a visual name below. The item name, slug, type and category
              are filled automatically.
            </p>
          </div>
        </div>

        <section className="marketplace-step">
          <div className="step-heading">
            <span>1</span>
            <div>
              <strong>Choose an item</strong>
              <small>
                30 options in every marketplace category.
              </small>
            </div>
          </div>

          <div className="picker-group">
            <h3>Name Effects · 30</h3>

            <div className="visual-options">
              {EFFECTS.map((effect) => (
                <button
                  type="button"
                  key={effect}
                  className={`visual-option effect-option effect-${slugify(effect)} ${
                    form.effect === effect ? 'selected' : ''
                  }`}
                  onClick={() => chooseEffect(effect)}
                >
                  <span className="option-preview">
                    {username}
                  </span>

                  <strong>{effect}</strong>
                  <small>Tap to use</small>
                </button>
              ))}
            </div>
          </div>

          <div className="picker-group">
            <h3>Name Fonts · 30</h3>

            <div className="visual-options">
              {FONTS.map((font) => (
                <button
                  type="button"
                  key={font}
                  className={`visual-option font-option font-${slugify(font)} ${
                    form.font === font &&
                    form.item_type === 'Name Font'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => chooseFont(font)}
                >
                  <span className="option-preview">
                    {username}
                  </span>

                  <strong>{font}</strong>
                  <small>Auto name</small>
                </button>
              ))}
            </div>
          </div>

          <div className="picker-group">
            <h3>Profile Frames · 30</h3>

            <div className="visual-options">
              {FRAMES.map((frame) => (
                <button
                  type="button"
                  key={frame}
                  className={`visual-option frame-option frame-${slugify(frame)} ${
                    form.frame === frame &&
                    form.item_type === 'Profile Frame'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => chooseFrame(frame)}
                >
                  <span className="option-preview">
                    {username}
                  </span>

                  <strong>{frame}</strong>
                  <small>Auto name</small>
                </button>
              ))}
            </div>
          </div>

          <div className="picker-group">
            <h3>Backgrounds · 30</h3>

            <div className="visual-options">
              {BACKGROUNDS.map((background) => (
                <button
                  type="button"
                  key={background}
                  className={`visual-option background-option bg-${slugify(background)} ${
                    form.background === background &&
                    form.item_type === 'Profile Background'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => chooseBackground(background)}
                >
                  <span className="option-preview">
                    {username}
                  </span>

                  <strong>{background}</strong>
                  <small>Auto name</small>
                </button>
              ))}
            </div>
          </div>

          <div className="picker-group">
            <h3>Badges · 30</h3>

            <div className="visual-options">
              {BADGES.map((badge) => (
                <button
                  type="button"
                  key={badge}
                  className={`visual-option badge-option badge-${slugify(badge)} ${
                    form.badge === badge &&
                    form.item_type === 'Badge'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => chooseBadge(badge)}
                >
                  <span className="option-preview">
                    {username}
                  </span>

                  <strong>{badge}</strong>
                  <small>Auto name</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="marketplace-step">
          <div className="step-heading">
            <span>2</span>
            <div>
              <strong>Finish the item</strong>
              <small>
                Name and category are already filled from your selection.
              </small>
            </div>
          </div>

          <div className="builder-grid">
            <div className="builder-fields">
              <label>
                Item Name
                <input
                  value={form.name}
                  onChange={(event) =>
                    updateForm('name', event.target.value)
                  }
                  placeholder="Select an item above"
                />
              </label>

              <label>
                Slug
                <input
                  value={form.slug}
                  onChange={(event) =>
                    updateForm('slug', event.target.value)
                  }
                />
              </label>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm('description', event.target.value)
                  }
                  placeholder="Describe this marketplace item"
                  rows={4}
                />
              </label>

              <div className="two-columns">
                <label>
                  Item Type
                  <input value={form.item_type} readOnly />
                </label>

                <label>
                  Category
                  <input
                    value={
                      categories.find(
                        (category) =>
                          category.id === form.category_id
                      )?.name || ''
                    }
                    readOnly
                  />
                </label>
              </div>

              <div className="two-columns">
                <label>
                  V Coins
                  <input
                    type="number"
                    min="0"
                    value={form.price_vcoins}
                    onChange={(event) =>
                      updateForm(
                        'price_vcoins',
                        event.target.value
                      )
                    }
                    placeholder="0"
                  />
                </label>

                <label>
                  KES
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price_kes}
                    onChange={(event) =>
                      updateForm(
                        'price_kes',
                        event.target.value
                      )
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>

              <label>
                Image URL
                <input
                  value={form.image_url}
                  onChange={(event) =>
                    updateForm('image_url', event.target.value)
                  }
                  placeholder="Optional image URL"
                />
              </label>

              <div className="two-columns">
                <label>
                  Starts
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) =>
                      updateForm('starts_at', event.target.value)
                    }
                  />
                </label>

                <label>
                  Expires
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(event) =>
                      updateForm('expires_at', event.target.value)
                    }
                  />
                </label>
              </div>

              <label className="intensity-control">
                <div className="range-heading">
                  <span>Intensity</span>
                  <strong>{form.intensity}%</strong>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.intensity}
                  onChange={(event) =>
                    updateForm(
                      'intensity',
                      Number(event.target.value)
                    )
                  }
                />
              </label>

              <div className="switch-row">
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      updateForm(
                        'is_active',
                        event.target.checked
                      )
                    }
                  />
                  <span>Active</span>
                </label>

                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={form.is_limited}
                    onChange={(event) =>
                      updateForm(
                        'is_limited',
                        event.target.checked
                      )
                    }
                  />
                  <span>Limited</span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="clear-button"
                  onClick={clearForm}
                >
                  Clear
                </button>

                <button
                  type="submit"
                  className="create-button"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </div>

            <div className="preview-column">
              <div className="preview-heading">
                <span>LIVE PREVIEW</span>
                <small>
                  The preview updates as you choose each visual.
                </small>
              </div>

              <div
                className={`market-preview preview-bg-${backgroundClass} preview-frame-${frameClass}`}
              >
                <div className="preview-grid" />
                <div className="preview-noise" />

                <div
                  className={`preview-avatar-shell frame-${frameClass}`}
                >
                  <div className="preview-avatar">
                    {username.slice(0, 1).toUpperCase()}
                  </div>
                </div>

                <div
                  className={`preview-username-wrap effect-${effectClass}`}
                  style={{
                    '--effect-intensity':
                      Number(form.intensity || 70) / 100,
                  }}
                >
                  <span className="effect-aura" />
                  <span className="effect-particles" />

                  <span
                    className={`preview-username font-${fontClass}`}
                  >
                    {username}
                  </span>
                </div>

                {form.badge !== 'None' && (
                  <div
                    className={`preview-badge badge-${badgeClass}`}
                  >
                    {form.badge}
                  </div>
                )}

                <div className="preview-selection">
                  <strong>
                    {form.effect !== 'None'
                      ? form.effect
                      : form.font !== 'Default'
                      ? form.font
                      : form.frame !== 'None'
                      ? form.frame
                      : form.background !== 'None'
                      ? form.background
                      : form.badge !== 'None'
                      ? form.badge
                      : 'No visual selected'}
                  </strong>

                  <span>{form.item_type}</span>
                </div>

                <div className="preview-meta">
                  <div>
                    <span>Name</span>
                    <strong>{username}</strong>
                  </div>

                  <div>
                    <span>Type</span>
                    <strong>{form.item_type}</strong>
                  </div>

                  <div>
                    <span>Price</span>
                    <strong>
                      {Number(form.price_vcoins || 0)} V Coins
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>

      <section className="marketplace-catalogue">
        <div className="catalogue-header">
          <div>
            <span>CATALOGUE</span>
            <h2>Existing Items</h2>
          </div>

          <strong>{items.length} total</strong>
        </div>

        {loading ? (
          <div className="empty-catalogue">
            Loading marketplace...
          </div>
        ) : items.length === 0 ? (
          <div className="empty-catalogue">
            No marketplace items yet.
          </div>
        ) : (
          <div className="catalogue-list">
            {items.map((item) => (
              <div
                className="catalogue-item"
                key={item.id}
              >
                <div className="catalogue-item-main">
                  <strong>{item.name}</strong>

                  <span>
                    {item.marketplace_categories?.name ||
                      'Uncategorised'}
                    {' · '}
                    {item.price_vcoins} V Coins
                  </span>
                </div>

                <div className="catalogue-status">
                  <span
                    className={
                      item.is_active
                        ? 'status-active'
                        : 'status-paused'
                    }
                  >
                    {item.is_active ? 'Active' : 'Paused'}
                  </span>

                  {item.is_limited && (
                    <span className="status-limited">
                      Limited
                    </span>
                  )}
                </div>

                <div className="catalogue-actions">
                  <button
                    type="button"
                    onClick={() => toggleItem(item)}
                  >
                    {item.is_active ? 'Pause' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    className="delete-item"
                    onClick={() => deleteItem(item)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
