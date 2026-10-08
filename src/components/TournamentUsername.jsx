import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StyledUsername from './StyledUsername'

export default function TournamentUsername({
  userId,
  username,
  className = '',
}) {
  const [profile, setProfile] = useState({
    id: userId,
    username,
  })

  const [equippedItems, setEquippedItems] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadCosmetics() {
      if (!userId) {
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      const { data: equipped } = await supabase
        .from('equipped_items')
        .select(
          'id,user_id,item_id,slot_type,equipped_at'
        )
        .eq('user_id', userId)

      if (cancelled) return

      const equippedRows = equipped || []

      if (!equippedRows.length) {
        setProfile({
          ...(profileData || {}),
          id: userId,
          username:
            profileData?.username ||
            username ||
            'Player',
        })
        setEquippedItems([])
        return
      }

      const itemIds = equippedRows
        .map((row) => row.item_id)
        .filter(Boolean)

      let marketplaceItems = []

      if (itemIds.length) {
        const { data } = await supabase
          .from('marketplace_items')
          .select(
            'id,name,item_type,preview_data,image_url,is_active'
          )
          .in('id', itemIds)

        marketplaceItems = data || []
      }

      const combined = equippedRows
        .map((equippedRow) => {
          const item = marketplaceItems.find(
            (marketplaceItem) =>
              marketplaceItem.id === equippedRow.item_id
          )

          return item
            ? {
                ...item,
                slot_type: equippedRow.slot_type,
                equipped_at: equippedRow.equipped_at,
              }
            : null
        })
        .filter(Boolean)

      setProfile({
        ...(profileData || {}),
        id: userId,
        username:
          profileData?.username ||
          username ||
          'Player',
      })

      setEquippedItems(combined)
    }

    loadCosmetics()

    return () => {
      cancelled = true
    }
  }, [userId, username])

  return (
    <StyledUsername
      profile={profile}
      equippedItems={equippedItems}
      className={className}
    />
  )
}
