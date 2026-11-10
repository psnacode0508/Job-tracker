import Column from './Column'

/** The four canonical kanban stages, in display order. */
const STAGES = ['Applied', 'Interview', 'Offer', 'Rejected']

/**
 * Board
 *
 * @param {{
 *   applications: Array<{
 *     id: string,
 *     role: string,
 *     company: string,
 *     appliedOn: string,
 *     priority: 'High' | 'Medium' | 'Low',
 *     stage: 'Applied' | 'Interview' | 'Offer' | 'Rejected',
 *   }>,
 *   onAdvance: (id: string) => void,
 *   onReject:  (id: string) => void,
 *   onDelete:  (id: string) => void,
 * }} props
 */
function Board({ applications = [], onAdvance, onReject, onDelete }) {
  return (
    <div className="board" role="region" aria-label="Job application board">
      {STAGES.map((stage) => (
        <Column
          key={stage}
          title={stage}
          status={stage}
          applications={applications.filter((app) => app.stage === stage)}
          onAdvance={onAdvance}
          onReject={onReject}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

export default Board
