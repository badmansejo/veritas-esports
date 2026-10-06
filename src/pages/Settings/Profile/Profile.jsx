import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import './Profile.css'

export default function Profile() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const username =
    profile?.username || 'VERITAS PLAYER'

  const userId =
    profile?.veritas_user_id
      ? String(profile.veritas_user_id)
      : '-----'

  const wins =
    profile?.wins ??
    profile?.tournament_wins ??
    0

  const badges =
    profile?.badges_count ??
    (Array.isArray(profile?.badges)
      ? profile.badges.length
      : profile?.badges || 0)

  const sponsorBadge =
    profile?.sponsor_badge

  return (
    <div className="profile-page">
      <div className="profile-container">

        <button
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

            <div>
              <h2>{username}</h2>

              <div className="profile-user-id">
                ID: {userId}
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
              <strong>{userId}</strong>
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
            <strong>{userId}</strong>
            <span>VERITAS ID</span>
          </div>

        </div>

        {sponsorBadge && (
          <div className="profile-sponsor">
            <div className="profile-sponsor-icon">
              🏆
            </div>

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
          className="profile-marketplace"
          onClick={() => navigate('/marketplace')}
        >
          Visit Marketplace
        </button>

      </div>
    </div>
  )
}
