import { useEffect, useRef, useState } from 'react'
import { Field, InfoBlock, InfoLine, Panel } from './UiBits.jsx'

export function MainPanels(props) {
  const {
    page,
    liveLogs,
    steamcmdLogs,
    liveRunning,
    liveServerPid,
    updateState,
    activeSection,
    busyAction,
    submitForm,
    consoleCommand,
    setConsoleCommand,
    resetConfirmation,
    setResetConfirmation,
    selectedUser,
    setSelectedUser,
    selectedAccessLevel,
    setSelectedAccessLevel,
    selectedEvent,
    setSelectedEvent,
    eventCount,
    setEventCount,
    eventRadius,
    setEventRadius,
    profileSelection,
    setProfileSelection,
    profileNameInput,
    setProfileNameInput,
    targetForm,
    setTargetForm,
    launchForm,
    setLaunchForm,
    serverConfigRaw,
    setServerConfigRaw,
    modRows,
    setModRows,
    sandboxRaw,
    setSandboxRaw,
    advancedValues,
    setAdvancedValues,
    selectedAdvancedFile,
    setSelectedAdvancedFile,
  } = props

  const currentUser = page.users.users.find((user) => user.username === selectedUser) || null
  const currentEvent = page.playerEvents.find((event) => event.id === selectedEvent) || page.playerEvents[0]

  switch (activeSection) {
    case 'server-target':
      return <ServerTargetPanel page={page} busyAction={busyAction} submitForm={submitForm} profileSelection={profileSelection} setProfileSelection={setProfileSelection} profileNameInput={profileNameInput} setProfileNameInput={setProfileNameInput} targetForm={targetForm} setTargetForm={setTargetForm} />
    case 'server-process':
      return <ServerProcessPanel page={page} steamcmdLogs={steamcmdLogs} liveRunning={liveRunning} liveServerPid={liveServerPid} updateState={updateState} busyAction={busyAction} submitForm={submitForm} launchForm={launchForm} setLaunchForm={setLaunchForm} />
    case 'live-console':
      return <LiveConsolePanel liveLogs={liveLogs} busyAction={busyAction} submitForm={submitForm} consoleCommand={consoleCommand} setConsoleCommand={setConsoleCommand} />
    case 'common-settings':
      return <CommonSettingsPanel page={page} busyAction={busyAction} submitForm={submitForm} serverConfigRaw={serverConfigRaw} setServerConfigRaw={setServerConfigRaw} />
    case 'mods-workshop':
      return <ModsWorkshopPanel page={page} busyAction={busyAction} submitForm={submitForm} modRows={modRows} setModRows={setModRows} />
    case 'players-admin':
      return <PlayerPanels page={page} liveRunning={liveRunning} busyAction={busyAction} submitForm={submitForm} selectedUser={selectedUser} setSelectedUser={setSelectedUser} selectedAccessLevel={selectedAccessLevel} setSelectedAccessLevel={setSelectedAccessLevel} selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} eventCount={eventCount} setEventCount={setEventCount} eventRadius={eventRadius} setEventRadius={setEventRadius} currentUser={currentUser} currentEvent={currentEvent} />
    case 'sandboxvars':
      return <SandboxPanel page={page} busyAction={busyAction} submitForm={submitForm} sandboxRaw={sandboxRaw} setSandboxRaw={setSandboxRaw} />
    case 'advanced-files':
      return <AdvancedFilesPanel page={page} busyAction={busyAction} submitForm={submitForm} advancedValues={advancedValues} setAdvancedValues={setAdvancedValues} selectedAdvancedFile={selectedAdvancedFile} setSelectedAdvancedFile={setSelectedAdvancedFile} />
    case 'maintenance':
      return <MaintenancePanel page={page} busyAction={busyAction} submitForm={submitForm} resetConfirmation={resetConfirmation} setResetConfirmation={setResetConfirmation} />
    default:
      return null
  }
}

function ServerTargetPanel({ page, busyAction, submitForm, profileSelection, setProfileSelection, profileNameInput, setProfileNameInput, targetForm, setTargetForm }) {
  return (
    <Panel title="Server Target" subtitle={`${page.serverDir} | ${page.serverName}`} panelKey="server-target">
      <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/select-server', [['server_dir', targetForm.serverDir], ['server_name', targetForm.serverName]], 'load-server') }}>
        <Field label="Saved Profile">
          <select value={profileSelection} onChange={(event) => setProfileSelection(event.target.value)}>
            {page.profiles.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
          </select>
        </Field>
        <div className="button-row">
          <button type="button" className="secondary" disabled={busyAction === 'load-profile'} onClick={() => submitForm('/api/select-profile', [['profile_name', profileSelection]], 'load-profile')}>Load Profile</button>
          <button type="button" className="secondary" disabled={busyAction === 'delete-profile' || page.profiles.length <= 1} onClick={() => submitForm('/api/delete-profile', [['profile_name', profileSelection]], 'delete-profile')}>Delete Profile</button>
        </div>
        <Field label="Save Current As Profile">
          <input value={profileNameInput} onChange={(event) => setProfileNameInput(event.target.value)} placeholder="default" />
        </Field>
        <div className="button-row top-actions">
          <button type="button" className="secondary" disabled={busyAction === 'save-profile'} onClick={() => submitForm('/api/save-profile', [['profile_name', profileNameInput]], 'save-profile')}>Save Profile</button>
          <button type="submit" disabled={busyAction === 'load-server'}>Load Server</button>
        </div>
        <Field label="Server Folder"><input value={targetForm.serverDir} onChange={(event) => setTargetForm((current) => ({ ...current, serverDir: event.target.value }))} /></Field>
        <Field label="Server Name"><input value={targetForm.serverName} onChange={(event) => setTargetForm((current) => ({ ...current, serverName: event.target.value }))} /></Field>
      </form>
    </Panel>
  )
}

function ServerProcessPanel({ page, steamcmdLogs, liveRunning, liveServerPid, updateState, busyAction, submitForm, launchForm, setLaunchForm }) {
  const nextAutoCheckState = !updateState.autoCheckEnabled

  return (
    <Panel title="Server Process" subtitle="Launch and control the dedicated server from the manager." badge={<span className={`pill ${liveRunning ? 'success' : 'warning'}`}>{liveRunning ? 'Running' : 'Stopped'}{liveRunning && liveServerPid ? ` | PID ${liveServerPid}` : ''}</span>} panelKey="server-process">
      <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-launch', [['launch_workdir', launchForm.launchWorkdir]], 'save-launch') }}>
        <div className="button-row top-actions">
          <button type="submit" disabled={busyAction === 'save-launch'}>Save Working Directory</button>
          <button type="button" className="secondary" disabled={busyAction === 'update-server' || liveRunning || updateState.running} onClick={() => submitForm('/api/update-server', [], 'update-server')}>Update Server</button>
          <button type="button" className="secondary" disabled={busyAction === 'toggle-auto-update-check'} onClick={() => submitForm('/api/toggle-auto-update-check', [['enabled', String(nextAutoCheckState)]], 'toggle-auto-update-check')}>{updateState.autoCheckEnabled ? 'Disable Update Check' : 'Enable Update Check'}</button>
          <button type="button" className="secondary" disabled={busyAction === 'start-server'} onClick={() => submitForm('/api/start-server', [], 'start-server')}>Start Server</button>
          <button type="button" className="secondary" disabled={busyAction === 'stop-server'} onClick={() => submitForm('/api/stop-server', [], 'stop-server')}>Stop Server</button>
        </div>
        {updateState.autoCheckEnabled ? (
          <div className={`update-notice ${updateState.updateAvailable ? 'warning' : 'info'}`}>
            <strong>{updateState.updateAvailable ? 'Update available' : 'Update check enabled'}</strong>
            <span>{updateState.checkMessage}</span>
          </div>
        ) : null}
        <div className="update-progress-card">
          <div className="progress-copy">
            <strong>{updateState.message || 'SteamCMD idle'}</strong>
            <span>SteamCMD: {updateState.steamcmdPath || page.serverVersion?.steamcmdPath || 'Will be installed inside this project when needed.'}</span>
          </div>
          <div className="progress-track" aria-label="SteamCMD update progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={updateState.progress || 0} role="progressbar">
            <span style={{ width: `${Math.max(0, Math.min(100, updateState.progress || 0))}%` }} />
          </div>
        </div>
        <p className="field-help">Launch command is inferred as {page.inferredLaunchCommand || 'StartServer64.bat inside the launch working directory'}.</p>
        <Field label="Launch Working Directory"><input value={launchForm.launchWorkdir} onChange={(event) => setLaunchForm((current) => ({ ...current, launchWorkdir: event.target.value }))} /></Field>
        <div className="process-console-block">
          <div className="advanced-editor-head">
            <strong>SteamCMD Console</strong>
            <span>Only SteamCMD install, update, and update-check output appears here.</span>
          </div>
          <pre className="log-console compact-console">{steamcmdLogs.join('\n')}</pre>
        </div>
      </form>
    </Panel>
  )
}

function LiveConsolePanel({ liveLogs, busyAction, submitForm, consoleCommand, setConsoleCommand }) {
  const consoleRef = useRef(null)

  useEffect(() => {
    const element = consoleRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [liveLogs])

  return (
    <Panel title="Live Console" subtitle="Send commands, clear the visible buffer, and watch output update in place." panelKey="live-console">
      <form className="console-form" onSubmit={async (event) => { event.preventDefault(); const ok = await submitForm('/api/send-command', [['console_command', consoleCommand]], 'send-command'); if (ok) setConsoleCommand('') }}>
        <div className="button-row top-actions">
          <button type="submit" disabled={busyAction === 'send-command'}>Send Command</button>
          <button type="button" className="secondary" disabled={busyAction === 'clear-console'} onClick={() => submitForm('/api/clear-console', [], 'clear-console')}>Clear Console</button>
        </div>
        <Field label="Console Command"><input value={consoleCommand} onChange={(event) => setConsoleCommand(event.target.value)} placeholder="save, quit, help, players" /></Field>
      </form>
      <pre ref={consoleRef} className="log-console">{liveLogs.join('\n')}</pre>
    </Panel>
  )
}

function CommonSettingsPanel({ page, busyAction, submitForm, serverConfigRaw, setServerConfigRaw }) {
  const [autosaveMessage, setAutosaveMessage] = useState('Autosave on')
  const autosaveReadyRef = useRef(false)
  const lastAutosavePayloadRef = useRef('')
  const serverDir = page.serverDir
  const serverName = page.serverName

  useEffect(() => {
    autosaveReadyRef.current = false
    lastAutosavePayloadRef.current = ''
    setAutosaveMessage('Autosave on')
  }, [serverDir, serverName])

  useEffect(() => {
    const entries = buildCommonSaveEntries(serverDir, serverName, serverConfigRaw)
    const payload = JSON.stringify(entries)
    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true
      lastAutosavePayloadRef.current = payload
      return undefined
    }
    if (payload === lastAutosavePayloadRef.current) return undefined

    setAutosaveMessage('Autosaving...')
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/save-common', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: toFormBody(entries),
        })
        if (!response.ok) throw new Error(`Autosave failed (${response.status})`)
        lastAutosavePayloadRef.current = payload
        setAutosaveMessage('Autosaved')
      } catch (error) {
        setAutosaveMessage(error.message)
      }
    }, 900)

    return () => window.clearTimeout(timer)
  }, [serverConfigRaw, serverDir, serverName])

  return (
    <Panel title="Common Settings" subtitle={page.paths.ini} panelKey="common-settings">
      <form className="sandbox-stack" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-common', buildCommonSaveEntries(serverDir, serverName, serverConfigRaw), 'save-common') }}>
        <div className="button-row top-actions">
          <button type="submit" disabled={busyAction === 'save-common'}>Save</button>
          <span className="autosave-state">{autosaveMessage}</span>
        </div>
        <RawTextEditor title="Server Config" path={page.paths.ini} value={serverConfigRaw} onChange={setServerConfigRaw} />
      </form>
    </Panel>
  )
}

function ModsWorkshopPanel({ page, busyAction, submitForm, modRows, setModRows }) {
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const [fetchingIndex, setFetchingIndex] = useState(null)
  const [fetchMessage, setFetchMessage] = useState('')
  const [autosaveMessage, setAutosaveMessage] = useState('Autosave on')
  const importInputRef = useRef(null)
  const autosaveReadyRef = useRef(false)
  const lastAutosavePayloadRef = useRef('')
  const modsAvailable = page.mods.available
  const serverDir = page.serverDir
  const serverName = page.serverName

  const finishDrag = () => {
    setDraggedIndex(null)
    setDropIndex(null)
  }

  useEffect(() => {
    if (!modsAvailable) return undefined
    const entries = buildModSaveEntries(serverDir, serverName, modRows)
    const payload = JSON.stringify(entries)
    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true
      lastAutosavePayloadRef.current = payload
      return undefined
    }
    if (payload === lastAutosavePayloadRef.current) return undefined

    setAutosaveMessage('Autosaving...')
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/save-mods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: toFormBody(entries),
        })
        if (!response.ok) throw new Error(`Autosave failed (${response.status})`)
        lastAutosavePayloadRef.current = payload
        setAutosaveMessage('Autosaved')
      } catch (error) {
        setAutosaveMessage(error.message)
      }
    }, 900)

    return () => window.clearTimeout(timer)
  }, [modRows, modsAvailable, serverDir, serverName])

  const fetchWorkshopDetails = async (index) => {
    const workshopId = modRows[index]?.workshopId?.trim()
    if (!workshopId) {
      setFetchMessage('Enter a Workshop ID before fetching mod details.')
      return
    }
    setFetchingIndex(index)
    setFetchMessage('')
    try {
      const response = await fetch('/api/fetch-workshop-mod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams([['workshop_id', workshopId]]),
      })
      if (!response.ok) throw new Error(`Request failed (${response.status})`)
      const payload = await response.json()
      if (!payload.ok) throw new Error(payload.message || 'Could not fetch Workshop details.')
      setModRows((current) => current.map((row, rowIndex) => (
        rowIndex === index
          ? { ...row, displayName: payload.title || row.displayName, mod: (payload.modIds || []).join('\n'), workshopId: payload.workshopId || row.workshopId, imageUrl: payload.imageUrl || row.imageUrl }
          : row
      )))
      setFetchMessage(`Fetched ${payload.modIds.length} Mod ID value(s) for ${payload.title}.`)
    } catch (error) {
      setFetchMessage(error.message)
    } finally {
      setFetchingIndex(null)
    }
  }

  const exportMods = () => {
    const normalizedRows = normalizeImportedModRows(modRows)
    const enabledRows = normalizedRows.filter((row) => row.enabled !== false)
    const payload = {
      type: 'project-zomboid-server-manager-mods',
      version: 1,
      serverName,
      exportedAt: new Date().toISOString(),
      mods: enabledRows.flatMap((row) => splitModIds(row.mod).map((modId) => `\\${modId}`)).join(';'),
      workshopItems: enabledRows.map((row) => row.workshopId.trim()).filter(Boolean).join(';'),
      rows: normalizedRows,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${serverName || 'server'}-mods-workshop.json`
    link.click()
    URL.revokeObjectURL(url)
    setFetchMessage(`Exported ${normalizedRows.length} mod row(s).`)
  }

  const importMods = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      const rows = normalizeImportedModRows(payload.rows || payload.mods || payload)
      if (!rows.length) throw new Error('Import file did not contain any mod rows.')
      setModRows(rows)
      setFetchMessage(`Imported ${rows.length} mod row(s). Review, then autosave or click Save.`)
    } catch (error) {
      setFetchMessage(error.message || 'Import failed.')
    }
  }

  return (
    <Panel title="Mods And Workshop Items" subtitle="Keep folder names, manager labels, and workshop IDs aligned." panelKey="mods-workshop">
      {page.mods.available ? (
        <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-mods', buildModSaveEntries(serverDir, serverName, modRows), 'save-mods') }}>
          <div className="button-row top-actions">
            <button type="submit" disabled={busyAction === 'save-mods'}>Save</button>
            <button type="button" className="secondary" onClick={exportMods}>Export</button>
            <button type="button" className="secondary" onClick={() => importInputRef.current?.click()}>Import</button>
            <input ref={importInputRef} className="hidden-file-input" type="file" accept="application/json,.json" onChange={importMods} />
            <span className="autosave-state">{autosaveMessage}</span>
          </div>
          <div className="paired-help">
            <InfoBlock title="Display Name" body="Fetched from the Steam Workshop title. It is saved in this manager only." />
            <InfoBlock title="Mod IDs" body={page.mods.modsHelp || 'Enter one or more Project Zomboid mod IDs for this workshop item.'} />
            <InfoBlock title="WorkshopItems" body={page.mods.workshopHelp} />
            <InfoBlock title="Workshop Link" body="Generated from the Workshop ID for quick opening." />
          </div>
          {fetchMessage ? <div className="mod-fetch-message">{fetchMessage}</div> : null}
          <div className="table-head mods-grid"><span>Order</span><span>Image</span><span>Enabled</span><span>Display Name</span><span>Mod IDs</span><span>Workshop ID</span><span>Link</span><span>Actions</span></div>
          <div className="row-stack">
            {modRows.map((row, index) => (
              <div
                key={index}
                className={`table-row mods-grid ${draggedIndex === index ? 'dragging' : ''} ${dropIndex === index && draggedIndex !== index ? 'drop-target' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDropIndex(index)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  setModRows((current) => reorderRows(current, draggedIndex, index))
                  finishDrag()
                }}
              >
                <button
                  type="button"
                  className="drag-handle"
                  draggable
                  aria-label={`Drag ${row.displayName || row.mod || `mod row ${index + 1}`} to reorder`}
                  title="Drag to reorder"
                  onDragStart={(event) => {
                    setDraggedIndex(index)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', String(index))
                  }}
                  onDragEnd={finishDrag}
                >
                  <span aria-hidden="true">::</span>
                </button>
                <div className="mod-thumb">
                  {row.imageUrl ? <img src={row.imageUrl} alt="" loading="lazy" /> : <span>No image</span>}
                </div>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={row.enabled !== false}
                    onChange={(event) => setModRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item))}
                  />
                  <span>{row.enabled === false ? 'Disabled' : 'Enabled'}</span>
                </label>
                <div className="display-name-cell">{row.displayName || <span className="muted-text">Fetch from Workshop</span>}</div>
                <textarea className="mod-id-list" value={row.mod} placeholder={'ModNameA\nModNameB\nModNameC'} onChange={(event) => setModRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, mod: event.target.value } : item))} />
                <input value={row.workshopId} placeholder="Workshop ID" onChange={(event) => setModRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, workshopId: event.target.value } : item))} />
                <div className="link-cell">{row.workshopId ? <a href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${row.workshopId}`} target="_blank" rel="noreferrer">Open Workshop Page</a> : <span className="muted-text">No ID</span>}</div>
                <div className="row-actions">
                  <button type="button" className="secondary slim" disabled={fetchingIndex === index || !row.workshopId.trim()} onClick={() => fetchWorkshopDetails(index)}>{fetchingIndex === index ? 'Fetching' : 'Fetch'}</button>
                  <button type="button" className="secondary slim" onClick={() => setModRows((current) => removeRow(current, index))}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="button-row bottom-actions">
            <button type="button" className="secondary" onClick={() => setModRows((current) => [...current, { mod: '', displayName: '', workshopId: '', imageUrl: '', enabled: true }])}>Add Mod + Workshop Row</button>
          </div>
        </form>
      ) : <p className="empty-state">No Mods or WorkshopItems setting found in this `.ini` file.</p>}
    </Panel>
  )
}

function PlayerPanels({ page, liveRunning, busyAction, submitForm, selectedUser, setSelectedUser, selectedAccessLevel, setSelectedAccessLevel, selectedEvent, setSelectedEvent, eventCount, setEventCount, eventRadius, setEventRadius, currentUser, currentEvent }) {
  return (
    <Panel title="Players And Permissions" subtitle={page.users.available ? page.users.dbPath : 'No Project Zomboid server database found for this server name yet.'} panelKey="players-admin">
      {page.users.available ? (
        <div className="players-layout">
          <section className="players-card">
            <div className="players-card-head"><h3>Registered Users</h3><p>{page.users.users.length} user(s) in the whitelist database.</p></div>
            <div className="user-list">
              {page.users.users.map((user) => (
                <button key={user.username} type="button" className={`user-row ${selectedUser === user.username ? 'active' : ''}`} onClick={() => { setSelectedUser(user.username); setSelectedAccessLevel(user.accessLevel) }}>
                  <div><strong>{user.displayName || user.username}</strong><span>{user.username}</span></div>
                  <span className={`role-tag role-${user.accessLevel}`}>{user.accessLevel}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="players-card">
            <div className="players-card-head"><h3>Access Level</h3><p>{liveRunning ? 'When the server is live, role updates are sent through the console.' : 'When the server is offline, role updates are written directly into the DB.'}</p></div>
            {currentUser ? (
              <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/set-user-access', [['username', currentUser.username], ['access_level', selectedAccessLevel]], 'set-user-access') }}>
                <div className="button-row top-actions">
                  <button type="submit" disabled={busyAction === 'set-user-access'}>Apply Access Level</button>
                </div>
                <div className="player-meta">
                  <InfoLine label="Username" value={currentUser.username} />
                  <InfoLine label="Display Name" value={currentUser.displayName || 'Not set'} />
                  <InfoLine label="Steam ID" value={currentUser.steamId || 'Not set'} />
                  <InfoLine label="Last Seen" value={currentUser.lastConnection || 'No connection recorded'} />
                </div>
                <Field label="Access Level">
                  <select value={selectedAccessLevel} onChange={(event) => setSelectedAccessLevel(event.target.value)}>
                    {page.users.roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
                  </select>
                </Field>
                <p className="field-help">{page.users.roles.find((role) => role.name === selectedAccessLevel)?.description}</p>
              </form>
            ) : <p className="empty-state">No users found in the whitelist database yet.</p>}
          </section>
          <section className="players-card">
            <div className="players-card-head"><h3>Player Events</h3><p>Lightning, thunder, and horde spawns can target a selected user. Helicopter and gunshot are global Project Zomboid events.</p></div>
            <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/player-event', [['event_id', selectedEvent], ['username', selectedUser], ['count', eventCount], ['radius', eventRadius]], 'player-event') }}>
              <div className="button-row top-actions">
                <button type="submit" disabled={busyAction === 'player-event' || !liveRunning || (currentEvent?.targeted && !selectedUser)}>Run Event</button>
              </div>
              <Field label="Event">
                <select value={selectedEvent} onChange={(event) => setSelectedEvent(event.target.value)}>
                  {page.playerEvents.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </Field>
              <p className="field-help">{currentEvent?.description}</p>
              {currentEvent?.targeted ? (
                <Field label="Target User">
                  <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}>
                    {page.users.users.map((user) => <option key={user.username} value={user.username}>{user.displayName || user.username}</option>)}
                  </select>
                </Field>
              ) : null}
              {selectedEvent === 'createhorde' ? (
                <div className="inline-fields">
                  <Field label="Zombie Count"><input value={eventCount} onChange={(event) => setEventCount(event.target.value)} /></Field>
                  <Field label="Spawn Radius"><input value={eventRadius} onChange={(event) => setEventRadius(event.target.value)} /></Field>
                </div>
              ) : null}
            </form>
          </section>
        </div>
      ) : <p className="empty-state">No server database exists yet. Start the server once to generate `{page.serverName}.db`, then refresh this panel.</p>}
    </Panel>
  )
}

function SandboxPanel({ page, busyAction, submitForm, sandboxRaw, setSandboxRaw }) {
  return (
    <Panel title="SandboxVars" subtitle={page.paths.sandbox} panelKey="sandboxvars">
      <form className="sandbox-stack" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-sandbox-raw', [['server_dir', page.serverDir], ['server_name', page.serverName], ['sandbox_raw', sandboxRaw]], 'save-sandbox-raw') }}>
        <div className="button-row top-actions">
          <button type="submit" disabled={busyAction === 'save-sandbox-raw'}>Save SandboxVars</button>
        </div>
        {page.sandbox.parseError ? <div className="status-banner warning">SandboxVars parser fallback: {page.sandbox.parseError}</div> : null}
        <RawTextEditor title="SandboxVars" path={page.paths.sandbox} value={sandboxRaw} onChange={setSandboxRaw} />
      </form>
    </Panel>
  )
}

function AdvancedFilesPanel({ page, busyAction, submitForm, advancedValues, setAdvancedValues, selectedAdvancedFile, setSelectedAdvancedFile }) {
  const currentFile = page.advancedFiles.find((file) => file.label === selectedAdvancedFile) || page.advancedFiles[0] || null

  return (
    <Panel title="Advanced Files" subtitle="Raw editors for the remaining Lua-based files." panelKey="advanced-files">
      <form className="advanced-stack" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-advanced', [['server_dir', page.serverDir], ['server_name', page.serverName], ...page.advancedFiles.map((file) => [`raw_${file.label}`, advancedValues[file.label] ?? ''])], 'save-advanced') }}>
        <div className="button-row top-actions">
          <button type="submit" disabled={busyAction === 'save-advanced'}>Save Advanced Files</button>
        </div>
        {page.advancedFiles.length ? (
          <section className="advanced-notepad">
            <div className="advanced-file-list" role="tablist" aria-label="Advanced files">
              {page.advancedFiles.map((file) => (
                <button
                  key={file.label}
                  type="button"
                  className={`advanced-file-tab ${currentFile?.label === file.label ? 'active' : ''}`}
                  onClick={() => setSelectedAdvancedFile(file.label)}
                >
                  {file.label}
                </button>
              ))}
            </div>
            {currentFile ? (
              <RawTextEditor
                title={currentFile.label}
                path={currentFile.path}
                value={advancedValues[currentFile.label] ?? ''}
                onChange={(value) => setAdvancedValues((current) => ({ ...current, [currentFile.label]: value }))}
              />
            ) : null}
          </section>
        ) : <p className="empty-state">No advanced files found for this server yet.</p>}
      </form>
    </Panel>
  )
}

function MaintenancePanel({ page, busyAction, submitForm, resetConfirmation, setResetConfirmation }) {
  return (
    <Panel title="Maintenance" subtitle={`Danger zone actions for profile ${page.selectedProfile}.`} panelKey="maintenance">
      <form className="danger-form" onSubmit={async (event) => { event.preventDefault(); const ok = await submitForm('/api/reset-map', [['reset_confirmation', resetConfirmation]], 'reset-map'); if (ok) setResetConfirmation('') }}>
        <div className="button-row top-actions">
          <button type="submit" className="danger" disabled={busyAction === 'reset-map'}>Reset Map</button>
        </div>
        <p className="field-help">This deletes everything inside <strong>{page.paths.saves}</strong>.</p>
        <p className="field-help">Type <strong>RESET</strong> exactly, then click the button.</p>
        <Field label="Confirmation"><input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} placeholder="RESET" /></Field>
      </form>
    </Panel>
  )
}

function RawTextEditor({ title, path, value, onChange }) {
  return (
    <div className="advanced-editor">
      <div className="advanced-editor-head">
        <strong>{title}</strong>
        <span>{path}</span>
      </div>
      <textarea
        className="advanced-notepad-area"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
    </div>
  )
}

function removeRow(rows, index) {
  if (rows.length <= 1) return [{ mod: '', displayName: '', workshopId: '', imageUrl: '', enabled: true }]
  return rows.filter((_, itemIndex) => itemIndex !== index)
}

function reorderRows(rows, fromIndex, toIndex) {
  if (fromIndex === null || fromIndex === undefined || toIndex === null || toIndex === undefined) return rows
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= rows.length || toIndex >= rows.length) return rows
  const next = [...rows]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function splitModIds(value) {
  return String(value || '')
    .split(/[,\n;]+/)
    .map((item) => item.trim().replace(/^[\\/]+/, ''))
    .filter(Boolean)
}

function normalizeImportedModRows(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const rawModIds = Array.isArray(row.modIds) ? row.modIds : splitModIds(row.mod)
      return {
        mod: rawModIds.length ? rawModIds.map((modId) => String(modId).trim().replace(/^[\\/]+/, '')).filter(Boolean).join('\n') : String(row.mod || ''),
        displayName: String(row.displayName || row.title || ''),
        workshopId: String(row.workshopId || row.workshopID || ''),
        imageUrl: String(row.imageUrl || row.image || ''),
        enabled: row.enabled !== false,
      }
    })
    .filter((row) => row.mod || row.displayName || row.workshopId)
}

function buildModSaveEntries(serverDir, serverName, modRows) {
  return [
    ['server_dir', serverDir],
    ['server_name', serverName],
    ['ini_pair_mods', modRows.map((row) => row.mod)],
    ['mod_display_name', modRows.map((row) => row.displayName)],
    ['ini_pair_workshop', modRows.map((row) => row.workshopId)],
    ['mod_image_url', modRows.map((row) => row.imageUrl || '')],
    ['mod_enabled', modRows.map((row) => row.enabled === false ? 'false' : 'true')],
  ]
}

function buildCommonSaveEntries(serverDir, serverName, serverConfigRaw) {
  return [
    ['server_dir', serverDir],
    ['server_name', serverName],
    ['server_config_raw', serverConfigRaw],
  ]
}

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
