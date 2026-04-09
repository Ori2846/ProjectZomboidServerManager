import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { MainPanels } from './components/MainPanels.jsx'
import './App.css'

export const PANEL_KEYS = [
  'server-target',
  'server-process',
  'live-console',
  'common-settings',
  'mods-workshop',
  'players-admin',
  'sandboxvars',
  'advanced-files',
  'maintenance',
]

export const PANEL_LABELS = {
  'server-target': 'Target',
  'server-process': 'Process',
  'live-console': 'Console',
  'common-settings': 'Server',
  'mods-workshop': 'Mods',
  'players-admin': 'Players',
  sandboxvars: 'Sandbox',
  'advanced-files': 'Advanced',
  maintenance: 'Danger',
}

export function toFormBody(entries) {
  const body = new URLSearchParams()
  entries.forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => body.append(key, item ?? ''))
      return
    }
    body.append(key, value ?? '')
  })
  return body
}

function loadPanelState() {
  try {
    return JSON.parse(localStorage.getItem('pz-manager-panel-state') || '{}')
  } catch {
    return {}
  }
}

function savePanelState(state) {
  localStorage.setItem('pz-manager-panel-state', JSON.stringify(state))
}

function statusTone(level) {
  if (level === 'success') return 'success'
  if (level === 'warning') return 'warning'
  return 'info'
}

function App() {
  const [page, setPage] = useState(null)
  const [clientStatus, setClientStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [liveLogs, setLiveLogs] = useState([])
  const [liveRunning, setLiveRunning] = useState(false)
  const [liveServerPid, setLiveServerPid] = useState(null)
  const [consoleCommand, setConsoleCommand] = useState('')
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedAccessLevel, setSelectedAccessLevel] = useState('user')
  const [selectedEvent, setSelectedEvent] = useState('lightning')
  const [eventCount, setEventCount] = useState('12')
  const [eventRadius, setEventRadius] = useState('4')
  const [targetForm, setTargetForm] = useState({ serverDir: '', serverName: '' })
  const [launchForm, setLaunchForm] = useState({ launchCommand: '', launchWorkdir: '' })
  const [commonValues, setCommonValues] = useState({})
  const [modRows, setModRows] = useState([])
  const [sandboxValues, setSandboxValues] = useState({})
  const [sandboxRaw, setSandboxRaw] = useState('')
  const [advancedValues, setAdvancedValues] = useState({})
  const [navTarget, setNavTarget] = useState('')
  const [panelState, setPanelState] = useState(() => {
    const saved = loadPanelState()
    return PANEL_KEYS.reduce((acc, key, index) => {
      acc[key] = saved[key] ?? index < 2
      return acc
    }, {})
  })

  const applyPageData = (nextPage) => {
    startTransition(() => {
      setPage(nextPage)
      setLiveLogs(nextPage.logs || [])
      setLiveRunning(Boolean(nextPage.running))
      setLiveServerPid(nextPage.serverPid ?? null)
      setClientStatus(null)
    })
  }

  useEffect(() => {
    fetch('/api/state', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load state (${response.status})`)
        return response.json()
      })
      .then(applyPageData)
      .catch((error) => setClientStatus({ level: 'warning', message: error.message }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!page) return
    setTargetForm({ serverDir: page.serverDir, serverName: page.serverName })
    setLaunchForm({ launchCommand: page.launchCommand, launchWorkdir: page.launchWorkdir })
    setCommonValues(Object.fromEntries(page.commonSettings.map((field) => [field.key, field.value])))
    setModRows(page.mods.rows.length ? page.mods.rows : [{ mod: '', displayName: '', workshopId: '' }])
    setSandboxValues(Object.fromEntries(page.sandbox.fields.filter((field) => field.valueType !== 'section').map((field) => [field.path, field.value])))
    setSandboxRaw(page.sandbox.rawText)
    setAdvancedValues(Object.fromEntries(page.advancedFiles.map((file) => [file.label, file.content])))
    const firstUser = page.users.users[0]?.username ?? ''
    setSelectedUser((current) => (page.users.users.some((user) => user.username === current) ? current : firstUser))
  }, [page])

  useEffect(() => {
    if (!page) return
    const currentUser = page.users.users.find((user) => user.username === selectedUser)
    setSelectedAccessLevel(currentUser?.accessLevel || page.users.roles[0]?.name || 'user')
  }, [page, selectedUser])

  const pollLogs = useEffectEvent(async () => {
    const response = await fetch('/logs', { cache: 'no-store' })
    if (!response.ok) return
    const payload = await response.json()
    setLiveLogs(payload.lines || [])
    setLiveRunning(Boolean(payload.running))
    setLiveServerPid(payload.pid ?? null)
  })

  useEffect(() => {
    if (!page) return undefined
    pollLogs()
    const timer = window.setInterval(() => pollLogs().catch(() => {}), 1500)
    return () => window.clearInterval(timer)
  }, [page?.serverDir, page?.serverName, pollLogs])

  const togglePanel = (key) => {
    setPanelState((current) => {
      const next = { ...current, [key]: !current[key] }
      savePanelState(next)
      return next
    })
  }

  const jumpToPanel = (key) => {
    if (!key) return
    setNavTarget(key)
    setPanelState((current) => {
      const next = current[key] ? current : { ...current, [key]: true }
      savePanelState(next)
      return next
    })
    window.setTimeout(() => {
      document.getElementById(`panel-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const submitForm = async (path, entries, actionLabel) => {
    setBusyAction(actionLabel)
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: toFormBody(entries),
      })
      if (!response.ok) throw new Error(`Request failed (${response.status})`)
      applyPageData(await response.json())
      return true
    } catch (error) {
      setClientStatus({ level: 'warning', message: error.message })
      return false
    } finally {
      setBusyAction('')
    }
  }

  if (loading) return <main className="shell loading-shell">Loading server manager...</main>
  if (!page) return <main className="shell loading-shell">Unable to load the server manager.</main>

  return (
    <main className="shell">
      <section className="version-strip">
        <span>Server Version</span>
        <strong>{page.serverVersion?.display || 'Unavailable'}</strong>
      </section>

      <header className="topbar">
        <div className="brand-block">
          <p className="brand-kicker">Project Zomboid</p>
          <div>
            <h1>Server Admin Panel</h1>
            <p>{page.serverName}</p>
          </div>
        </div>
        <div className="topbar-meta">
          <div className="topbar-stat">
            <span>Installed Build</span>
            <strong>{page.serverVersion?.display || 'Unavailable'}</strong>
          </div>
          <div className="topbar-stat">
            <span>Network</span>
            <strong>{page.accessUrl}</strong>
          </div>
          <div className={`topbar-status ${liveRunning ? 'success' : 'warning'}`}>
            <span>{liveRunning ? 'Running' : 'Stopped'}</span>
            <strong>{liveRunning && liveServerPid ? `PID ${liveServerPid}` : 'No process'}</strong>
          </div>
        </div>
      </header>

      <div className="app-frame">
        <aside className="sidebar">
          <div className="sidebar-block">
            <p className="sidebar-label">Workspace</p>
            <strong>{page.serverName}</strong>
            <span>{page.serverDir}</span>
          </div>

          <div className="sidebar-nav" aria-label="Sections">
            <label className="sidebar-select-wrap">
              <span className="sidebar-label">Jump To</span>
              <select value={navTarget} onChange={(event) => jumpToPanel(event.target.value)}>
                <option value="">Choose a section</option>
                {PANEL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {PANEL_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sidebar-block compact">
            <p className="sidebar-label">Overview</p>
            <div className="sidebar-metric">
              <span>Console Lines</span>
              <strong>{liveLogs.length}</strong>
            </div>
            <div className="sidebar-metric">
              <span>Users</span>
              <strong>{page.users.users.length}</strong>
            </div>
            <div className="sidebar-metric">
              <span>Mods Rows</span>
              <strong>{page.mods.rows.length}</strong>
            </div>
          </div>
        </aside>

        <section className="workspace">
          <section className="hero-banner">
            <div className="hero-copy">
              <p className="eyebrow">Operations Console</p>
              <h2>{page.serverName}</h2>
              <p className="subhead">
                Centralized controls for process management, configuration, user permissions, console commands, and world events.
              </p>
            </div>
            <div className="hero-grid">
              <div className="stat-card muted"><span>Installed Version</span><strong>{page.serverVersion?.display || 'Unavailable'}</strong></div>
              <div className="stat-card muted"><span>Server Path</span><strong>{page.serverDir}</strong></div>
              <div className="stat-card accent"><span>Network Address</span><strong>{page.accessUrl}</strong></div>
              <div className={`stat-card ${liveRunning ? 'success' : 'warning'}`}><span>Process</span><strong>{liveRunning ? `Online${liveServerPid ? ` | PID ${liveServerPid}` : ''}` : 'Offline'}</strong></div>
            </div>
          </section>

          {(clientStatus || page.status)?.message ? (
            <div className={`status-banner ${statusTone((clientStatus || page.status).level)}`}>{(clientStatus || page.status).message}</div>
          ) : null}

          <MainPanels
            page={page}
            liveLogs={liveLogs}
            liveRunning={liveRunning}
            liveServerPid={liveServerPid}
            busyAction={busyAction}
            panelState={panelState}
            togglePanel={togglePanel}
            submitForm={submitForm}
            consoleCommand={consoleCommand}
            setConsoleCommand={setConsoleCommand}
            resetConfirmation={resetConfirmation}
            setResetConfirmation={setResetConfirmation}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            selectedAccessLevel={selectedAccessLevel}
            setSelectedAccessLevel={setSelectedAccessLevel}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            eventCount={eventCount}
            setEventCount={setEventCount}
            eventRadius={eventRadius}
            setEventRadius={setEventRadius}
            targetForm={targetForm}
            setTargetForm={setTargetForm}
            launchForm={launchForm}
            setLaunchForm={setLaunchForm}
            commonValues={commonValues}
            setCommonValues={setCommonValues}
            modRows={modRows}
            setModRows={setModRows}
            sandboxValues={sandboxValues}
            setSandboxValues={setSandboxValues}
            sandboxRaw={sandboxRaw}
            setSandboxRaw={setSandboxRaw}
            advancedValues={advancedValues}
            setAdvancedValues={setAdvancedValues}
          />
        </section>
      </div>
    </main>
  )
}

export default App
