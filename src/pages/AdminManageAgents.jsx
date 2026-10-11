import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminManageAgents() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData?.user) throw new Error('Please sign in first.');

      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', authData.user.id)
        .single();

      if (adminError) throw adminError;
      if (adminProfile?.is_admin !== true) {
        throw new Error('Access denied. Admins only.');
      }

      const { data, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, veritas_user_id, account_status, is_admin, is_agent')
        .eq('is_admin', false)
        .eq('account_status', 'active')
        .order('username', { ascending: true });

      if (usersError) throw usersError;
      setUsers(data || []);
    } catch (err) {
      setError(err.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleAgent = async (user) => {
    const enabled = user.is_agent !== true;
    const action = enabled ? 'assign this user as an agent' : 'remove this agent';

    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    setBusyId(user.id);
    setError('');
    setMessage('');

    try {
      const { error: rpcError } = await supabase.rpc(
        'veritas_set_tournament_agent',
        {
          p_user_id: user.id,
          p_enabled: enabled,
        }
      );

      if (rpcError) throw rpcError;

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, is_agent: enabled } : item
        )
      );

      setMessage(
        enabled
          ? `${user.username || 'User'} is now a tournament agent.`
          : `${user.username || 'User'} is no longer a tournament agent.`
      );
    } catch (err) {
      setError(err.message || 'Could not update agent status.');
    } finally {
      setBusyId('');
    }
  };

  const page = {
    minHeight: '100vh',
    background: '#080b12',
    color: '#f3f4f6',
    padding: '24px 16px',
    fontFamily: 'Arial, sans-serif',
  };

  const card = {
    background: '#111827',
    border: '1px solid #293244',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  };

  const button = {
    border: 0,
    borderRadius: 8,
    padding: '10px 14px',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  };

  return (
    <main style={page}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1>Manage Tournament Agents</h1>
        <p style={{ color: '#9ca3af' }}>
          Select existing active users who can review assigned tournament disputes.
          This does not create new login accounts.
        </p>

        <button
          style={{ ...button, background: '#374151', marginBottom: 18 }}
          onClick={loadUsers}
          disabled={loading}
        >
          Refresh users
        </button>

        {error && (
          <div style={{ ...card, borderColor: '#ef4444', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ ...card, borderColor: '#16a34a', color: '#86efac' }}>
            {message}
          </div>
        )}

        {loading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <div style={card}>No active non-admin users were found.</div>
        ) : (
          users.map((user) => (
            <section key={user.id} style={card}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <strong style={{ fontSize: 17 }}>
                    {user.username || 'Unnamed user'}
                  </strong>
                  <div style={{ color: '#9ca3af', marginTop: 6 }}>
                    VERITAS ID: {user.veritas_user_id || 'Not set'}
                  </div>
                  <div style={{
                    color: user.is_agent ? '#86efac' : '#d1d5db',
                    marginTop: 6,
                  }}>
                    {user.is_agent ? 'Tournament agent' : 'Regular user'}
                  </div>
                </div>

                <button
                  style={{
                    ...button,
                    background: user.is_agent ? '#991b1b' : '#6d28d9',
                    opacity: busyId === user.id ? 0.6 : 1,
                  }}
                  disabled={busyId === user.id}
                  onClick={() => toggleAgent(user)}
                >
                  {busyId === user.id
                    ? 'Saving...'
                    : user.is_agent
                      ? 'Remove Agent'
                      : 'Add Agent'}
                </button>
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
