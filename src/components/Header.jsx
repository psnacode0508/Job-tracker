function Header({ total = 0, interviews = 0, offers = 0 }) {
  return (
    <header className="app-header">
      <div className="app-header__branding">
        <h1 className="app-header__title">JobTrackr</h1>
        <p className="app-header__subtitle">Track every application, interview, and offer — all in one place.</p>
      </div>

      <div className="app-header__pill" aria-label="Application summary">
        <span>{total} applications</span>
        <span className="app-header__dot" aria-hidden="true">·</span>
        <span>{interviews} interviews</span>
        <span className="app-header__dot" aria-hidden="true">·</span>
        <span>{offers} offers</span>
      </div>
    </header>
  )
}

export default Header
