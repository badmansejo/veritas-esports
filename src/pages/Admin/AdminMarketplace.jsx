import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminMarketplace.css'

const EFFECTS = [
  'None','Fire','Ice','Electric','Inferno','Frostbite','Thunder','Neon','Galaxy','Shadow',
  'Ember','Flame','Blaze','Magma','Storm','Lightning','Plasma','Void','Solar','Lunar',
  'Ocean','Crystal','Diamond','Phoenix','Spectral','Venom','Toxic','Aurora','Cosmic','Royal',
  'Ruby','Emerald','Sapphire','Amethyst','Obsidian','Carbon','Energy','Pulse','Radiant','Nova',
  'Quantum','Cyber','Inferno X','Frost X','Thunder X','Galaxy X','Shadow X','Neon X','Titan','Legend'
]

const FONTS = [
  'Default','Bold','Elite','Neon','Royal','Cyber','Titan','Warrior','Gamer','Champion',
  'Legend','Hero','Future','Matrix','Arcade','Hacker','Tech','Glitch','Digital','Retro',
  'Luxury','Heavy','Sharp','Speed','Power','Military','SciFi','Pixel','Ultra','Street',
  'Pro','Master','Supreme','King','Queen','Racer','Battle','Extreme','Fireline','Icebound',
  'Thunder','Galaxy','Shadow','Cosmic','Royal X','Titan X','Legend X','Champion X','VERITAS','VERITAS Elite'
]

const FRAMES = [
  'None','Metallic','Gold','Diamond','Neon','Royal','Titan','Champion','Inferno','Frost',
  'Cyber','Shadow','Galaxy','Platinum','Chrome','Ruby','Emerald','Sapphire','Amethyst','Obsidian',
  'Crystal','Phoenix','Lightning','Carbon','Steel','Copper','Pearl','Legend','Elite','Mythic',
  'Void','Solar','Lunar','Storm','Thunder','Fire','Ice','Ocean','Cosmic','Aurora',
  'Quantum','Energy','Pulse','Glitch','Hologram','Prism','Crown','King','Warrior','VERITAS'
]

const BACKGROUNDS = [
  'None','Night','Carbon','Galaxy','Arena','Neon','Cyber','Inferno','Frost','Storm',
  'Shadow','Void','Ocean','Sunset','Midnight','Aurora','Space','Matrix','Tech','City',
  'Desert','Volcano','Iceberg','Royal','Diamond','Purple','Red','Blue','Green','Gold',
  'Silver','Platinum','Chrome','Ruby','Emerald','Sapphire','Amethyst','Cosmic','Quantum','Lightning',
  'Thunder','Fire','Crystal','Phoenix','Hologram','Cyber City','Dark Arena','VERITAS Night','VERITAS Gold','VERITAS Elite'
]

const BADGES = [
  { name:'Verified', icon:'✓', style:'verified' },
  { name:'Elite', icon:'◆', style:'elite' },
  { name:'Founder', icon:'★', style:'founder' },
  { name:'Legend', icon:'♛', style:'legend' },
  { name:'Master', icon:'✦', style:'master' },
  { name:'Royal', icon:'♜', style:'royal' },
  { name:'Diamond', icon:'◇', style:'diamond' },
  { name:'Platinum', icon:'P', style:'platinum' },
  { name:'Gold', icon:'G', style:'gold' },
  { name:'Silver', icon:'S', style:'silver' },

  { name:'Champion', icon:'♕', style:'champion' },
  { name:'Warrior', icon:'⚔', style:'warrior' },
  { name:'King', icon:'K', style:'king' },
  { name:'Queen', icon:'Q', style:'queen' },
  { name:'Titan', icon:'T', style:'titan' },
  { name:'Phoenix', icon:'♨', style:'phoenix' },
  { name:'Lightning', icon:'ϟ', style:'lightning' },
  { name:'Fire', icon:'F', style:'fire' },
  { name:'Frost', icon:'❄', style:'frost' },
  { name:'Cyber', icon:'C', style:'cyber' },

  { name:'Galaxy', icon:'✧', style:'galaxy' },
  { name:'Shadow', icon:'S', style:'shadow' },
  { name:'Neon', icon:'N', style:'neon' },
  { name:'Cosmic', icon:'✦', style:'cosmic' },
  { name:'Storm', icon:'☁', style:'storm' },
  { name:'Thunder', icon:'ϟ', style:'thunder' },
  { name:'Crystal', icon:'◇', style:'crystal' },
  { name:'Ruby', icon:'R', style:'ruby' },
  { name:'Emerald', icon:'E', style:'emerald' },
  { name:'Sapphire', icon:'S', style:'sapphire' },

  { name:'Amethyst', icon:'A', style:'amethyst' },
  { name:'Obsidian', icon:'O', style:'obsidian' },
  { name:'Chrome', icon:'C', style:'chrome' },
  { name:'Carbon', icon:'C', style:'carbon' },
  { name:'Hologram', icon:'H', style:'hologram' },
  { name:'Prism', icon:'P', style:'prism' },
  { name:'Crown', icon:'♛', style:'crown' },
  { name:'VIP', icon:'V', style:'vip' },
  { name:'Pro', icon:'P', style:'pro' },
  { name:'Supreme', icon:'S', style:'supreme' },

  { name:'Racer', icon:'R', style:'racer' },
  { name:'Gamer', icon:'G', style:'gamer' },
  { name:'Boss', icon:'B', style:'boss' },
  { name:'MVP', icon:'M', style:'mvp' },
  { name:'VERITAS', icon:'V', style:'veritas' },
  { name:'VERITAS Gold', icon:'V', style:'veritas-gold' },
  { name:'VERITAS Elite', icon:'V', style:'veritas-elite' },
  { name:'VERITAS Champion', icon:'V', style:'veritas-champion' },
  { name:'VERITAS Legend', icon:'V', style:'veritas-legend' },
  { name:'Ultimate', icon:'U', style:'ultimate' },
]

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export default function AdminMarketplace() {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [username, setUsername] = useState('PLAYER')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [badgeDesign, setBadgeDesign] = useState({
    shape:'circle',
    color:'#16c75a',
    gradient:'#087b3d',
    border:'#baffd1',
    icon:'✓',
    iconColor:'#ffffff',
    glow:true,
    glowColor:'#16c75a',
    borderWidth:3,
    size:62,
    metallic:true,
  })

  const [form, setForm] = useState({
    name:'',
    slug:'',
    description:'',
    category_id:'',
    item_type:'Name Effect',
    price_vcoins:'',
    price_kes:'',
    image_url:'',
    starts_at:'',
    expires_at:'',
    intensity:70,
    is_active:true,
    is_limited:false,
    effect:'None',
    font:'Default',
    frame:'None',
    background:'None',
    badge:'None',
    badge_style:'none',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const { data: categoryData, error: categoryError } =
        await supabase
          .from('marketplace_categories')
          .select('*')
          .order('display_order', { ascending:true })
          .order('name', { ascending:true })

      if (categoryError) throw categoryError

      const { data:itemData, error:itemError } =
        await supabase
          .from('marketplace_items')
          .select(`
            *,
            marketplace_categories (
              id,
              name
            )
          `)
          .order('created_at', { ascending:false })

      if (itemError) throw itemError

      setCategories(categoryData || [])
      setItems(itemData || [])

      const {
        data:{ user },
      } = await supabase.auth.getUser()

      if (user?.id) {
        const { data:profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle()

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

  function categoryId(name) {
    return categories.find(
      c => String(c.name).toLowerCase() === String(name).toLowerCase()
    )?.id || ''
  }

  function selectEffect(effect) {
    let category = 'Name Effects'
    let type = 'Name Effect'

    if (['Fire','Inferno','Ember','Flame','Blaze','Magma','Inferno X'].includes(effect)) {
      category = 'Fire'
      type = 'Name Fire'
    }

    if (['Ice','Frostbite','Frost','Frost X'].includes(effect)) {
      category = 'Ice'
      type = 'Name Ice'
    }

    if (['Electric','Thunder','Lightning','Storm','Thunder X'].includes(effect)) {
      category = 'Electric'
      type = 'Name Electric'
    }

    const name = effect === 'None' ? 'No Name Effect' : `${effect} Name`

    setForm(current => ({
      ...current,
      name,
      slug:slugify(name),
      item_type:type,
      category_id:categoryId(category),
      effect,
    }))

    setMessage(`${effect} selected.`)
    setError('')
  }

  function selectFont(font) {
    const name = font === 'Default' ? 'Default Font' : `${font} Font`

    setForm(current => ({
      ...current,
      name,
      slug:slugify(name),
      item_type:'Name Font',
      category_id:categoryId('Name Fonts'),
      font,
    }))

    setMessage(`${font} font selected.`)
    setError('')
  }

  function selectFrame(frame) {
    const name = frame === 'None' ? 'No Frame' : `${frame} Frame`

    setForm(current => ({
      ...current,
      name,
      slug:slugify(name),
      item_type:'Profile Frame',
      category_id:categoryId('Profile Frames'),
      frame,
    }))

    setMessage(`${frame} selected.`)
    setError('')
  }

  function selectBackground(background) {
    const name = background === 'None'
      ? 'No Background'
      : `${background} Background`

    setForm(current => ({
      ...current,
      name,
      slug:slugify(name),
      item_type:'Profile Background',
      category_id:categoryId('Backgrounds'),
      background,
    }))

    setMessage(`${background} selected.`)
    setError('')
  }

  function selectBadge(badge) {
    const name = `${badge.name} Badge`

    setForm(current => ({
      ...current,
      name,
      slug:slugify(name),
      item_type:'Badge',
      category_id:categoryId('Badges'),
      badge:badge.name,
      badge_style:badge.style,
    }))

    setMessage(`${badge.name} badge selected.`)
    setError('')
  }

    function updateBadgeDesign(field,value) {
    setBadgeDesign(current => ({
      ...current,
      [field]:value,
    }))
  }

  function resetBadgeDesign() {
    setBadgeDesign({
      shape:'circle',
      color:'#16c75a',
      gradient:'#087b3d',
      border:'#baffd1',
      icon:'✓',
      iconColor:'#ffffff',
      glow:true,
      glowColor:'#16c75a',
      borderWidth:3,
      size:62,
      metallic:true,
    })
  }

  function badgeShapeRadius(shape) {
    if (shape === 'circle') return '50%'
    if (shape === 'square') return '8px'
    if (shape === 'rounded') return '18px'
    if (shape === 'shield') return '18px 18px 28px 28px'
    if (shape === 'hexagon') return '18%'
    if (shape === 'diamond') return '12px'
    if (shape === 'star') return '28%'
    return '50%'
  }

  function badgeClipPath(shape) {
    if (shape === 'shield') {
      return 'polygon(50% 0%, 92% 18%, 86% 72%, 50% 100%, 14% 72%, 8% 18%)'
    }

    if (shape === 'hexagon') {
      return 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)'
    }

    if (shape === 'diamond') {
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
    }

    if (shape === 'star') {
      return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 94%, 50% 72%, 21% 94%, 32% 57%, 2% 35%, 39% 35%)'
    }

    return 'none'
  }

  function getBadgePreviewStyle(large = false) {
    const size = large
      ? Number(badgeDesign.size || 62)
      : Math.max(38, Math.round(Number(badgeDesign.size || 62) * 0.65))

    const shadow = badgeDesign.glow
      ? `0 0 24px ${badgeDesign.glowColor}, inset 0 2px 6px rgba(255,255,255,.65), inset 0 -6px 10px rgba(0,0,0,.25)`
      : 'inset 0 2px 6px rgba(255,255,255,.5), inset 0 -6px 10px rgba(0,0,0,.25)'

    return {
      width:`${size}px`,
      height:`${size}px`,
      display:'grid',
      placeItems:'center',
      flexShrink:0,
      borderRadius:badgeShapeRadius(badgeDesign.shape),
      clipPath:badgeClipPath(badgeDesign.shape),
      background:badgeDesign.metallic
        ? `linear-gradient(145deg, #ffffff 0%, ${badgeDesign.color} 20%, ${badgeDesign.gradient} 65%, ${badgeDesign.color} 100%)`
        : `linear-gradient(145deg, ${badgeDesign.color}, ${badgeDesign.gradient})`,
      border:`${badgeDesign.borderWidth}px solid ${badgeDesign.border}`,
      color:badgeDesign.iconColor,
      fontSize:`${Math.max(16, Math.round(size * 0.43))}px`,
      fontWeight:1000,
      lineHeight:1,
      textShadow:'0 2px 3px rgba(0,0,0,.45)',
      boxShadow:shadow,
      transform:badgeDesign.shape === 'diamond' ? 'rotate(0deg)' : 'none',
      transition:'all .2s ease',
    }
  }
const previewData = useMemo(() => ({
    effect:form.effect,
    font:form.font,
    frame:form.frame,
    background:form.background,
    badge:form.badge,
    badge_style:form.badge_style,
    intensity:Number(form.intensity || 70),
    badge_design:badgeDesign,
  }), [
    form.effect,
    form.font,
    form.frame,
    form.background,
    form.badge,
    form.badge_style,
    form.intensity,
    badgeDesign,
  ])

  function update(field,value) {
    setForm(current => ({
      ...current,
      [field]:value,
    }))
  }

  async function createItem(event) {
    event.preventDefault()

    if (saving) return

    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (!form.name.trim()) {
        throw new Error('Select an item first.')
      }

      if (!form.category_id) {
        throw new Error('Marketplace category was not found.')
      }

      const price = Number(form.price_vcoins || 0)

      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Enter a valid V Coins price.')
      }

      const { error:rpcError } = await supabase.rpc(
        'admin_create_marketplace_item',
        {
          p_category_id:form.category_id,
          p_name:form.name.trim(),
          p_slug:form.slug.trim() || slugify(form.name),
          p_description:form.description.trim() || null,
          p_item_type:form.item_type,
          p_price_vcoins:Math.round(price),
          p_price_kes:form.price_kes === ''
            ? null
            : Number(form.price_kes),
          p_image_url:form.image_url.trim() || null,
          p_preview_data:previewData,
          p_is_active:Boolean(form.is_active),
          p_is_limited:Boolean(form.is_limited),
          p_starts_at:form.starts_at
            ? new Date(form.starts_at).toISOString()
            : null,
          p_expires_at:form.expires_at
            ? new Date(form.expires_at).toISOString()
            : null,
        }
      )

      if (rpcError) throw rpcError

      setMessage(`${form.name} created successfully.`)

      clearForm()
      await loadData()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Could not create item.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleItem(item) {
    try {
      const { error } = await supabase
        .from('marketplace_items')
        .update({
          is_active:!item.is_active,
          updated_at:new Date().toISOString(),
        })
        .eq('id',item.id)

      if (error) throw error

      setMessage(
        `${item.name} is now ${item.is_active ? 'paused' : 'active'}.`
      )

      await loadData()
    } catch (err) {
      setError(err?.message || 'Could not update item.')
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return
    if (!window.confirm('This permanently deletes the item. Continue?')) return

    try {
      const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id',item.id)

      if (error) throw error

      setMessage(`${item.name} deleted.`)
      await loadData()
    } catch (err) {
      setError(err?.message || 'Could not delete item.')
    }
  }

  function clearForm() {
    resetBadgeDesign()

    setForm({
      name:'',
      slug:'',
      description:'',
      category_id:'',
      item_type:'Name Effect',
      price_vcoins:'',
      price_kes:'',
      image_url:'',
      starts_at:'',
      expires_at:'',
      intensity:70,
      is_active:true,
      is_limited:false,
      effect:'None',
      font:'Default',
      frame:'None',
      background:'None',
      badge:'None',
      badge_style:'none',
    })
  }

  const selectedBadge =
    BADGES.find(b => b.name === form.badge)

  return (
    <div className="admin-marketplace-page">

      <div className="admin-marketplace-header">
        <div>
          <div className="admin-marketplace-kicker">
            VERITAS MARKETPLACE
          </div>

          <h1>Marketplace</h1>

          <p>
            Build unique cosmetics with live previews.
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

        <section className="marketplace-step">

          <div className="step-heading">
            <span>1</span>
            <div>
              <strong>Choose an item</strong>
              <small>50 unique options in every category.</small>
            </div>
          </div>

          <div className="picker-group">
            <h3>Name Effects · 50</h3>

            <div className="visual-options">
              {EFFECTS.map(effect => (
                <button
                  type="button"
                  key={effect}
                  className={`visual-option effect-option effect-${slugify(effect)} ${
                    form.effect === effect &&
                    !['Name Font','Profile Frame','Profile Background','Badge'].includes(form.item_type)
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => selectEffect(effect)}
                >
                  <span className="option-preview">
                    {username}
                  </span>
                  <strong>{effect}</strong>
                  <small>Live preview</small>
                </button>
              ))}
            </div>
          </div>

          <div className="picker-group">
            <h3>Name Fonts · 50</h3>

            <div className="visual-options">
              {FONTS.map(font => (
                <button
                  type="button"
                  key={font}
                  className={`visual-option font-option font-${slugify(font)} ${
                    form.font === font &&
                    form.item_type === 'Name Font'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => selectFont(font)}
                >
                  <span className="option-preview">
                    {username}
                  </span>
                  <strong>{font}</strong>
                  <small>Live preview</small>
                </button>
              ))}
            </div>
          </div>

          <div className="picker-group">
            <h3>Profile Frames · 50</h3>

            <div className="visual-options">
              {FRAMES.map(frame => (
                <button
                  type="button"
                  key={frame}
                  className={`visual-option frame-option frame-${slugify(frame)} ${
                    form.frame === frame &&
                    form.item_type === 'Profile Frame'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => selectFrame(frame)}
                >
                  <span className={`option-preview frame-preview frame-${slugify(frame)}`}>
                    {username}
                  </span>
                  <strong>{frame}</strong>
                  <small>Live preview</small>
                </button>
              ))}
            </div>
          </div>

          <div className="picker-group">
            <h3>Backgrounds · 50</h3>

            <div className="visual-options">
              {BACKGROUNDS.map(background => (
                <button
                  type="button"
                  key={background}
                  className={`visual-option background-option bg-${slugify(background)} ${
                    form.background === background &&
                    form.item_type === 'Profile Background'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => selectBackground(background)}
                >
                  <span className={`option-preview background-preview bg-${slugify(background)}`}>
                    {username}
                  </span>
                  <strong>{background}</strong>
                  <small>Live preview</small>
                </button>
              ))}
            </div>
          </div>

          <div className="picker-group">
            <h3>Marketplace Badges · 50</h3>

            <div className="visual-options">
              {BADGES.map(badge => (
                <button
                  type="button"
                  key={badge.name}
                  className={`visual-option badge-option ${
                    form.badge === badge.name &&
                    form.item_type === 'Badge'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => selectBadge(badge)}
                >
                  <span className="badge-option-preview">
                    <span className={`market-badge badge-${badge.style}`}>
                      {badge.icon}
                    </span>
                  </span>

                  <strong>{badge.name}</strong>
                  <small>Live badge</small>
                </button>
              ))}
            </div>
          </div>

                    <div className="badge-designer">
            <div className="badge-designer-header">
              <div>
                <h3>Custom Badge Designer</h3>
                <p>Design your own badge and see it live before creating it.</p>
              </div>

              <button
                type="button"
                className="clear-button"
                onClick={resetBadgeDesign}
              >
                Reset Design
              </button>
            </div>

            <div className="badge-designer-layout">

              <div className="badge-designer-controls">

                <label>
                  Badge Name
                  <input
                    value={
                      form.item_type === 'Badge' &&
                      form.badge !== 'None'
                        ? form.name
                        : ''
                    }
                    onChange={e => {
                      update('name',e.target.value)
                      update('slug',slugify(e.target.value))
                    }}
                    placeholder="My Custom Badge"
                  />
                </label>

                <label>
                  Shape
                  <select
                    value={badgeDesign.shape}
                    onChange={e =>
                      updateBadgeDesign('shape',e.target.value)
                    }
                  >
                    <option value="circle">Circle</option>
                    <option value="rounded">Rounded Square</option>
                    <option value="square">Square</option>
                    <option value="shield">Shield</option>
                    <option value="hexagon">Hexagon</option>
                    <option value="diamond">Diamond</option>
                    <option value="star">Star</option>
                  </select>
                </label>

                <label>
                  Icon / Letter
                  <input
                    maxLength="3"
                    value={badgeDesign.icon}
                    onChange={e =>
                      updateBadgeDesign('icon',e.target.value)
                    }
                  />
                </label>

                <div className="two-columns">

                  <label>
                    Main Colour
                    <input
                      type="color"
                      value={badgeDesign.color}
                      onChange={e =>
                        updateBadgeDesign('color',e.target.value)
                      }
                    />
                  </label>

                  <label>
                    Gradient
                    <input
                      type="color"
                      value={badgeDesign.gradient}
                      onChange={e =>
                        updateBadgeDesign('gradient',e.target.value)
                      }
                    />
                  </label>

                </div>

                <div className="two-columns">

                  <label>
                    Border
                    <input
                      type="color"
                      value={badgeDesign.border}
                      onChange={e =>
                        updateBadgeDesign('border',e.target.value)
                      }
                    />
                  </label>

                  <label>
                    Icon Colour
                    <input
                      type="color"
                      value={badgeDesign.iconColor}
                      onChange={e =>
                        updateBadgeDesign('iconColor',e.target.value)
                      }
                    />
                  </label>

                </div>

                <div className="two-columns">

                  <label>
                    Glow Colour
                    <input
                      type="color"
                      value={badgeDesign.glowColor}
                      onChange={e =>
                        updateBadgeDesign('glowColor',e.target.value)
                      }
                    />
                  </label>

                  <label>
                    Border Width
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={badgeDesign.borderWidth}
                      onChange={e =>
                        updateBadgeDesign(
                          'borderWidth',
                          Number(e.target.value)
                        )
                      }
                    />
                  </label>

                </div>

                <label>
                  Badge Size
                  <div className="range-heading">
                    <span>Size</span>
                    <strong>{badgeDesign.size}px</strong>
                  </div>

                  <input
                    type="range"
                    min="40"
                    max="110"
                    value={badgeDesign.size}
                    onChange={e =>
                      updateBadgeDesign(
                        'size',
                        Number(e.target.value)
                      )
                    }
                  />
                </label>

                <div className="switch-row">

                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={badgeDesign.glow}
                      onChange={e =>
                        updateBadgeDesign(
                          'glow',
                          e.target.checked
                        )
                      }
                    />
                    <span>Glow</span>
                  </label>

                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={badgeDesign.metallic}
                      onChange={e =>
                        updateBadgeDesign(
                          'metallic',
                          e.target.checked
                        )
                      }
                    />
                    <span>Metallic</span>
                  </label>

                </div>

                <button
                  type="button"
                  className="create-button"
                  onClick={() => {
                    update('badge','Custom')
                    update('badge_style','custom')
                    update('item_type','Badge')
                    update(
                      'category_id',
                      categoryId('Badges')
                    )

                    if (
                      !form.name ||
                      form.name === 'Custom Badge'
                    ) {
                      const name = 'Custom Badge'
                      update('name',name)
                      update('slug',slugify(name))
                    }

                    setMessage('Custom badge design selected.')
                    setError('')
                  }}
                >
                  Use This Badge
                </button>

              </div>

              <div className="badge-designer-preview">

                <span className="badge-designer-label">
                  LIVE BADGE
                </span>

                <div
                  style={{
                    minHeight:'240px',
                    display:'grid',
                    placeItems:'center',
                    padding:'30px',
                    borderRadius:'24px',
                    background:'radial-gradient(circle at center, rgba(35,45,55,.8), rgba(5,7,10,.98))',
                    border:'1px solid rgba(255,255,255,.1)',
                    position:'relative',
                    overflow:'hidden',
                  }}
                >

                  <div
                    style={{
                      position:'absolute',
                      inset:0,
                      background:'linear-gradient(135deg, rgba(255,255,255,.04), transparent 45%, rgba(0,255,120,.05))',
                      pointerEvents:'none',
                    }}
                  />

                  <div
                    style={{
                      display:'flex',
                      flexDirection:'column',
                      alignItems:'center',
                      gap:'14px',
                      position:'relative',
                      zIndex:2,
                    }}
                  >

                    <span style={getBadgePreviewStyle(true)}>
                      {badgeDesign.icon}
                    </span>

                    <strong
                      style={{
                        color:'#fff',
                        fontSize:'18px',
                        letterSpacing:'.08em',
                        textTransform:'uppercase',
                      }}
                    >
                      {form.name || 'CUSTOM BADGE'}
                    </strong>

                  </div>

                </div>

              </div>

            </div>
          </div>

        </section>

        <section className="marketplace-step">

          <div className="step-heading">
            <span>2</span>
            <div>
              <strong>Finish the item</strong>
              <small>Set price and publishing options.</small>
            </div>
          </div>

          <div className="builder-grid">

            <div className="builder-fields">

              <label>
                Item Name
                <input
                  value={form.name}
                  onChange={e => update('name',e.target.value)}
                  placeholder="Select an item above"
                />
              </label>

              <label>
                Slug
                <input
                  value={form.slug}
                  onChange={e => update('slug',e.target.value)}
                />
              </label>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={e => update('description',e.target.value)}
                  rows={4}
                  placeholder="Describe this item"
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
                        c => c.id === form.category_id
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
                    onChange={e =>
                      update('price_vcoins',e.target.value)
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
                    onChange={e =>
                      update('price_kes',e.target.value)
                    }
                    placeholder="Optional"
                  />
                </label>

              </div>

              <label>
                Image URL
                <input
                  value={form.image_url}
                  onChange={e =>
                    update('image_url',e.target.value)
                  }
                  placeholder="Optional"
                />
              </label>

              <div className="two-columns">

                <label>
                  Starts
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={e =>
                      update('starts_at',e.target.value)
                    }
                  />
                </label>

                <label>
                  Expires
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={e =>
                      update('expires_at',e.target.value)
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
                  onChange={e =>
                    update(
                      'intensity',
                      Number(e.target.value)
                    )
                  }
                />

              </label>

              <div className="switch-row">

                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e =>
                      update(
                        'is_active',
                        e.target.checked
                      )
                    }
                  />
                  <span>Active</span>
                </label>

                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={form.is_limited}
                    onChange={e =>
                      update(
                        'is_limited',
                        e.target.checked
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
                  disabled={saving}
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
                  Every selection updates this preview.
                </small>
              </div>

              <div
                className={`market-preview preview-bg-${slugify(form.background)} preview-frame-${slugify(form.frame)}`}
              >

                <div className="preview-grid" />
                <div className="preview-noise" />

                <div
                  className={`preview-avatar-shell frame-${slugify(form.frame)}`}
                >
                  <div className="preview-avatar">
                    {username.slice(0,1).toUpperCase()}
                  </div>
                </div>

                <div
                  className={`preview-username-wrap effect-${slugify(form.effect)}`}
                  style={{
                    '--effect-intensity':
                      Number(form.intensity || 70) / 100,
                  }}
                >
                  <span className="effect-aura" />
                  <span className="effect-particles" />

                  <span
                    className={`preview-username font-${slugify(form.font)}`}
                  >
                    {username}
                  </span>
                </div>

                {form.item_type === 'Badge' && (
                  <div className="preview-badge-wrap">

                    <span
                      style={
                        form.badge === 'Custom'
                          ? getBadgePreviewStyle(true)
                          : undefined
                      }
                      className={
                        form.badge === 'Custom'
                          ? ''
                          : `market-badge large-badge badge-${selectedBadge?.style || 'verified'}`
                      }
                    >
                      {form.badge === 'Custom'
                        ? badgeDesign.icon
                        : selectedBadge?.icon}
                    </span>

                    <strong>
                      {form.badge === 'Custom'
                        ? form.name || 'Custom Badge'
                        : selectedBadge?.name}
                    </strong>

                  </div>
                )}

                <div className="preview-selection">

                  <strong>
                    {form.badge !== 'None'
                      ? form.badge
                      : form.effect !== 'None'
                      ? form.effect
                      : form.font !== 'Default'
                      ? form.font
                      : form.frame !== 'None'
                      ? form.frame
                      : form.background !== 'None'
                      ? form.background
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

            {items.map(item => (

              <div
                className="catalogue-item"
                key={item.id}
              >

                <div className="catalogue-item-main">
                  <strong>{item.name}</strong>

                  <span>
                    {item.marketplace_categories?.name || 'Uncategorised'}
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


