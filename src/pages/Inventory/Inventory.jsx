import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import InventoryItem from './InventoryItem'
import './Inventory.css'

export default function Inventory() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadInventory = useCallback(async () => {
    if (!user?.id) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: inventoryData, error: inventoryError } =
        await supabase
          .from('user_inventory')
          .select(`
            id,
            user_id,
            item_id,
            quantity,
            purchase_price_vcoins,
            acquired_from,
            acquired_at,
            expires_at,
            is_active
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .gt('quantity', 0)
          .order('acquired_at', { ascending: false })

      if (inventoryError) throw inventoryError

      if (!inventoryData?.length) {
        setItems([])
        setSelectedItem(null)
        return
      }

      const itemIds = [
        ...new Set(inventoryData.map(item => item.item_id).filter(Boolean)),
      ]

      let marketplaceItems = []

      if (itemIds.length) {
        const { data, error: marketplaceError } = await supabase
          .from('marketplace_items')
          .select(`
            id,
            name,
            description,
            item_type,
            price_vcoins,
            image_url,
            preview_data,
            is_active
          `)
          .in('id', itemIds)

        if (marketplaceError) {
          console.warn(
            'Marketplace details could not be loaded:',
            marketplaceError.message
          )
        } else {
          marketplaceItems = data || []
        }
      }

      const { data: equippedItems, error: equippedError } =
        await supabase
          .from('equipped_items')
          .select('id, user_id, item_id, slot_type, equipped_at')
          .eq('user_id', user.id)

      if (equippedError) {
        console.warn(
          'Equipment status could not be loaded:',
          equippedError.message
        )
      }

      const marketplaceMap = new Map(
        marketplaceItems.map(item => [item.id, item])
      )

      const equippedMap = new Map(
        (equippedItems || []).map(item => [item.item_id, item])
      )

      // Keep owned records even when Marketplace details are unavailable.
      const combinedItems = inventoryData.map(inventoryItem => {
        const marketplaceItem =
          marketplaceMap.get(inventoryItem.item_id) || {}

        const equippedRecord = equippedMap.get(inventoryItem.item_id)

        return {
          ...inventoryItem,
          ...marketplaceItem,

          id: inventoryItem.id,
          item_id: inventoryItem.item_id,
          user_id: inventoryItem.user_id,
          quantity: inventoryItem.quantity,
          purchase_price_vcoins: inventoryItem.purchase_price_vcoins,
          acquired_from: inventoryItem.acquired_from,
          acquired_at: inventoryItem.acquired_at,
          expires_at: inventoryItem.expires_at,

          name: marketplaceItem.name || 'Marketplace item unavailable',
          item_type: marketplaceItem.item_type || 'Cosmetic',
          description:
            marketplaceItem.description ||
            'You own this item, but its Marketplace details are unavailable.',
          image_url: marketplaceItem.image_url || null,
          preview_data: marketplaceItem.preview_data || {},

          equipped: Boolean(equippedRecord),
          equipped_slot: equippedRecord?.slot_type || null,
          marketplace_record_missing: !marketplaceItem.id,
        }
      })

      setItems(combinedItems)

      setSelectedItem(current => {
        if (!current) return null
        return combinedItems.find(
          item => item.item_id === current.item_id
        ) || null
      })
    } catch (loadError) {
      console.error('Inventory loading error:', loadError)
      setError(loadError?.message || 'Unable to load your inventory.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  function handleView(item) {
    setError('')
    setMessage('')
    setSelectedItem(item)
  }

  function handleClose() {
    if (actionLoading) return
    setSelectedItem(null)
    setError('')
    setMessage('')
  }

  async function handleEquip(item) {
    if (!item?.item_id || actionLoading) return

    setActionLoading(true)
    setError('')
    setMessage('')

    try {
      const { error: rpcError } = await supabase.rpc('equip_item', {
        p_item_id: item.item_id,
      })

      if (rpcError) throw rpcError

      await loadInventory()
      setMessage(`${item.name} is now equipped.`)
    } catch (equipError) {
      console.error('Equip error:', equipError)
      setError(equipError?.message || 'Unable to equip this item.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUnequip(item) {
    if (!item?.item_id || actionLoading) return

    setActionLoading(true)
    setError('')
    setMessage('')

    try {
      const { error: rpcError } = await supabase.rpc('unequip_item', {
        p_item_id: item.item_id,
      })

      if (rpcError) throw rpcError

      await loadInventory()
      setMessage(`${item.name} has been unequipped.`)
    } catch (unequipError) {
      console.error('Unequip error:', unequipError)
      setError(unequipError?.message || 'Unable to unequip this item.')
    } finally {
      setActionLoading(false)
    }
  }

  function getPreviewLabel(item) {
    if (!item) return 'VERITAS'

    const preview = item.preview_data || {}
    const customLabel =
      preview.label ||
      preview.preview_text ||
      preview.text ||
      preview.symbol

    if (customLabel) return String(customLabel)

    switch ((item.item_type || '').toLowerCase()) {
      case 'name font': return 'Aa'
      case 'name glow': return 'GLOW'
      case 'name fire': return 'FIRE'
      case 'name ice': return 'ICE'
      case 'name electric': return 'VOLT'
      case 'profile frame': return 'FRAME'
      case 'profile background': return 'BG'
      case 'badge': return '★'
      case 'room card': return 'ROOM'
      case 'bundle': return 'V'
      default: return 'V'
    }
  }

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div>
          <p className="small-label">YOUR COLLECTION</p>
          <h1>Inventory</h1>
          <p>
            Manage the items you have purchased from the VERITAS Marketplace.
          </p>
        </div>

        <button
          type="button"
          className="inventory-back-button"
          onClick={() => navigate('/marketplace')}
        >
          ← Marketplace
        </button>
      </div>

      {message && (
        <div className="inventory-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="inventory-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="inventory-loading">Loading your inventory...</div>
      ) : items.length === 0 ? (
        <div className="inventory-empty">
          <div className="inventory-empty-icon">🎁</div>
          <h2>Your inventory is empty</h2>
          <p>Items you purchase from the Marketplace will appear here.</p>
          <button type="button" onClick={() => navigate('/marketplace')}>
            Visit Marketplace
          </button>
        </div>
      ) : (
        <div className="inventory-grid">
          {items.map(item => (
            <InventoryItem
              key={item.id || item.item_id}
              item={item}
              onView={handleView}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
            />
          ))}
        </div>
      )}

      {selectedItem && (
        <div
          className="inventory-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(0, 0, 0, 0.82)',
            boxSizing: 'border-box',
          }}
          onMouseDown={event => {
            if (event.target === event.currentTarget) handleClose()
          }}
        >
          <div
            className="inventory-modal"
            style={{
              position: 'relative',
              zIndex: 1000000,
              width: '100%',
              maxWidth: 540,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
            onMouseDown={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="inventory-modal-close"
              onClick={handleClose}
              disabled={actionLoading}
              aria-label="Close item details"
            >
              ×
            </button>

            <div className="inventory-modal-preview">
              {selectedItem.image_url ? (
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 180,
                    objectFit: 'contain',
                  }}
                  onError={event => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="inventory-modal-symbol">
                  {getPreviewLabel(selectedItem)}
                </div>
              )}

              {selectedItem.equipped && (
                <div className="inventory-item-equipped">✓ EQUIPPED</div>
              )}
            </div>

            <p className="small-label">
              {selectedItem.item_type || 'VERITAS ITEM'}
            </p>

            <h2>{selectedItem.name}</h2>
            <p>
              {selectedItem.description || 'VERITAS Marketplace item.'}
            </p>

            {selectedItem.marketplace_record_missing && (
              <p className="inventory-error">
                Marketplace details could not be loaded. Your ownership
                record is still available.
              </p>
            )}

            <div className="inventory-modal-details">
              <div>
                <span>Quantity</span>
                <strong>{selectedItem.quantity || 1}</strong>
              </div>
              <div>
                <span>Purchase Price</span>
                <strong>
                  {selectedItem.purchase_price_vcoins ?? 0} V Coins
                </strong>
              </div>
              <div>
                <span>Equipment Slot</span>
                <strong>{selectedItem.equipped_slot || 'Not equipped'}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedItem.equipped ? 'Equipped' : 'Owned'}</strong>
              </div>
            </div>

            <div className="inventory-modal-actions">
              {selectedItem.equipped ? (
                <button
                  type="button"
                  className="inventory-unequip-button"
                  onClick={() => handleUnequip(selectedItem)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Please wait...' : 'Unequip'}
                </button>
              ) : (
                <button
                  type="button"
                  className="inventory-equip-button"
                  onClick={() => handleEquip(selectedItem)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Equipping...' : 'Equip Item'}
                </button>
              )}

              <button
                type="button"
                className="inventory-view-button"
                onClick={handleClose}
                disabled={actionLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
