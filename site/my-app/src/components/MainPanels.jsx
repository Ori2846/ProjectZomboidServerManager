import { useEffect, useRef } from 'react'
import { Field, InfoBlock, InfoLine, Panel, SettingCard } from './UiBits.jsx'

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
    commonValues,
    setCommonValues,
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
      return <CommonSettingsPanel page={page} busyAction={busyAction} submitForm={submitForm} commonValues={commonValues} setCommonValues={setCommonValues} />
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

function CommonSettingsPanel({ page, busyAction, submitForm, commonValues, setCommonValues }) {
  return (
    <Panel title="Common Settings" subtitle={page.paths.ini} panelKey="common-settings">
      <div className="jump-bar">
        <Field label="Jump To Setting">
          <select onChange={(event) => document.getElementById(event.target.value)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            <option value="">Choose a server setting</option>
            {page.commonSettings.map((field) => <option key={field.id} value={field.id}>{field.key}</option>)}
          </select>
        </Field>
      </div>
      {page.commonSettings.length ? (
        <form className="settings-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-common', [['server_dir', page.serverDir], ['server_name', page.serverName], ...page.commonSettings.flatMap((field) => [[`ini__${field.key}`, commonValues[field.key] ?? ''], [`ini_type__${field.key}`, field.valueType]])], 'save-common') }}>
          <div className="button-row top-actions settings-actions">
            <button type="submit" disabled={busyAction === 'save-common'}>Save Server Settings</button>
          </div>
          {page.commonSettings.map((field) => (
            <SettingCard key={field.id} id={field.id} label={field.key} help={field.comments}>
              {field.valueType === 'bool' ? (
                <select value={commonValues[field.key] ?? 'false'} onChange={(event) => setCommonValues((current) => ({ ...current, [field.key]: event.target.value }))}>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input value={commonValues[field.key] ?? ''} onChange={(event) => setCommonValues((current) => ({ ...current, [field.key]: event.target.value }))} />
              )}
            </SettingCard>
          ))}
        </form>
      ) : <p className="empty-state">No `.ini` file found yet for this server.</p>}
    </Panel>
  )
}

function ModsWorkshopPanel({ page, busyAction, submitForm, modRows, setModRows }) {
  return (
    <Panel title="Mods And Workshop Items" subtitle="Keep folder names, manager labels, and workshop IDs aligned." panelKey="mods-workshop">
      {page.mods.available ? (
        <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-mods', [['server_dir', page.serverDir], ['server_name', page.serverName], ['ini_pair_mods', modRows.map((row) => row.mod)], ['mod_display_name', modRows.map((row) => row.displayName)], ['ini_pair_workshop', modRows.map((row) => row.workshopId)]], 'save-mods') }}>
          <div className="button-row top-actions">
            <button type="button" className="secondary" onClick={() => setModRows((current) => [...current, { mod: '', displayName: '', workshopId: '' }])}>Add Mod + Workshop Row</button>
            <button type="submit" disabled={busyAction === 'save-mods'}>Save Mods And Workshop Items</button>
          </div>
          <div className="paired-help">
            <InfoBlock title="Display Name" body="Saved in this manager only. It does not get written into the server file." />
            <InfoBlock title="Mod IDs" body={page.mods.modsHelp || 'Enter one or more Project Zomboid mod IDs for this workshop item.'} />
            <InfoBlock title="WorkshopItems" body={page.mods.workshopHelp} />
            <InfoBlock title="Workshop Link" body="Generated from the Workshop ID for quick opening." />
          </div>
          <div className="table-head mods-grid"><span>Manager Label</span><span>Mod IDs</span><span>Workshop ID</span><span>Link</span><span>Actions</span></div>
          <div className="row-stack">
            {modRows.map((row, index) => (
              <div key={index} className="table-row mods-grid">
                <input value={row.displayName} placeholder="Display name in manager only" onChange={(event) => setModRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, displayName: event.target.value } : item))} />
                <input value={row.mod} placeholder="ModA, ModB" onChange={(event) => setModRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, mod: event.target.value } : item))} />
                <input value={row.workshopId} placeholder="Workshop ID" onChange={(event) => setModRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, workshopId: event.target.value } : item))} />
                <div className="link-cell">{row.workshopId ? <a href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${row.workshopId}`} target="_blank" rel="noreferrer">Open Workshop Page</a> : <span className="muted-text">No ID</span>}</div>
                <div className="row-actions">
                  <button type="button" className="secondary slim" disabled={index === 0} onClick={() => setModRows((current) => moveRow(current, index, -1))}>Up</button>
                  <button type="button" className="secondary slim" disabled={index === modRows.length - 1} onClick={() => setModRows((current) => moveRow(current, index, 1))}>Down</button>
                  <button type="button" className="secondary slim" onClick={() => setModRows((current) => removeRow(current, index))}>Remove</button>
                </div>
              </div>
            ))}
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

function moveRow(rows, index, direction) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= rows.length) return rows
  const next = [...rows]
  ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
  return next
}

function removeRow(rows, index) {
  if (rows.length <= 1) return [{ mod: '', displayName: '', workshopId: '' }]
  return rows.filter((_, itemIndex) => itemIndex !== index)
}
