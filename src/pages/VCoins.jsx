import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function VCoins() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()

  const [packages, setPackages] = useState([])
  const [purchases, setPurchases] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const kesBalance = Number(profile?.kes_balance || 0)
  const vcoinBalance = Number(profile?.vcoins || 0)

  useEffect(() => {
    if (profile?.id) {
      loadVCoins()
    }
  }, [profile?.id])

  async function loadVCoins() {
    setLoading(true)
    setError('')

    try {
      const [packagesResult, purchasesResult, transactionsResult] =
        await Promise.all([
          supabase
            .from('vcoin_packages')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),

          supabase
            .from('vcoin_purchases')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(20),

          supabase
            .from('vcoin_transactions')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ])

      if (packagesResult.error) throw packagesResult.error
      if (purchasesResult.error) throw purchasesResult.error
      if (transactionsResult.error) throw transactionsResult.error

      setPackages(packagesResult.data || [])
      setPurchases(purchasesResult.data || [])
      setTransactions(transactionsResult.data || [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Unable to load V Coins.')
    } finally {
      setLoading(false)
    }
  }

  async function buyPackage(item) {
    const price = Number(item.price_kes || 0)
    const totalVcoins =
      Number(item.vcoins || 0) +
      Number(item.bonus_vcoins || 0)

    setMessage('')
    setError('')

    if (kesBalance < price) {
      setError(
        `Insufficient KES balance. You need KES ${price.toLocaleString('en-KE')}.`
      )
      return
    }

    const confirmed = window.confirm(
      `Buy ${totalVcoins.toLocaleString()} V Coins for KES ${price.toLocaleString('en-KE')}?`
    )

    if (!confirmed) return

    setBuying(item.id)

    try {
      const { data, error: purchaseError } =
        await supabase.rpc('buy_vcoins', {
          p_package_id: item.id,
        })

      if (purchaseError) {
        throw purchaseError
      }

      setMessage(
        `${Number(data?.vcoins || totalVcoins).toLocaleString()} V Coins added successfully.`
      )

      await refreshProfile()
      await loadVCoins()
    } catch (err) {
      console.error('V Coin purchase error:', err)

      setError(
        err.message?.includes('Insufficient KES balance')
          ? 'Insufficient KES balance.'
          : err.message || 'Unable to complete purchase.'
      )
    } finally {
      setBuying(null)
    }
  }

  function formatDate(value) {
    if (!value) return '-'

    return new Date(value).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function transactionLabel(type) {
    if (type === 'Purchase') return 'Purchased'
    if (type === 'Admin Award') return 'Received from VERITAS'
    return type || 'V Coin Transaction'
  }

  return (
    <div className="min-h-screen bg-[#050608] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white"
            >
              ←
            </button>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
                VERITAS
              </div>

              <h1 className="text-3xl font-black">
                V Coins
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right">
              <div className="text-[9px] uppercase tracking-wider text-white/35">
                KES Balance
              </div>

              <div className="text-xl font-black">
                KES {kesBalance.toLocaleString('en-KE')}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right">
              <div className="text-[9px] uppercase tracking-wider text-white/35">
                V Coins
              </div>

              <div className="text-xl font-black">
                {vcoinBalance.toLocaleString()}
              </div>
            </div>
          </div>
        </header>

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm text-emerald-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.045] p-6 sm:p-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            VERITAS CURRENCY
          </div>

          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            Buy V Coins with KES.
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            Your KES balance is checked before purchase. If you have enough,
            the KES is deducted and your V Coins are added immediately.
          </p>
        </section>

        <section className="mb-10">
          <div className="mb-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              PACKAGES
            </div>

            <h2 className="mt-1 text-2xl font-black">
              Buy V Coins
            </h2>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-56 animate-pulse rounded-3xl border border-white/5 bg-white/[0.035]"
                />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-10 text-center">
              <h3 className="text-lg font-bold">
                No V Coin packages available
              </h3>

              <p className="mt-2 text-sm text-white/40">
                Packages will appear when activated by VERITAS.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((item) => {
                const base = Number(item.vcoins || 0)
                const bonus = Number(item.bonus_vcoins || 0)
                const total = base + bonus
                const price = Number(item.price_kes || 0)
                const enough = kesBalance >= price

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"
                  >
                    <div className="mb-5 flex items-start justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                          V COINS
                        </div>

                        <h3 className="mt-1 text-xl font-black">
                          {item.name}
                        </h3>
                      </div>

                      {bonus > 0 && (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                          +{bonus} Bonus
                        </span>
                      )}
                    </div>

                    <div className="mb-5">
                      <div className="text-4xl font-black">
                        {total.toLocaleString()}
                      </div>

                      <div className="mt-1 text-xs text-white/40">
                        V Coins
                      </div>
                    </div>

                    <p className="mb-5 min-h-10 text-sm leading-5 text-white/45">
                      {item.description || `${total} V Coins`}
                    </p>

                    <div className="mb-4 flex items-end justify-between">
                      <span className="text-xs text-white/35">
                        Price
                      </span>

                      <strong className="text-xl">
                        KES {price.toLocaleString('en-KE')}
                      </strong>
                    </div>

                    <button
                      type="button"
                      disabled={buying === item.id || !enough}
                      onClick={() => buyPackage(item)}
                      className={`w-full rounded-xl px-5 py-3.5 text-sm font-black transition ${
                        buying === item.id
                          ? 'cursor-wait bg-white/40 text-black'
                          : enough
                            ? 'bg-white text-black hover:bg-white/85'
                            : 'cursor-not-allowed bg-white/10 text-white/35'
                      }`}
                    >
                      {buying === item.id
                        ? 'Processing...'
                        : enough
                          ? 'Buy Package'
                          : 'Insufficient KES'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="mb-10">
          <div className="mb-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              TRANSACTION HISTORY
            </div>

            <h2 className="mt-1 text-2xl font-black">
              V Coin Activity
            </h2>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center text-sm text-white/40">
              No V Coin transactions yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {transactions.map((transaction) => {
                const amount = Number(transaction.vcoins || 0)
                const before = Number(transaction.balance_before || 0)
                const after = Number(transaction.balance_after || 0)

                return (
                  <div
                    key={transaction.id}
                    className="border-b border-white/5 bg-white/[0.025] p-4 last:border-b-0"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div>
                        <div className="font-black">
                          {transactionLabel(transaction.transaction_type)}
                        </div>

                        <div className="mt-1 text-xs text-white/35">
                          {transaction.description || 'V Coin transaction'}
                        </div>

                        {transaction.reference && (
                          <div className="mt-2 text-[10px] font-mono text-white/25">
                            REF: {transaction.reference}
                          </div>
                        )}
                      </div>

                      <div className="sm:text-right">
                        <div className="text-lg font-black">
                          +{amount.toLocaleString()} V Coins
                        </div>

                        <div className="mt-1 text-xs text-white/40">
                          Balance: {before.toLocaleString()} → {after.toLocaleString()}
                        </div>

                        <div className="mt-1 text-[10px] text-white/25">
                          {formatDate(transaction.created_at)}
                        </div>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              PURCHASE RECORDS
            </div>

            <h2 className="mt-1 text-2xl font-black">
              V Coin Purchases
            </h2>
          </div>

          {purchases.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center text-sm text-white/40">
              No V Coin purchases yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex flex-col gap-3 border-b border-white/5 bg-white/[0.025] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <strong>
                      {Number(purchase.vcoins || 0).toLocaleString()} V Coins
                    </strong>

                    <div className="mt-1 text-xs text-white/35">
                      KES {Number(purchase.kes_amount || 0).toLocaleString('en-KE')}
                    </div>

                    {purchase.reference && (
                      <div className="mt-1 text-[10px] font-mono text-white/25">
                        {purchase.reference}
                      </div>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs font-bold">
                      {purchase.status || 'Pending'}
                    </div>

                    <div className="mt-1 text-[10px] text-white/30">
                      {formatDate(purchase.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
