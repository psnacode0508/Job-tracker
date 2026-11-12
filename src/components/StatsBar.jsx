import React, { useState, useEffect, useCallback } from 'react';
import { fetchApplicationStats } from '../api/applicationsApi.js';

/**
 * Format currency values nicely (e.g. 125000 -> $125,000).
 */
const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * StatsBar component:
 * Fetches and displays live aggregated application metrics:
 * - Total applications
 * - Counts per status (Applied, Interview, Offer, Rejected)
 * - Formatted average offer salary
 * Supports loading and error states with a retry button.
 */
export const StatsBar = ({ refreshKey = 0 }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApplicationStats();
      if (res?.success && res?.data) {
        setStats(res.data);
      } else {
        throw new Error(res?.message || 'Failed to retrieve stats');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshKey]);

  if (loading) {
    return (
      <div className="stats-bar stats-bar--loading" style={styles.container}>
        <div style={styles.loadingText}>
          <div style={styles.miniSpinner} />
          <span>Updating application metrics…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-bar stats-bar--error" style={{ ...styles.container, ...styles.errorContainer }}>
        <span style={styles.errorText}>⚠️ {error}</span>
        <button onClick={loadStats} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  const counts = stats?.counts || {
    Applied: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
  };

  const total = Object.values(counts).reduce((acc, curr) => acc + curr, 0);
  const avgOfferSalary = stats?.averageOfferSalary || 0;

  return (
    <aside className="stats-bar" aria-label="Application statistics overview" style={styles.container}>
      {/* Total applications */}
      <div style={styles.statCard}>
        <span style={styles.statLabel}>Total Apps</span>
        <span style={styles.statValue}>{total}</span>
      </div>

      <div style={styles.divider} />

      {/* Status breakdown pills */}
      <div style={styles.statusGroup}>
        <div style={{ ...styles.pill, ...styles.pillApplied }}>
          <span style={styles.pillDot} />
          <span>Applied: <strong>{counts.Applied}</strong></span>
        </div>

        <div style={{ ...styles.pill, ...styles.pillInterview }}>
          <span style={{ ...styles.pillDot, backgroundColor: '#f59e0b' }} />
          <span>Interview: <strong>{counts.Interview}</strong></span>
        </div>

        <div style={{ ...styles.pill, ...styles.pillOffer }}>
          <span style={{ ...styles.pillDot, backgroundColor: '#10b981' }} />
          <span>Offer: <strong>{counts.Offer}</strong></span>
        </div>

        <div style={{ ...styles.pill, ...styles.pillRejected }}>
          <span style={{ ...styles.pillDot, backgroundColor: '#ef4444' }} />
          <span>Rejected: <strong>{counts.Rejected}</strong></span>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Average offer salary */}
      <div style={styles.statCard}>
        <span style={styles.statLabel}>Avg Offer Salary</span>
        <span style={{ ...styles.statValue, color: '#34d399' }}>
          {formatCurrency(avgOfferSalary)}
        </span>
      </div>
    </aside>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '12px auto 20px',
    padding: '12px 20px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
  },
  loadingText: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#94a3b8',
    fontSize: '0.9rem',
    width: '100%',
    justifyContent: 'center',
    padding: '8px 0',
  },
  miniSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(148, 163, 184, 0.3)',
    borderTopColor: '#818cf8',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorContainer: {
    borderColor: '#7f1d1d',
    backgroundColor: '#1e1b24',
  },
  errorText: {
    color: '#f87171',
    fontSize: '0.9rem',
  },
  retryButton: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    fontWeight: '600',
  },
  statValue: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#f8fafc',
  },
  divider: {
    width: '1px',
    height: '36px',
    backgroundColor: '#334155',
  },
  statusGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.82rem',
    color: '#f8fafc',
  },
  pillDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#60a5fa',
  },
  pillApplied: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  pillInterview: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  pillOffer: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  pillRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
};

export default StatsBar;
