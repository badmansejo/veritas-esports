import React from 'react'

export default function InventoryItem({
  item,
  onView,
  onEquip,
  onUnequip,
}) {
  const quantity = Number(item.quantity || 1)
  const equipped = item.equipped === true

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
        aria-label={`View ${item.name}`}
      >
        <div className="inventory-item-preview">
          <div className="inventory-item-glow" />

          <div className="inventory-item-preview-content">
            <span className="inventory-item-type">
              {item.item_type || 'VERITAS ITEM'}
            </span>

            <div
              className={
                item.item_type === 'Name Font'
                  ? 'inventory-item-symbol inventory-font-preview'
                  : 'inventory-item-symbol'
              }
            >
              {item.item_type === 'Name Font' ? 'Aa' : 'V'}
            </div>
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

        <h3>{item.name}</h3>

        <p>
          {item.description || 'VERITAS Marketplace item.'}
        </p>

        <div className="inventory-item-meta">
          <span>
            Quantity: {quantity}
          </span>

          <span>
            {item.purchase_price_vcoins ?? 0} V Coins
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