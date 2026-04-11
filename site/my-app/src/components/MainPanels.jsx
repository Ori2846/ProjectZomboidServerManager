import { Field, InfoBlock, InfoLine, Panel, SettingCard } from './UiBits.jsx'

export function MainPanels(props) {
  const {
    page,
    liveLogs,
    liveRunning,
    liveServerPid,
    busyAction,
    panelState,
    togglePanel,
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
    targetForm,
    setTargetForm,
    launchForm,
    setLaunchForm,
    commonValues,
    setCommonValues,
    modRows,
    setModRows,
    sandboxValues,
    setSandboxValues,
    sandboxRaw,
    setSandboxRaw,
    advancedValues,
    setAdvancedValues,
    selectedAdvancedFile,
    setSelectedAdvancedFile,
  } = props

  const currentUser = page.users.users.find((user) => user.username === selectedUser) || null
  const currentEvent = page.playerEvents.find((event) => event.id === selectedEvent) || page.playerEvents[0]

  return (
    <div className="panel-stack">
      <Panel title="Server Target" subtitle={`${page.serverDir} | ${page.serverName}`} panelKey="server-target" open={panelState['server-target']} onToggle={togglePanel}>
        <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/select-server', [['server_dir', targetForm.serverDir], ['server_name', targetForm.serverName]], 'load-server') }}>
          <div className="button-row top-actions">
            <button type="submit" disabled={busyAction === 'load-server'}>Load Server</button>
          </div>
          <Field label="Server Folder"><input value={targetForm.serverDir} onChange={(event) => setTargetForm((current) => ({ ...current, serverDir: event.target.value }))} /></Field>
          <Field label="Server Name"><input value={targetForm.serverName} onChange={(event) => setTargetForm((current) => ({ ...current, serverName: event.target.value }))} /></Field>
        </form>
      </Panel>

      <Panel title="Server Process" subtitle="Launch and control the dedicated server from the manager." badge={<span className={`pill ${liveRunning ? 'success' : 'warning'}`}>{liveRunning ? 'Running' : 'Stopped'}{liveRunning && liveServerPid ? ` | PID ${liveServerPid}` : ''}</span>} panelKey="server-process" open={panelState['server-process']} onToggle={togglePanel}>
        <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-launch', [['launch_command', launchForm.launchCommand], ['launch_workdir', launchForm.launchWorkdir]], 'save-launch') }}>
          <div className="button-row top-actions">
            <button type="submit" disabled={busyAction === 'save-launch'}>Save Launch Settings</button>
            <button type="button" className="secondary" disabled={busyAction === 'update-server' || liveRunning} onClick={() => submitForm('/api/update-server', [], 'update-server')}>Update Server</button>
            <button type="button" className="secondary" disabled={busyAction === 'start-server'} onClick={() => submitForm('/api/start-server', [], 'start-server')}>Start Server</button>
            <button type="button" className="secondary" disabled={busyAction === 'stop-server'} onClick={() => submitForm('/api/stop-server', [], 'stop-server')}>Stop Server</button>
          </div>
          <p className="field-help">SteamCMD path: {page.serverVersion?.steamcmdPath || 'Not found from the current install metadata.'}</p>
          <Field label="Launch Command"><input value={launchForm.launchCommand} onChange={(event) => setLaunchForm((current) => ({ ...current, launchCommand: event.target.value }))} placeholder="StartServer64.bat -servername servertest" /></Field>
          <Field label="Launch Working Directory"><input value={launchForm.launchWorkdir} onChange={(event) => setLaunchForm((current) => ({ ...current, launchWorkdir: event.target.value }))} /></Field>
        </form>
      </Panel>

      <Panel title="Live Console" subtitle="Send commands, clear the visible buffer, and watch output update in place." panelKey="live-console" open={panelState['live-console']} onToggle={togglePanel}>
        <form className="console-form" onSubmit={async (event) => { event.preventDefault(); const ok = await submitForm('/api/send-command', [['console_command', consoleCommand]], 'send-command'); if (ok) setConsoleCommand('') }}>
          <div className="button-row top-actions">
            <button type="submit" disabled={busyAction === 'send-command'}>Send Command</button>
            <button type="button" className="secondary" disabled={busyAction === 'clear-console'} onClick={() => submitForm('/api/clear-console', [], 'clear-console')}>Clear Console</button>
          </div>
          <Field label="Console Command"><input value={consoleCommand} onChange={(event) => setConsoleCommand(event.target.value)} placeholder="save, quit, help, players" /></Field>
        </form>
        <pre className="log-console">{liveLogs.join('\n')}</pre>
      </Panel>

      <Panel title="Common Settings" subtitle={page.paths.ini} panelKey="common-settings" open={panelState['common-settings']} onToggle={togglePanel}>
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

      <Panel title="Mods And Workshop Items" subtitle="Keep folder names, manager labels, and workshop IDs aligned." panelKey="mods-workshop" open={panelState['mods-workshop']} onToggle={togglePanel}>
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
                    <button type="button" className="secondary slim" disabled={index === 0} onClick={() => setModRows((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next })}>Up</button>
                    <button type="button" className="secondary slim" disabled={index === modRows.length - 1} onClick={() => setModRows((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next })}>Down</button>
                    <button type="button" className="secondary slim" onClick={() => setModRows((current) => current.length <= 1 ? [{ mod: '', displayName: '', workshopId: '' }] : current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </form>
        ) : <p className="empty-state">No Mods or WorkshopItems setting found in this `.ini` file.</p>}
      </Panel>

      <PlayerPanels page={page} liveRunning={liveRunning} busyAction={busyAction} panelState={panelState} togglePanel={togglePanel} submitForm={submitForm} selectedUser={selectedUser} setSelectedUser={setSelectedUser} selectedAccessLevel={selectedAccessLevel} setSelectedAccessLevel={setSelectedAccessLevel} selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} eventCount={eventCount} setEventCount={setEventCount} eventRadius={eventRadius} setEventRadius={setEventRadius} currentUser={currentUser} currentEvent={currentEvent} />

      <Panel title="SandboxVars" subtitle={page.paths.sandbox} panelKey="sandboxvars" open={panelState.sandboxvars} onToggle={togglePanel}>
        <form className="sandbox-stack" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-sandbox-raw', [['server_dir', page.serverDir], ['server_name', page.serverName], ['sandbox_raw', sandboxRaw]], 'save-sandbox-raw') }}>
          <div className="button-row top-actions">
            <button type="submit" disabled={busyAction === 'save-sandbox-raw'}>Save SandboxVars</button>
          </div>
          {page.sandbox.parseError ? <div className="status-banner warning">SandboxVars parser fallback: {page.sandbox.parseError}</div> : null}
          <div className="advanced-editor">
            <div className="advanced-editor-head">
              <strong>SandboxVars</strong>
              <span>{page.paths.sandbox}</span>
            </div>
            <textarea
              className="advanced-notepad-area"
              value={sandboxRaw}
              onChange={(event) => setSandboxRaw(event.target.value)}
              spellCheck={false}
            />
          </div>
        </form>
      </Panel>

      <Panel title="Advanced Files" subtitle="Raw editors for the remaining Lua-based files." panelKey="advanced-files" open={panelState['advanced-files']} onToggle={togglePanel}>
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
                    className={`advanced-file-tab ${selectedAdvancedFile === file.label ? 'active' : ''}`}
                    onClick={() => setSelectedAdvancedFile(file.label)}
                  >
                    {file.label}
                  </button>
                ))}
              </div>
              {page.advancedFiles.filter((file) => file.label === selectedAdvancedFile).map((file) => (
                <div key={file.label} className="advanced-editor">
                  <div className="advanced-editor-head">
                    <strong>{file.label}</strong>
                    <span>{file.path}</span>
                  </div>
                  <textarea
                    className="advanced-notepad-area"
                    value={advancedValues[file.label] ?? ''}
                    onChange={(event) => setAdvancedValues((current) => ({ ...current, [file.label]: event.target.value }))}
                    spellCheck={false}
                  />
                </div>
              ))}
            </section>
          ) : <p className="empty-state">No advanced files found for this server yet.</p>}
        </form>
      </Panel>

      <Panel title="Maintenance" subtitle="Danger zone actions for save data." panelKey="maintenance" open={panelState.maintenance} onToggle={togglePanel}>
        <form className="danger-form" onSubmit={async (event) => { event.preventDefault(); const ok = await submitForm('/api/reset-map', [['reset_confirmation', resetConfirmation]], 'reset-map'); if (ok) setResetConfirmation('') }}>
          <div className="button-row top-actions">
            <button type="submit" className="danger" disabled={busyAction === 'reset-map'}>Reset Map</button>
          </div>
          <p className="field-help">This deletes everything inside <strong>{page.paths.saves}</strong>.</p>
          <p className="field-help">Type <strong>RESET</strong> exactly, then click the button.</p>
          <Field label="Confirmation"><input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} placeholder="RESET" /></Field>
        </form>
      </Panel>
    </div>
  )
}

function PlayerPanels({ page, liveRunning, busyAction, panelState, togglePanel, submitForm, selectedUser, setSelectedUser, selectedAccessLevel, setSelectedAccessLevel, selectedEvent, setSelectedEvent, eventCount, setEventCount, eventRadius, setEventRadius, currentUser, currentEvent }) {
  return (
    <Panel title="Players And Permissions" subtitle={page.users.available ? page.users.dbPath : 'No Project Zomboid server database found for this server name yet.'} panelKey="players-admin" open={panelState['players-admin']} onToggle={togglePanel}>
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
