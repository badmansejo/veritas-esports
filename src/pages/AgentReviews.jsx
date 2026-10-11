import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BUCKET = 'match-evidence';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#080b12',
    color: '#f3f4f6',
    padding: '24px 16px',
    fontFamily: 'Arial, sans-serif',
  },
  container: { maxWidth: 1000, margin: '0 auto' },
  card: {
    background: '#111827',
    border: '1px solid #293244',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  button: {
    padding: '11px 15px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 700,
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#080b12',
    color: '#fff',
    border: '1px solid #374151',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
};

export default function AgentReviews() {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const currentUser = authData?.user;

      if (!currentUser) {
        setUser(null);
        setReviews([]);
        setError('Please sign in with your agent account.');
        return;
      }

      setUser(currentUser);

      const { data: results, error: resultsError } = await supabase
        .from('match_results')
        .select('*')
        .eq('assigned_agent_id', currentUser.id)
        .order('submitted_at', { ascending: true });

      if (resultsError) throw resultsError;

      const unresolved = (results || []).filter((result) =>
        ['pending', 'disputed', 'awaiting admin review'].includes(
          String(result.result_status || '').toLowerCase()
        )
      );

      if (!unresolved.length) {
        setReviews([]);
        return;
      }

      const matchIds = [
        ...new Set(unresolved.map((result) => result.match_id)),
      ];

      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .in('id', matchIds);

      if (matchesError) throw matchesError;

      const matchMap = Object.fromEntries(
        (matches || []).map((match) => [match.id, match])
      );

      const tournamentIds = [
        ...new Set(
          (matches || [])
            .map((match) => match.tournament_id)
            .filter(Boolean)
        ),
      ];

      let tournamentMap = {};

      if (tournamentIds.length) {
        const { data: tournaments, error: tournamentsError } =
          await supabase
            .from('tournaments')
            .select('id, name, game, format')
            .in('id', tournamentIds);

        if (tournamentsError) throw tournamentsError;

        tournamentMap = Object.fromEntries(
          (tournaments || []).map((tournament) => [
            tournament.id,
            tournament,
          ])
        );
      }

      const enriched = await Promise.all(
        unresolved.map(async (result) => {
          const match = matchMap[result.match_id];
          let evidenceUrl = '';

          if (result.evidence_url) {
            const { data, error: signedUrlError } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(result.evidence_url, 300);

            if (!signedUrlError) {
              evidenceUrl = data?.signedUrl || '';
            }
          }

          return {
            ...result,
            match,
            tournament: match
              ? tournamentMap[match.tournament_id]
              : null,
            evidenceUrl,
          };
        })
      );

      setReviews(enriched);
    } catch (err) {
      setError(err.message || 'Could not load assigned reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function submitDecision(review, decision) {
    if (!user) {
      setError('Please sign in first.');
      return;
    }

    const reason = String(reasons[review.id] || '').trim();

    if (decision === 'reject' && reason.length < 5) {
      setError('Enter a rejection reason of at least 5 characters.');
      return;
    }

    if (
      !window.confirm(
        decision === 'confirm'
          ? 'Confirm this submitted match result?'
          : 'Reject this result and escalate it to the admin?'
      )
    ) {
      return;
    }

    setBusyId(review.id);
    setError('');
    setNotice('');

    try {
      const { error: rpcError } = await supabase.rpc(
        'veritas_agent_review_match_result',
        {
          p_match_result_id: review.id,
          p_decision: decision,
          p_reason: decision === 'reject' ? reason : null,
        }
      );

      if (rpcError) throw rpcError;

      setNotice(
        decision === 'confirm'
          ? 'Result confirmed.'
          : 'Result rejected and escalated for admin review.'
      );

      await loadReviews();
    } catch (err) {
      setError(err.message || 'Could not submit the review.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={{ marginBottom: 24 }}>
          <div
            style={{
              color: '#a78bfa',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            VERITAS ESPORTS
          </div>

          <h1 style={{ marginBottom: 8 }}>Agent Match Reviews</h1>

          <p style={{ color: '#9ca3af', marginTop: 0 }}>
            Review assigned match evidence carefully before deciding.
          </p>

          <button
            style={{
              ...styles.button,
              background: '#293244',
              color: '#fff',
            }}
            onClick={loadReviews}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh reviews'}
          </button>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              ...styles.card,
              borderColor: '#b91c1c',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            style={{
              ...styles.card,
              borderColor: '#047857',
              color: '#6ee7b7',
            }}
          >
            {notice}
          </div>
        )}

        {!loading && user && (
          <p style={{ color: '#9ca3af' }}>
            Assigned unresolved reviews: <strong>{reviews.length}</strong>
          </p>
        )}

        {loading && <p>Loading assigned reviews...</p>}

        {!loading && user && reviews.length === 0 && (
          <section style={styles.card}>
            <h3>No pending reviews</h3>
            <p style={{ color: '#9ca3af' }}>
              New assignments will appear here when they are assigned to
              your account.
            </p>
          </section>
        )}

        {reviews.map((review) => {
          const match = review.match;
          const tournament = review.tournament;
          const isBusy = busyId === review.id;

          return (
            <section key={review.id} style={styles.card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2 style={{ marginTop: 0, marginBottom: 6 }}>
                    {tournament?.name || 'Tournament match'}
                  </h2>

                  <p style={{ color: '#9ca3af', marginTop: 0 }}>
                    {tournament?.game || 'Game not specified'}
                    {match?.round_number
                      ? ` · Round ${match.round_number}`
                      : ''}
                    {match?.match_number
                      ? ` · Match ${match.match_number}`
                      : ''}
                  </p>
                </div>

                <span
                  style={{
                    alignSelf: 'flex-start',
                    background: '#312e81',
                    color: '#c4b5fd',
                    padding: '6px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                  }}
                >
                  {review.result_status}
                </span>
              </div>

              <div
                style={{
                  background: '#080b12',
                  borderRadius: 10,
                  padding: 16,
                  margin: '16px 0',
                }}
              >
                <h3 style={{ marginTop: 0 }}>Submitted score</h3>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    textAlign: 'center',
                  }}
                >
                  {review.player_one_score} : {review.player_two_score}
                </div>

                <p style={{ color: '#9ca3af', fontSize: 13 }}>
                  Submitted:{' '}
                  {review.submitted_at
                    ? new Date(review.submitted_at).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>

              {review.dispute_reason && (
                <div style={{ marginBottom: 16 }}>
                  <strong>Dispute / review notes</strong>
                  <p style={{ color: '#fbbf24' }}>
                    {review.dispute_reason}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <strong>Evidence screenshot</strong>

                <p style={{ color: '#9ca3af', fontSize: 13 }}>
                  Signed links expire after five minutes. Refresh if needed.
                </p>

                {review.evidenceUrl ? (
                  <a
                    href={review.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#93c5fd' }}
                  >
                    Open submitted evidence
                  </a>
                ) : (
                  <p style={{ color: '#fbbf24' }}>
                    Evidence is unavailable. Check storage access and the
                    saved evidence path before deciding.
                  </p>
                )}
              </div>

              <label
                htmlFor={`reason-${review.id}`}
                style={{ display: 'block', fontWeight: 700 }}
              >
                Rejection reason (required when rejecting)
              </label>

              <textarea
                id={`reason-${review.id}`}
                value={reasons[review.id] || ''}
                onChange={(event) =>
                  setReasons((previous) => ({
                    ...previous,
                    [review.id]: event.target.value,
                  }))
                }
                placeholder="Explain why the result should be rejected..."
                rows={3}
                style={styles.input}
                disabled={isBusy}
              />

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 16,
                }}
              >
                <button
                  style={{
                    ...styles.button,
                    background: '#047857',
                    color: '#fff',
                    opacity: isBusy ? 0.6 : 1,
                  }}
                  disabled={isBusy}
                  onClick={() => submitDecision(review, 'confirm')}
                >
                  {isBusy ? 'Submitting...' : 'Confirm result'}
                </button>

                <button
                  style={{
                    ...styles.button,
                    background: '#991b1b',
                    color: '#fff',
                    opacity: isBusy ? 0.6 : 1,
                  }}
                  disabled={isBusy}
                  onClick={() => submitDecision(review, 'reject')}
                >
                  Reject and escalate
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
