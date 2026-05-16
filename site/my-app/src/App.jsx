import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { MainPanels } from './components/MainPanels.jsx'
import './App.css'

const PANEL_KEYS = [
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

const PANEL_LABELS = {
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

const PANEL_DETAILS = {
  'server-target': { group: 'Setup', description: 'Choose the install folder, server name, and saved profile.' },
  'server-process': { group: 'Runtime', description: 'Save launch settings and control the dedicated server process.' },
  'live-console': { group: 'Runtime', description: 'Send commands and monitor live server output.' },
  'common-settings': { group: 'Configuration', description: 'Edit the common server `.ini` settings.' },
  'mods-workshop': { group: 'Configuration', description: 'Pair manager labels, mod IDs, and Steam Workshop IDs.' },
  'players-admin': { group: 'Administration', description: 'Review users, assign roles, and trigger player events.' },
  sandboxvars: { group: 'Files', description: 'Edit the raw SandboxVars Lua configuration.' },
  'advanced-files': { group: 'Files', description: 'Work directly with advanced raw server files.' },
  maintenance: { group: 'Maintenance', description: 'Run destructive maintenance actions with confirmation.' },
}

const PANEL_GROUPS = ['Setup', 'Runtime', 'Configuration', 'Administration', 'Files', 'Maintenance']

function toFormBody(entries) {
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
  const [steamcmdLogs, setSteamcmdLogs] = useState([])
  const [liveRunning, setLiveRunning] = useState(false)
  const [liveServerPid, setLiveServerPid] = useState(null)
  const [serverStats, setServerStats] = useState(null)
  const [updateState, setUpdateState] = useState({ running: false, progress: 0, message: 'Idle', steamcmdPath: '' })
  const [consoleCommand, setConsoleCommand] = useState('')
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedAccessLevel, setSelectedAccessLevel] = useState('user')
  const [selectedEvent, setSelectedEvent] = useState('lightning')
  const [eventCount, setEventCount] = useState('12')
  const [eventRadius, setEventRadius] = useState('4')
  const [profileSelection, setProfileSelection] = useState('')
  const [profileNameInput, setProfileNameInput] = useState('')
  const [targetForm, setTargetForm] = useState({ serverDir: '', serverName: '' })
  const [launchForm, setLaunchForm] = useState({ launchCommand: '', launchWorkdir: '' })
  const [serverConfigRaw, setServerConfigRaw] = useState('')
  const [modRows, setModRows] = useState([])
  const [sandboxRaw, setSandboxRaw] = useState('')
  const [advancedValues, setAdvancedValues] = useState({})
  const [selectedAdvancedFile, setSelectedAdvancedFile] = useState('')
  const [activeSection, setActiveSection] = useState(PANEL_KEYS[0])

  const applyPageData = (nextPage) => {
    startTransition(() => {
      setPage(nextPage)
      setLiveLogs(nextPage.logs || [])
      setSteamcmdLogs(nextPage.steamcmdLogs || [])
      setLiveRunning(Boolean(nextPage.running))
      setLiveServerPid(nextPage.serverPid ?? null)
      setServerStats(nextPage.serverStats || null)
      setUpdateState(nextPage.update || { running: false, progress: 0, message: 'Idle', steamcmdPath: '' })
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
    setProfileSelection(page.selectedProfile)
    setProfileNameInput(page.selectedProfile)
    setTargetForm({ serverDir: page.serverDir, serverName: page.serverName })
    setLaunchForm({ launchWorkdir: page.launchWorkdir })
    setServerConfigRaw(page.serverConfig?.rawText || '')
    setModRows(page.mods.rows.length ? page.mods.rows : [{ mod: '', displayName: '', workshopId: '', imageUrl: '', enabled: true }])
    setSandboxRaw(page.sandbox.rawText)
    setAdvancedValues(Object.fromEntries(page.advancedFiles.map((file) => [file.label, file.content])))
    setSelectedAdvancedFile((current) => (page.advancedFiles.some((file) => file.label === current) ? current : page.advancedFiles[0]?.label ?? ''))
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
    setSteamcmdLogs(payload.steamcmdLines || [])
    setLiveRunning(Boolean(payload.running))
    setLiveServerPid(payload.pid ?? null)
    setServerStats(payload.serverStats || null)
    setUpdateState(payload.update || { running: false, progress: 0, message: 'Idle', steamcmdPath: '' })
  })

  const pageLoaded = Boolean(page)
  const serverDir = page?.serverDir
  const serverName = page?.serverName

  useEffect(() => {
    if (!pageLoaded) return undefined
    pollLogs()
    const timer = window.setInterval(() => pollLogs().catch(() => {}), 1500)
    return () => window.clearInterval(timer)
  }, [pageLoaded, serverDir, serverName])

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

  const activePanel = PANEL_DETAILS[activeSection]

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="brand-kicker">Project Zomboid</p>
          <div>
            <h1>Server Admin Panel</h1>
            <div className="brand-status-row">
              <p>{page.serverName}</p>
              <span className={`pill ${liveRunning ? 'success' : 'warning'}`}>
                {liveRunning ? `Running${liveServerPid ? ` | PID ${liveServerPid}` : ''}` : 'Stopped'}
              </span>
            </div>
          </div>
        </div>
        <div className="topbar-meta" aria-label="Server overview">
          <div className="topbar-stat">
            <span>Version</span>
            <strong>{page.serverVersion?.display || 'Unavailable'}</strong>
          </div>
          <div className="topbar-stat">
            <span>Profile</span>
            <strong>{page.selectedProfile}</strong>
          </div>
          <div className="topbar-stat">
            <span>Users</span>
            <strong>{page.users.users.length}</strong>
          </div>
        </div>
      </header>

      {liveRunning ? (
        <section className="server-stats-strip" aria-label="Live server stats">
          <div className="server-stat-card primary">
            <span>Uptime</span>
            <strong>{serverStats?.uptime || 'Starting'}</strong>
          </div>
          <div className="server-stat-card">
            <span>Memory</span>
            <strong>{serverStats?.memory || 'Unavailable'}</strong>
          </div>
          <div className="server-stat-card">
            <span>Network In</span>
            <strong>{serverStats?.networkIn || 'Sampling'}</strong>
          </div>
          <div className="server-stat-card">
            <span>Network Out</span>
            <strong>{serverStats?.networkOut || 'Sampling'}</strong>
          </div>
          <div className="server-stat-card">
            <span>Process</span>
            <strong>{serverStats?.processName || 'Unknown'}</strong>
            <small>{liveServerPid ? `PID ${liveServerPid}` : 'PID unavailable'}</small>
          </div>
          <div className={`server-stat-card ${serverStats?.commandChannel ? 'healthy' : 'warning'}`}>
            <span>Console</span>
            <strong>{serverStats?.commandChannel ? 'Ready' : 'Detached'}</strong>
            <small>{serverStats?.accessUrl || page.accessUrl}</small>
          </div>
        </section>
      ) : null}

      <div className="app-frame">
        <aside className="sidebar">
          <div className="sidebar-block">
            <p className="sidebar-label">Current Server</p>
            <strong>{page.serverName}</strong>
            <span>{page.serverDir}</span>
          </div>

          <nav className="sidebar-nav" aria-label="Sections">
            <p className="sidebar-label">Sections</p>
            <div className="sidebar-nav-list">
              {PANEL_GROUPS.map((group) => (
                <div key={group} className="nav-group">
                  <span>{group}</span>
                  {PANEL_KEYS.filter((key) => PANEL_DETAILS[key].group === group).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`sidebar-nav-item ${activeSection === key ? 'active' : ''}`}
                      aria-current={activeSection === key ? 'page' : undefined}
                      onClick={() => setActiveSection(key)}
                    >
                      <strong>{PANEL_LABELS[key]}</strong>
                      <small>{PANEL_DETAILS[key].description}</small>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </nav>

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
          <div className="workspace-head">
            <div>
              <span>{activePanel.group}</span>
              <h2>{PANEL_LABELS[activeSection]}</h2>
              <p>{activePanel.description}</p>
            </div>
          </div>

          {(clientStatus || page.status)?.message ? (
            <div className={`status-banner ${statusTone((clientStatus || page.status).level)}`}>{(clientStatus || page.status).message}</div>
          ) : null}

          <MainPanels
            page={page}
            liveLogs={liveLogs}
            steamcmdLogs={steamcmdLogs}
            liveRunning={liveRunning}
            liveServerPid={liveServerPid}
            updateState={updateState}
            activeSection={activeSection}
            busyAction={busyAction}
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
            profileSelection={profileSelection}
            setProfileSelection={setProfileSelection}
            profileNameInput={profileNameInput}
            setProfileNameInput={setProfileNameInput}
            targetForm={targetForm}
            setTargetForm={setTargetForm}
            launchForm={launchForm}
            setLaunchForm={setLaunchForm}
            serverConfigRaw={serverConfigRaw}
            setServerConfigRaw={setServerConfigRaw}
            modRows={modRows}
            setModRows={setModRows}
            sandboxRaw={sandboxRaw}
            setSandboxRaw={setSandboxRaw}
            advancedValues={advancedValues}
            setAdvancedValues={setAdvancedValues}
            selectedAdvancedFile={selectedAdvancedFile}
            setSelectedAdvancedFile={setSelectedAdvancedFile}
          />
        </section>
      </div>
    </main>
  )
}

export default App
