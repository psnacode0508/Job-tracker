import { useState } from 'react'
import './App.css'

import Header          from './components/Header'
import ApplicationForm from './components/ApplicationForm'
import Board           from './components/Board'



const SAMPLE_APPLICATIONS = [
  {
    id:        'sample-1',
    role:      'Frontend Engineer',
    company:   'Acme Corp',
    appliedOn: '2026-10-28',
    priority:  'High',
    stage:     'Applied',
  },
  {
    id:        'sample-2',
    role:      'Product Designer',
    company:   'Bright Labs',
    appliedOn: '2026-10-15',
    priority:  'Medium',
    stage:     'Interview',
  },
  {
    id:        'sample-3',
    role:      'Full Stack Developer',
    company:   'Nova Systems',
    appliedOn: '2026-09-30',
    priority:  'Low',
    stage:     'Offer',
  },
]

function App() {
  // ── Core state ────────────────────────────────────────
  const [applications, setApplications] = useState(SAMPLE_APPLICATIONS)

  // ── Controlled filter state ───────────────────────────
  const [search,   setSearch]   = useState('')
  const [priority, setPriority] = useState('All')   // 'All' | 'High' | 'Medium' | 'Low'

  // ── Derived metrics (computed in render, not stored in state) ─────────────
  const total          = applications.length
  const interviewCount = applications.filter((a) => a.stage === 'Interview').length
  const offerCount     = applications.filter((a) => a.stage === 'Offer').length

  // ── Derived filtered list (computed in render) ────────
  const filteredApplications = applications.filter((app) => {
    const q           = search.trim().toLowerCase()
    const matchSearch = !q ||
      app.role.toLowerCase().includes(q) ||
      app.company.toLowerCase().includes(q)
    const matchPriority = priority === 'All' || app.priority === priority
    return matchSearch && matchPriority
  })

  // ── Immutable handlers ────────────────────────────────

  /** Add a new application — spread into a new array so React detects the change. */
  function handleAddApplication(newApp) {
    setApplications((prev) => [...prev, newApp])
  }

  /**
   * Advance an application's stage along the pipeline:
   * Applied → Interview → Offer.
   * Uses .map() to return a brand-new array; only the matching entry changes.
   */
  function handleAdvance(id) {
    const STAGES = ['Applied', 'Interview', 'Offer']
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== id) return app                        // unchanged
        const idx = STAGES.indexOf(app.stage)
        if (idx === -1 || idx === STAGES.length - 1) return app  // already at end
        return { ...app, stage: STAGES[idx + 1] }           // new object, new stage
      })
    )
  }

  /**
   * Mark an application as Rejected.
   * .map() ensures a new array + new object for the changed entry.
   */
  function handleReject(id) {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, stage: 'Rejected' } : app
      )
    )
  }

  /**
   * Permanently delete an application after user confirmation.
   * .filter() returns a new array without the deleted entry.
   */
  function handleDelete(id) {
    const app = applications.find((a) => a.id === id)
    const confirmed = window.confirm(
      `Delete "${app?.role}" at "${app?.company}"? This cannot be undone.`
    )
    if (!confirmed) return
    setApplications((prev) => prev.filter((a) => a.id !== id))
  }

  // ── Render ────────────────────────────────────────────
  return (
    <>
      {/* ── App header with live metrics ── */}
      <Header
        total={total}
        interviews={interviewCount}
        offers={offerCount}
      />

      {/* ── Add application form ── */}
      <ApplicationForm
        onAddApplication={handleAddApplication}
        applications={applications}
      />

      {/* ── Search + priority filter toolbar ── */}
      <div className="toolbar" role="search" aria-label="Filter applications">
        <input
          type="search"
          className="toolbar__search"
          placeholder="Search by role or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search applications"
        />

        <div className="toolbar__filters" role="group" aria-label="Filter by priority">
          {['All', 'High', 'Medium', 'Low'].map((p) => (
            <button
              key={p}
              className={`toolbar__filter-btn ${priority === p ? 'toolbar__filter-btn--active' : ''}`}
              onClick={() => setPriority(p)}
              aria-pressed={priority === p}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Kanban board ── */}
      <Board
        applications={filteredApplications}
        onAdvance={handleAdvance}
        onReject={handleReject}
        onDelete={handleDelete}
      />
    </>
  )
}

export default App
