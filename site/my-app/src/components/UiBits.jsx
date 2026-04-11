export function Panel({ title, subtitle, badge, panelKey, children }) {
  return (
    <section id={`panel-${panelKey}`} className="panel">
      <div className="panel-toggle">
        <div className="panel-copy">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {badge ? <div className="panel-meta">{badge}</div> : null}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  )
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function SettingCard({ id, label, help, indent = 0, compact = false, children }) {
  return (
    <label
      id={id}
      className={`setting-card ${compact ? 'compact' : ''}`}
      style={{ marginLeft: indent ? `${indent * 20}px` : undefined }}
    >
      <span className="setting-label">{label}</span>
      {help ? <p className="field-help">{help}</p> : null}
      {children}
    </label>
  )
}

export function InfoBlock({ title, body }) {
  return (
    <div className="info-block">
      <strong>{title}</strong>
      <p>{body || 'No inline description available for this field.'}</p>
    </div>
  )
}

export function InfoLine({ label, value }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
