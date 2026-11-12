// Stage progression order
const STAGES = ['Applied', 'Interview', 'Offer']

// Map each priority label to a CSS modifier class
const PRIORITY_CLASS = {
  High:   'card__priority--high',
  Medium: 'card__priority--medium',
  Low:    'card__priority--low',
}

/**
 * ApplicationCard
 *
 * @param {{
 *   application: {
 *     id: string,
 *     role: string,
 *     company: string,
 *     appliedOn: string,   // ISO date string e.g. "2024-11-01"
 *     priority: 'High' | 'Medium' | 'Low',
 *     stage: 'Applied' | 'Interview' | 'Offer' | 'Rejected',
 *   },
 *   onAdvance: (id: string) => void,
 *   onReject:  (id: string) => void,
 *   onDelete:  (id: string) => void,
 * }} props
 */
function ApplicationCard({ application, onAdvance, onReject, onDelete, isBusy = false }) {
  const id = application._id || application.id
  const role = application.role
  const company = application.company
  const appliedOn = application.appliedOn
  const priority = application.priority || 'Medium'
  const stage = application.status || application.stage || 'Applied'

  // Determine the next stage label for the Advance button
  const currentIndex = STAGES.indexOf(stage)
  const nextStage    = currentIndex !== -1 && currentIndex < STAGES.length - 1
    ? STAGES[currentIndex + 1]
    : null

  // Format the date nicely: "Nov 1, 2024"
  const formattedDate = appliedOn
    ? new Date(appliedOn).toLocaleDateString('en-US', {
        month: 'short',
        day:   'numeric',
        year:  'numeric',
      })
    : 'Recently'

  const isRejected = stage === 'Rejected'

  return (
    <article
      className={`card ${isRejected ? 'card--rejected' : ''}`}
      aria-label={`${role} at ${company}`}
      style={isBusy ? { opacity: 0.65, transition: 'opacity 0.2s' } : {}}
    >

      {/* ── Top row: priority tag + date ── */}
      <div className="card__meta">
        <span className={`card__priority ${PRIORITY_CLASS[priority] ?? ''}`}>
          {priority}
        </span>
        <time className="card__date" dateTime={appliedOn}>
          {formattedDate}
        </time>
      </div>

      {/* ── Main info ── */}
      <div className="card__body">
        <h3 className="card__role">{role}</h3>
        <p  className="card__company">{company}</p>
      </div>

      {/* ── Stage badge ── */}
      <div className="card__stage-row">
        <span className={`card__stage card__stage--${stage.toLowerCase()}`}>
          {stage}
        </span>
      </div>

      {/* ── Action buttons ── */}
      <div className="card__actions">
        {nextStage && !isRejected && (
          <button
            className="card__btn card__btn--advance"
            onClick={() => onAdvance(id)}
            disabled={isBusy}
            style={isBusy ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            {isBusy ? 'Updating…' : `Advance to ${nextStage}`}
          </button>
        )}

        {!isRejected && (
          <button
            className="card__btn card__btn--reject"
            onClick={() => onReject(id)}
            disabled={isBusy}
            style={isBusy ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            Reject
          </button>
        )}

        <button
          className="card__btn card__btn--delete"
          onClick={() => onDelete(id)}
          disabled={isBusy}
          style={isBusy ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          aria-label={`Delete application for ${role} at ${company}`}
        >
          {isBusy ? 'Deleting…' : 'Delete'}
        </button>
      </div>

    </article>
  )
}

export default ApplicationCard
