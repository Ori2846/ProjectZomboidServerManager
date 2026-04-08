import { Field, InfoBlock, InfoLine, Panel, SettingCard } from './UiBits.jsx'

export function MainPanels(props) {
  const {
    page,
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
  } = props

  const currentUser = page.users.users.find((user) => user.username === selectedUser) || null
  const currentEvent = page.playerEvents.find((event) => event.id === selectedEvent) || page.playerEvents[0]

  return (
    <div className="panel-stack">
      <Panel title="Server Target" subtitle={`${page.serverDir} | ${page.serverName}`} panelKey="server-target" open={panelState['server-target']} onToggle={togglePanel}>
        <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/select-server', [['server_dir', targetForm.serverDir], ['server_name', targetForm.serverName]], 'load-server') }}>
          <Field label="Server Folder"><input value={targetForm.serverDir} onChange={(event) => setTargetForm((current) => ({ ...current, serverDir: event.target.value }))} /></Field>
          <Field label="Server Name"><input value={targetForm.serverName} onChange={(event) => setTargetForm((current) => ({ ...current, serverName: event.target.value }))} /></Field>
          <button type="submit" disabled={busyAction === 'load-server'}>Load Server</button>
        </form>
      </Panel>

      <Panel title="Server Process" subtitle="Launch and control the dedicated server from the manager." badge={<span className={`pill ${page.running ? 'success' : 'warning'}`}>{page.running ? 'Running' : 'Stopped'}{page.running && page.serverPid ? ` | PID ${page.serverPid}` : ''}</span>} panelKey="server-process" open={panelState['server-process']} onToggle={togglePanel}>
        <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-launch', [['launch_command', launchForm.launchCommand], ['launch_workdir', launchForm.launchWorkdir]], 'save-launch') }}>
          <Field label="Launch Command"><input value={launchForm.launchCommand} onChange={(event) => setLaunchForm((current) => ({ ...current, launchCommand: event.target.value }))} placeholder="StartServer64.bat -servername servertest" /></Field>
          <Field label="Launch Working Directory"><input value={launchForm.launchWorkdir} onChange={(event) => setLaunchForm((current) => ({ ...current, launchWorkdir: event.target.value }))} /></Field>
          <div className="button-row">
            <button type="submit" disabled={busyAction === 'save-launch'}>Save Launch Settings</button>
            <button type="button" className="secondary" disabled={busyAction === 'start-server'} onClick={() => submitForm('/api/start-server', [], 'start-server')}>Start Server</button>
            <button type="button" className="secondary" disabled={busyAction === 'stop-server'} onClick={() => submitForm('/api/stop-server', [], 'stop-server')}>Stop Server</button>
          </div>
        </form>
      </Panel>

      <Panel title="Live Console" subtitle="Send commands, clear the visible buffer, and watch output update in place." panelKey="live-console" open={panelState['live-console']} onToggle={togglePanel}>
        <form className="console-form" onSubmit={async (event) => { event.preventDefault(); const ok = await submitForm('/api/send-command', [['console_command', consoleCommand]], 'send-command'); if (ok) setConsoleCommand('') }}>
          <Field label="Console Command"><input value={consoleCommand} onChange={(event) => setConsoleCommand(event.target.value)} placeholder="save, quit, help, players" /></Field>
          <button type="submit" disabled={busyAction === 'send-command'}>Send Command</button>
          <button type="button" className="secondary" disabled={busyAction === 'clear-console'} onClick={() => submitForm('/api/clear-console', [], 'clear-console')}>Clear Console</button>
        </form>
        <pre className="log-console">{page.logs.join('\n')}</pre>
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
            <button type="submit" disabled={busyAction === 'save-common'}>Save Server Settings</button>
          </form>
        ) : <p className="empty-state">No `.ini` file found yet for this server.</p>}
      </Panel>

      <Panel title="Mods And Workshop Items" subtitle="Keep folder names, manager labels, and workshop IDs aligned." panelKey="mods-workshop" open={panelState['mods-workshop']} onToggle={togglePanel}>
        {page.mods.available ? (
          <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-mods', [['server_dir', page.serverDir], ['server_name', page.serverName], ['ini_pair_mods', modRows.map((row) => row.mod)], ['mod_display_name', modRows.map((row) => row.displayName)], ['ini_pair_workshop', modRows.map((row) => row.workshopId)]], 'save-mods') }}>
            <div className="paired-help">
              <InfoBlock title="Mods" body={page.mods.modsHelp} />
              <InfoBlock title="Display Name" body="Saved in this manager only. It does not get written into the server file." />
              <InfoBlock title="WorkshopItems" body={page.mods.workshopHelp} />
              <InfoBlock title="Workshop Link" body="Generated from the Workshop ID for quick opening." />
            </div>
            <div className="table-head mods-grid"><span>Mod Folder</span><span>Manager Label</span><span>Workshop ID</span><span>Link</span><span>Actions</span></div>
            <div className="row-stack">
              {modRows.map((row, index) => (
                <div key={`${index}-${row.mod}-${row.workshopId}`} className="table-row mods-grid">
                  <input value={row.mod} placeholder="Mod folder name" onChange={(event) => setModRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, mod: event.target.value } : item))} />
                  <input value={row.displayName} placeholder="Display name in manager only" onChange={(event) => setModRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, displayName: event.target.value } : item))} />
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
            <div className="button-row">
              <button type="button" className="secondary" onClick={() => setModRows((current) => [...current, { mod: '', displayName: '', workshopId: '' }])}>Add Mod + Workshop Row</button>
              <button type="submit" disabled={busyAction === 'save-mods'}>Save Mods And Workshop Items</button>
            </div>
          </form>
        ) : <p className="empty-state">No Mods or WorkshopItems setting found in this `.ini` file.</p>}
      </Panel>

      <PlayerPanels page={page} busyAction={busyAction} panelState={panelState} togglePanel={togglePanel} submitForm={submitForm} selectedUser={selectedUser} setSelectedUser={setSelectedUser} selectedAccessLevel={selectedAccessLevel} setSelectedAccessLevel={setSelectedAccessLevel} selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} eventCount={eventCount} setEventCount={setEventCount} eventRadius={eventRadius} setEventRadius={setEventRadius} currentUser={currentUser} currentEvent={currentEvent} />

      <Panel title="SandboxVars" subtitle={page.paths.sandbox} panelKey="sandboxvars" open={panelState.sandboxvars} onToggle={togglePanel}>
        {page.sandbox.parseError ? (
          <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-sandbox-raw', [['server_dir', page.serverDir], ['server_name', page.serverName], ['sandbox_raw', sandboxRaw]], 'save-sandbox-raw') }}>
            <div className="status-banner warning">SandboxVars parser fallback: {page.sandbox.parseError}</div>
            <Field label="Raw SandboxVars"><textarea value={sandboxRaw} onChange={(event) => setSandboxRaw(event.target.value)} /></Field>
            <button type="submit" disabled={busyAction === 'save-sandbox-raw'}>Save Raw SandboxVars</button>
          </form>
        ) : page.sandbox.fields.length ? (
          <>
            <div className="jump-bar">
              <Field label="Jump To Sandbox Setting">
                <select onChange={(event) => document.getElementById(event.target.value)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                  <option value="">Choose a sandbox setting</option>
                  {page.sandbox.fields.map((field) => <option key={field.id} value={field.id}>{field.path}</option>)}
                </select>
              </Field>
            </div>
            <form className="sandbox-stack" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-sandbox', [['server_dir', page.serverDir], ['server_name', page.serverName], ...page.sandbox.fields.flatMap((field) => field.valueType === 'section' ? [] : [[`sandbox__${field.path}`, sandboxValues[field.path] ?? ''], [`sandbox_type__${field.path}`, field.valueType]])], 'save-sandbox') }}>
              {page.sandbox.fields.map((field) => field.valueType === 'section' ? (
                <div key={field.id} id={field.id} className="sandbox-section" style={{ marginLeft: `${field.depth * 20}px` }}>
                  <h3>{field.label}</h3>
                  {field.comments ? <p className="field-help">{field.comments}</p> : null}
                </div>
              ) : (
                <SettingCard key={field.id} id={field.id} label={field.label} help={field.comments} indent={field.depth} compact>
                  {field.valueType === 'bool' ? (
                    <select value={sandboxValues[field.path] ?? 'false'} onChange={(event) => setSandboxValues((current) => ({ ...current, [field.path]: event.target.value }))}>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input value={sandboxValues[field.path] ?? ''} onChange={(event) => setSandboxValues((current) => ({ ...current, [field.path]: event.target.value }))} />
                  )}
                </SettingCard>
              ))}
              <button type="submit" disabled={busyAction === 'save-sandbox'}>Save SandboxVars</button>
            </form>
          </>
        ) : <p className="empty-state">No SandboxVars file found yet. Load a server with an existing file or save one first.</p>}
      </Panel>

      <Panel title="Advanced Files" subtitle="Raw editors for the remaining Lua-based files." panelKey="advanced-files" open={panelState['advanced-files']} onToggle={togglePanel}>
        <form className="advanced-stack" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/save-advanced', [['server_dir', page.serverDir], ['server_name', page.serverName], ...page.advancedFiles.map((file) => [`raw_${file.label}`, advancedValues[file.label] ?? ''])], 'save-advanced') }}>
          {page.advancedFiles.map((file) => (
            <section key={file.label} className="editor-card">
              <div className="editor-head"><h3>{file.label}</h3><p>{file.path}</p></div>
              <textarea value={advancedValues[file.label] ?? ''} onChange={(event) => setAdvancedValues((current) => ({ ...current, [file.label]: event.target.value }))} />
            </section>
          ))}
          <button type="submit" disabled={busyAction === 'save-advanced'}>Save Advanced Files</button>
        </form>
      </Panel>

      <Panel title="Maintenance" subtitle="Danger zone actions for save data." panelKey="maintenance" open={panelState.maintenance} onToggle={togglePanel}>
        <form className="danger-form" onSubmit={async (event) => { event.preventDefault(); const ok = await submitForm('/api/reset-map', [['reset_confirmation', resetConfirmation]], 'reset-map'); if (ok) setResetConfirmation('') }}>
          <p className="field-help">This deletes everything inside <strong>{page.paths.saves}</strong>.</p>
          <p className="field-help">Type <strong>RESET</strong> exactly, then click the button.</p>
          <Field label="Confirmation"><input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} placeholder="RESET" /></Field>
          <button type="submit" className="danger" disabled={busyAction === 'reset-map'}>Reset Map</button>
        </form>
      </Panel>
    </div>
  )
}

function PlayerPanels({ page, busyAction, panelState, togglePanel, submitForm, selectedUser, setSelectedUser, selectedAccessLevel, setSelectedAccessLevel, selectedEvent, setSelectedEvent, eventCount, setEventCount, eventRadius, setEventRadius, currentUser, currentEvent }) {
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
            <div className="players-card-head"><h3>Access Level</h3><p>{page.running ? 'When the server is live, role updates are sent through the console.' : 'When the server is offline, role updates are written directly into the DB.'}</p></div>
            {currentUser ? (
              <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/set-user-access', [['username', currentUser.username], ['access_level', selectedAccessLevel]], 'set-user-access') }}>
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
                <button type="submit" disabled={busyAction === 'set-user-access'}>Apply Access Level</button>
              </form>
            ) : <p className="empty-state">No users found in the whitelist database yet.</p>}
          </section>
          <section className="players-card">
            <div className="players-card-head"><h3>Player Events</h3><p>Lightning, thunder, and horde spawns can target a selected user. Helicopter and gunshot are global Project Zomboid events.</p></div>
            <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); await submitForm('/api/player-event', [['event_id', selectedEvent], ['username', selectedUser], ['count', eventCount], ['radius', eventRadius]], 'player-event') }}>
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
              <button type="submit" disabled={busyAction === 'player-event' || !page.running || (currentEvent?.targeted && !selectedUser)}>Run Event</button>
            </form>
          </section>
        </div>
      ) : <p className="empty-state">No server database exists yet. Start the server once to generate `{page.serverName}.db`, then refresh this panel.</p>}
    </Panel>
  )
}
