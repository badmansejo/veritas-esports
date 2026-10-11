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
    username: username || 'Player',
  })
  const [equippedItems, setEquippedItems] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadCosmetics() {
      if (!userId) return

      const [profileResult, equippedResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('equipped_items')
          .select('id,user_id,item_id,slot_type,equipped_at')
          .eq('user_id', userId),
      ])

      if (cancelled) return

      const profileData = profileResult.data || {}
      const equippedRows = equippedResult.data || []

      setProfile({
        ...profileData,
        id: userId,
        username: profileData.username || username || 'Player',
      })

      if (!equippedRows.length) {
        setEquippedItems([])
        return
      }

      const itemIds = [
        ...new Set(equippedRows.map(row => row.item_id).filter(Boolean)),
      ]

      if (!itemIds.length) {
        setEquippedItems([])
        return
      }

      const { data: marketplaceItems } = await supabase
        .from('marketplace_items')
        .select('id,name,item_type,preview_data,image_url,is_active')
        .in('id', itemIds)

      if (cancelled) return

      const combined = equippedRows
        .map(row => {
          const item = (marketplaceItems || []).find(
            entry => entry.id === row.item_id
          )

          return item
            ? {
                ...item,
                slot_type: row.slot_type,
                equipped_at: row.equipped_at,
              }
            : null
        })
        .filter(Boolean)

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
