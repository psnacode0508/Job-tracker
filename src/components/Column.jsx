import ApplicationCard from './ApplicationCard'

/**
 * Column
 *
 * @param {{
 *   title:        string,
 *   status:       'Applied' | 'Interview' | 'Offer' | 'Rejected',
 *   applications: Array<import('./ApplicationCard').Application>,
 *   onAdvance:    (id: string) => void,
 *   onReject:     (id: string) => void,
 *   onDelete:     (id: string) => void,
 * }} props
 */
function Column({ title, status, applications = [], onAdvance, onReject, onDelete }) {
  const count = applications.length

  return (
    <section className={`column column--${status.toLowerCase()}`} aria-label={`${title} column`}>

      {/* ── Column header ── */}
      <div className="column__header">
        <h2 className="column__title">{title}</h2>
        <span className="column__badge" aria-label={`${count} application${count !== 1 ? 's' : ''}`}>
          {count}
        </span>
      </div>

      {/* ── Cards list ── */}
      <div className="column__cards">
        {count === 0 ? (
          <p className="column__empty">Nothing here yet</p>
        ) : (
          applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onAdvance={onAdvance}
              onReject={onReject}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

    </section>
  )
}

export default Column
