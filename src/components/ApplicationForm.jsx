import { useState } from 'react'

/** Returns today's date as a YYYY-MM-DD string in local time. */
function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const INITIAL_STATE = {
  company:   '',
  role:      '',
  stage:     'Applied',
  appliedOn: todayISO(),
  priority:  'Medium',
}

/**
 * ApplicationForm
 *
 * @param {{
 *   onAddApplication: (app: object) => void,
 *   applications:     Array<{ company: string, role: string }>,
 * }} props
 */
function ApplicationForm({ onAddApplication, applications = [], isSubmitting = false }) {
  const [form,   setForm]   = useState(INITIAL_STATE)
  const [errors, setErrors] = useState({})

  // ── Field change handler ──────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear the error for this field as the user edits
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // ── Validation ───────────────────────────────────────
  function validate() {
    const next = {}

    const company   = form.company.trim()
    const role      = form.role.trim()
    const appliedOn = form.appliedOn

    if (company.length < 2 || company.length > 60) {
      next.company = 'Company must be between 2 and 60 characters.'
    }

    if (role.length < 2 || role.length > 60) {
      next.role = 'Role must be between 2 and 60 characters.'
    }

    if (appliedOn > todayISO()) {
      next.appliedOn = 'Applied date cannot be in the future.'
    }

    // Duplicate check — same company + role, case-insensitive
    const isDuplicate = applications.some(
      (app) =>
        app.company?.trim().toLowerCase() === company.toLowerCase() &&
        app.role?.trim().toLowerCase()    === role.toLowerCase()
    )
    if (isDuplicate && !next.company && !next.role) {
      next.role = `You already have an application for "${role}" at "${company}".`
    }

    return next
  }

  // ── Submit ───────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      await onAddApplication({
        company:   form.company.trim(),
        role:      form.role.trim(),
        status:    form.stage || 'Applied',
        appliedOn: form.appliedOn,
        priority:  form.priority,
      })

      // Reset form, refreshing today's date in case day changed
      setForm({ ...INITIAL_STATE, appliedOn: todayISO() })
      setErrors({})
    } catch (err) {
      // Handled by parent
    }
  }

  // ── Render ───────────────────────────────────────────
  return (
    <form className="app-form" onSubmit={handleSubmit} noValidate aria-label="Add a new application">

      <h2 className="app-form__heading">Add Application</h2>

      <div className="app-form__grid">

        {/* Company */}
        <div className="app-form__field">
          <label className="app-form__label" htmlFor="company">Company</label>
          <input
            id="company"
            name="company"
            type="text"
            className={`app-form__input ${errors.company ? 'app-form__input--error' : ''}`}
            value={form.company}
            onChange={handleChange}
            placeholder="e.g. Acme Corp"
            maxLength={60}
            disabled={isSubmitting}
            aria-describedby={errors.company ? 'company-error' : undefined}
          />
          {errors.company && (
            <span id="company-error" className="app-form__error" role="alert">
              {errors.company}
            </span>
          )}
        </div>

        {/* Role */}
        <div className="app-form__field">
          <label className="app-form__label" htmlFor="role">Role</label>
          <input
            id="role"
            name="role"
            type="text"
            className={`app-form__input ${errors.role ? 'app-form__input--error' : ''}`}
            value={form.role}
            onChange={handleChange}
            placeholder="e.g. Frontend Engineer"
            maxLength={60}
            disabled={isSubmitting}
            aria-describedby={errors.role ? 'role-error' : undefined}
          />
          {errors.role && (
            <span id="role-error" className="app-form__error" role="alert">
              {errors.role}
            </span>
          )}
        </div>

        {/* Applied On */}
        <div className="app-form__field">
          <label className="app-form__label" htmlFor="appliedOn">Applied On</label>
          <input
            id="appliedOn"
            name="appliedOn"
            type="date"
            className={`app-form__input ${errors.appliedOn ? 'app-form__input--error' : ''}`}
            value={form.appliedOn}
            onChange={handleChange}
            max={todayISO()}
            disabled={isSubmitting}
            aria-describedby={errors.appliedOn ? 'appliedOn-error' : undefined}
          />
          {errors.appliedOn && (
            <span id="appliedOn-error" className="app-form__error" role="alert">
              {errors.appliedOn}
            </span>
          )}
        </div>

        {/* Priority */}
        <div className="app-form__field">
          <label className="app-form__label" htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            className="app-form__input app-form__select"
            value={form.priority}
            onChange={handleChange}
            disabled={isSubmitting}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

      </div>

      <button
        type="submit"
        className="app-form__submit"
        disabled={isSubmitting}
        style={isSubmitting ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
      >
        {isSubmitting ? 'Adding…' : '+ Add Application'}
      </button>

    </form>
  )
}

export default ApplicationForm
