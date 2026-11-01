import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import StyledUsername from '../../../components/StyledUsername'
import './Profile.css'

export default function Profile() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [equippedItems, setEquippedItems] = useState([])

  const userId = profile?.id
  const username = profile?.username || 'VERITAS PLAYER'

  useEffect(() => {
    let cancelled = false

    async function loadEquippedItems() {
      if (!userId) {
        setEquippedItems([])
        return
      }

      const { data: equippedRows, error } = await supabase
        .from('equipped_items')
        .select('id,user_id,item_id,slot_type,equipped_at')
        .eq('user_id', userId)

      if (cancelled) return

      if (error || !equippedRows?.length) {
        console.error('Could not load equipped items:', error)
        setEquippedItems([])
        return
      }

      const itemIds = [...new Set(
        equippedRows.map(row => row.item_id).filter(Boolean)
      )]

      const { data: marketplaceItems, error: itemError } = await supabase
        .from('marketplace_items')
        .select('id,name,item_type,preview_data,image_url')
        .in('id', itemIds)

      if (cancelled) return

      if (itemError) {
        console.error('Could not load marketplace items:', itemError)
        setEquippedItems([])
        return
      }

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

      console.log('VERITAS equipped items:', combined)
      setEquippedItems(combined)
    }

    loadEquippedItems()

    return () => {
      cancelled = true
    }
  }, [userId])

  const userIdLabel = profile?.veritas_user_id
    ? String(profile.veritas_user_id)
    : '-----'

  const wins = profile?.wins ?? profile?.tournament_wins ?? 0

  const badges =
    profile?.badges_count ??
    (Array.isArray(profile?.badges)
      ? profile.badges.length
      : profile?.badges || 0)

  const sponsorBadge = profile?.sponsor_badge

  const getItemType = item => [
    item?.item_type,
    item?.name,
    item?.slot_type,
    item?.preview_data?.type,
    item?.preview_data?.item_type,
    item?.preview_data?.category,
    item?.preview_data?.slot_type,
  ].filter(Boolean).join(' ').toLowerCase().replace(/[_-]+/g, ' ')

  const hasEquippedBadge = equippedItems.some(item =>
    /\bbadge\b/.test(getItemType(item))
  )

  return (
    <div className="profile-page">
      <div className="profile-container">
        <button
          type="button"
          className="profile-back"
          onClick={() => navigate('/settings')}
        >
          ←
        </button>

        <div className="profile-heading">
          <h1>Profile</h1>
          <p>View your VERITAS player profile</p>
        </div>

        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {username.charAt(0).toUpperCase()}
            </div>

            <div className="profile-identity">
              <h2>
                <StyledUsername
                  profile={{ ...profile, username }}
                  equippedItems={equippedItems}
                  className="profile-equipped-username"
                />
              </h2>

              <div className="profile-user-id">
                ID: {userIdLabel}
              </div>
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-info-row">
              <span>Username</span>
              <strong>{username}</strong>
            </div>

            <div className="profile-info-row">
              <span>VERITAS User ID</span>
              <strong>{userIdLabel}</strong>
            </div>

            <div className="profile-info-row">
              <span>Tournament Wins</span>
              <strong>{wins}</strong>
            </div>

            <div className="profile-info-row">
              <span>Badges</span>
              <strong>{badges}</strong>
            </div>

            <div className="profile-info-row">
              <span>Equipped Badge</span>
              <strong>{hasEquippedBadge ? 'Equipped' : 'None'}</strong>
            </div>

            <div className="profile-info-row">
              <span>Avatar</span>
              <strong>Marketplace</strong>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <strong>{wins}</strong>
            <span>Tournament Wins</span>
          </div>

          <div className="profile-stat">
            <strong>{badges}</strong>
            <span>Badges</span>
          </div>

          <div className="profile-stat">
            <strong>{userIdLabel}</strong>
            <span>VERITAS ID</span>
          </div>
        </div>

        {sponsorBadge && (
          <div className="profile-sponsor">
            <div className="profile-sponsor-icon">🏆</div>
            <div>
              <strong>Sponsor Badge</strong>
              <span>
                {typeof sponsorBadge === 'string'
                  ? sponsorBadge
                  : 'Verified Sponsor'}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="profile-marketplace"
          onClick={() => navigate('/marketplace')}
        >
          Visit Marketplace
        </button>
      </div>
    </div>
  )
}
