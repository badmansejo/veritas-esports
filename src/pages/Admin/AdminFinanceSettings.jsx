import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminFinanceSettings.css'

export default function AdminFinanceSettings() {
  const [minimumWithdrawal, setMinimumWithdrawal] = useState('')
  const [withdrawalFee, setWithdrawalFee] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadSettings = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'minimum_withdrawal',
        'withdrawal_platform_fee_percent',
      ])

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    const settings = data || []

    const minimum = settings.find(
      (item) => item.setting_key === 'minimum_withdrawal'
    )

    const fee = settings.find(
      (item) => item.setting_key === 'withdrawal_platform_fee_percent'
    )

    if (minimum) {
      setMinimumWithdrawal(
        String(Number(minimum.setting_value ?? 0))
      )
    }

    if (fee) {
      setWithdrawalFee(
        String(Number(fee.setting_value ?? 0))
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const saveSettings = async (event) => {
    event.preventDefault()

    const minimum = Number(minimumWithdrawal)
    const fee = Number(withdrawalFee)

    if (!Number.isFinite(minimum) || minimum < 0) {
      alert('Minimum withdrawal must be zero or greater.')
      return
    }

    if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
      alert('Withdrawal fee must be between 0% and 100%.')
      return
    }

    setSaving(true)

    const { error } = await supabase.rpc(
      'admin_save_withdrawal_settings',
      {
        p_minimum_withdrawal: minimum,
        p_withdrawal_fee_percent: fee,
      }
    )

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    alert('Finance settings saved successfully.')
    setSaving(false)
    await loadSettings()
  }

  return (
    <div className="admin-finance-settings">
      <div className="admin-finance-settings-header">
        <div>
          <div className="admin-finance-settings-eyebrow">
            VERITAS FINANCE
          </div>

          <h1>Finance Settings</h1>

          <p>
            Control the main wallet and withdrawal financial settings.
          </p>
        </div>
      </div>

      <div className="admin-finance-settings-card">
        {loading ? (
          <div className="admin-finance-settings-loading">
            Loading finance settings...
          </div>
        ) : (
          <form onSubmit={saveSettings}>
            <div className="admin-finance-setting">
              <div>
                <strong>Minimum Withdrawal</strong>
                <span>
                  Minimum KES amount a user can withdraw.
                </span>
              </div>

              <div className="admin-finance-input-wrap">
                <span>KES</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minimumWithdrawal}
                  onChange={(event) =>
                    setMinimumWithdrawal(event.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="admin-finance-divider" />

            <div className="admin-finance-setting">
              <div>
                <strong>Withdrawal Platform Fee</strong>
                <span>
                  Percentage charged by VERITAS on withdrawals.
                </span>
              </div>

              <div className="admin-finance-input-wrap">
                <span>%</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={withdrawalFee}
                  onChange={(event) =>
                    setWithdrawalFee(event.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="admin-finance-note">
              <strong>How it works</strong>
              <p>
                The fee is calculated from the user's requested withdrawal
                amount. The user's wallet is deducted by the requested amount,
                while the fee is recorded separately for VERITAS finance
                tracking.
              </p>
            </div>

            <button
              type="submit"
              className="admin-finance-save"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Finance Settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
