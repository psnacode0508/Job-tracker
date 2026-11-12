import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  fetchApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../api/applicationsApi.js';
import Header from '../components/Header.jsx';
import StatsBar from '../components/StatsBar.jsx';
import ApplicationForm from '../components/ApplicationForm.jsx';
import Board from '../components/Board.jsx';

const STAGES = ['Applied', 'Interview', 'Offer'];

export const DashboardPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query parameters
  const searchParam = searchParams.get('search') || '';
  const statusParam = searchParams.get('status') || 'All';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limitParam = 10;

  // Local state
  const [applications, setApplications] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Form submission state & stats refresh key
  const [isCreating, setIsCreating] = useState(false);
  const [busyCardIds, setBusyCardIds] = useState(new Set());
  const [statsVersion, setStatsVersion] = useState(0);

  // Helper to update URL query params
  const updateQueryParams = useCallback(
    (newParams) => {
      const next = new URLSearchParams(searchParams);

      if (newParams.search !== undefined) {
        if (newParams.search.trim()) {
          next.set('search', newParams.search.trim());
        } else {
          next.delete('search');
        }
        next.set('page', '1'); // Reset to page 1 on search change
      }

      if (newParams.status !== undefined) {
        if (newParams.status && newParams.status !== 'All') {
          next.set('status', newParams.status);
        } else {
          next.delete('status');
        }
        next.set('page', '1'); // Reset to page 1 on status change
      }

      if (newParams.page !== undefined) {
        next.set('page', String(newParams.page));
      }

      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  // Fetch applications list from API
  const loadApplications = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = {
        page: pageParam,
        limit: limitParam,
        ...(searchParam.trim() ? { search: searchParam.trim() } : {}),
        ...(statusParam !== 'All' ? { status: statusParam } : {}),
      };

      const res = await fetchApplications(params);
      if (res?.success) {
        setApplications(res.data || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      } else {
        throw new Error(res?.message || 'Failed to fetch applications');
      }
    } catch (err) {
      setFetchError(err.response?.data?.message || err.message || 'Error loading applications');
    } finally {
      setLoading(false);
    }
  }, [searchParam, statusParam, pageParam]);

  // Refetch when query params change
  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // 1. Add application
  const handleAddApplication = async (newAppData) => {
    setIsCreating(true);
    setActionError(null);
    try {
      await createApplication({
        company: newAppData.company,
        role: newAppData.role,
        status: newAppData.status || newAppData.stage || 'Applied',
        appliedOn: newAppData.appliedOn,
        priority: newAppData.priority || 'Medium',
      });

      // Refetch application list and update stats
      await loadApplications();
      setStatsVersion((v) => v + 1);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add application';
      setActionError(msg);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  // 2. Advance application stage (Optimistic UI with rollback)
  const handleAdvance = async (id) => {
    const targetApp = applications.find((a) => (a._id || a.id) === id);
    if (!targetApp) return;

    const currentStatus = targetApp.status || targetApp.stage || 'Applied';
    const currentIdx = STAGES.indexOf(currentStatus);
    if (currentIdx === -1 || currentIdx >= STAGES.length - 1) return;

    const newStatus = STAGES[currentIdx + 1];

    // Snapshot current state for rollback
    const snapshot = [...applications];

    // 1. Immediately update local state
    setApplications((prev) =>
      prev.map((app) =>
        (app._id || app.id) === id
          ? { ...app, status: newStatus, stage: newStatus }
          : app
      )
    );

    // 2. Mark card as busy
    setBusyCardIds((prev) => new Set(prev).add(id));
    setActionError(null);

    try {
      // 3. Make API request
      await updateApplication(id, { status: newStatus });
      // 4. Refetch stats on success
      setStatsVersion((v) => v + 1);
    } catch (err) {
      // 5. Roll back on failure & show error alert
      setApplications(snapshot);
      const msg = err.response?.data?.message || 'Failed to update application status';
      setActionError(`Rollback: ${msg}`);
    } finally {
      setBusyCardIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // 3. Reject application (Optimistic UI with rollback)
  const handleReject = async (id) => {
    const targetApp = applications.find((a) => (a._id || a.id) === id);
    if (!targetApp) return;

    const newStatus = 'Rejected';
    const snapshot = [...applications];

    // Optimistic update
    setApplications((prev) =>
      prev.map((app) =>
        (app._id || app.id) === id
          ? { ...app, status: newStatus, stage: newStatus }
          : app
      )
    );

    setBusyCardIds((prev) => new Set(prev).add(id));
    setActionError(null);

    try {
      await updateApplication(id, { status: newStatus });
      setStatsVersion((v) => v + 1);
    } catch (err) {
      setApplications(snapshot);
      const msg = err.response?.data?.message || 'Failed to reject application';
      setActionError(`Rollback: ${msg}`);
    } finally {
      setBusyCardIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // 4. Delete application
  const handleDelete = async (id) => {
    const targetApp = applications.find((a) => (a._id || a.id) === id);
    const confirmed = window.confirm(
      `Delete "${targetApp?.role}" at "${targetApp?.company}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setBusyCardIds((prev) => new Set(prev).add(id));
    setActionError(null);

    try {
      await deleteApplication(id);
      // Remove from state
      setApplications((prev) => prev.filter((app) => (app._id || app.id) !== id));
      // Refresh stats
      setStatsVersion((v) => v + 1);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete application';
      setActionError(msg);
    } finally {
      setBusyCardIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Metrics for header
  const interviewsCount = applications.filter(
    (a) => (a.status || a.stage) === 'Interview'
  ).length;
  const offersCount = applications.filter(
    (a) => (a.status || a.stage) === 'Offer'
  ).length;

  return (
    <div className="dashboard-page" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px 40px' }}>
      {/* Live Aggregated Statistics Bar */}
      <StatsBar refreshKey={statsVersion} />

      {/* App Header */}
      <Header
        total={totalCount}
        interviews={interviewsCount}
        offers={offersCount}
      />

      {/* Action error banner (e.g. optimistic rollback alerts) */}
      {actionError && (
        <div
          role="alert"
          style={{
            maxWidth: '1200px',
            margin: '0 auto 16px',
            padding: '12px 18px',
            backgroundColor: '#7f1d1d',
            border: '1px solid #dc2626',
            color: '#fecaca',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {actionError}</span>
          <button
            onClick={() => setActionError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fecaca',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Add Application Form */}
      <ApplicationForm
        onAddApplication={handleAddApplication}
        applications={applications}
        isSubmitting={isCreating}
      />

      {/* Filter and Search Toolbar */}
      <div className="toolbar" role="search" aria-label="Filter applications">
        <input
          type="search"
          className="toolbar__search"
          placeholder="Search by role or company…"
          value={searchParam}
          onChange={(e) => updateQueryParams({ search: e.target.value })}
          aria-label="Search applications"
        />

        <div className="toolbar__filters" role="group" aria-label="Filter by status">
          {['All', 'Applied', 'Interview', 'Offer', 'Rejected'].map((s) => (
            <button
              key={s}
              className={`toolbar__filter-btn ${statusParam === s ? 'toolbar__filter-btn--active' : ''}`}
              onClick={() => updateQueryParams({ status: s })}
              aria-pressed={statusParam === s}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div
          className="board-loading"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '260px',
            color: '#94a3b8',
            fontSize: '1.05rem',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Loading applications from server…</span>
        </div>
      )}

      {/* Error state with retry */}
      {!loading && fetchError && (
        <div
          className="board-error"
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#1e1b24',
            border: '1px solid #7f1d1d',
            borderRadius: '12px',
            maxWidth: '600px',
            margin: '30px auto',
          }}
        >
          <p style={{ color: '#f87171', fontSize: '1.1rem', marginBottom: '16px' }}>
            ⚠️ {fetchError}
          </p>
          <button
            onClick={loadApplications}
            style={{
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && applications.length === 0 && (
        <div
          className="board-empty"
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            margin: '24px auto',
            maxWidth: '700px',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📂</div>
          <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>No applications found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            {searchParam || statusParam !== 'All'
              ? 'Try clearing your search or status filters to see more results.'
              : 'Add your first job application using the form above to get started!'}
          </p>
        </div>
      )}

      {/* Kanban Board */}
      {!loading && !fetchError && applications.length > 0 && (
        <Board
          applications={applications}
          onAdvance={handleAdvance}
          onReject={handleReject}
          onDelete={handleDelete}
          busyCardIds={busyCardIds}
        />
      )}

      {/* Pagination Controls */}
      {!loading && !fetchError && (
        <nav
          className="pagination-controls"
          aria-label="Application page navigation"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            marginTop: '32px',
            padding: '16px 0',
          }}
        >
          <button
            onClick={() => updateQueryParams({ page: pageParam - 1 })}
            disabled={pageParam <= 1}
            style={{
              backgroundColor: pageParam <= 1 ? '#1e293b' : '#334155',
              color: pageParam <= 1 ? '#64748b' : '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: pageParam <= 1 ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
          >
            ← Previous
          </button>

          <span style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
            Page <strong>{pageParam}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
          </span>

          <button
            onClick={() => updateQueryParams({ page: pageParam + 1 })}
            disabled={pageParam >= totalPages}
            style={{
              backgroundColor: pageParam >= totalPages ? '#1e293b' : '#334155',
              color: pageParam >= totalPages ? '#64748b' : '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: pageParam >= totalPages ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
};

export default DashboardPage;
