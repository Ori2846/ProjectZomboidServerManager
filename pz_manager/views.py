from __future__ import annotations

import html
import re

from .config import ADVANCED_FILES, DEFAULT_SAVES_DIR, HOST, PORT
from .files import advanced_path, ini_path, load_advanced_contents, parse_ini_file
from .logs import current_logs
from .network import get_access_url
from .processes import is_server_running
from .sandbox_vars import flatten_sandbox_fields, load_sandbox_document_safe
from .state import STATE, get_mod_display_names


def setting_id(prefix: str, key: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", key).strip("-").lower()
    return f"{prefix}-{slug}"


def format_comments(comments: list[str]) -> str:
    return "\n".join(line.lstrip("#; ").removeprefix("--").strip() for line in comments if line.strip())


def render_dropdown_panel(
    title: str,
    subtitle: str,
    body: str,
    open_by_default: bool = False,
    extra_badge: str = "",
    panel_key: str = "",
) -> str:
    open_attr = " open" if open_by_default else ""
    badge_markup = f'<div class="panel-badge">{extra_badge}</div>' if extra_badge else ""
    key_attr = f' data-panel-key="{html.escape(panel_key)}"' if panel_key else ""
    return f"""
    <details class="panel dropdown-panel"{open_attr}{key_attr}>
      <summary class="panel-summary">
        <div class="panel-summary-copy">
          <h2>{html.escape(title)}</h2>
          <p>{html.escape(subtitle)}</p>
        </div>
        <div class="panel-summary-meta">
          {badge_markup}
          <span class="panel-toggle">Open</span>
        </div>
      </summary>
      <div class="panel-body">
        {body}
      </div>
    </details>
    """


def render_mod_workshop_editor(
    mods_value: str,
    workshop_value: str,
    display_names: list[str],
    element_id: str,
    mods_description_markup: str,
    workshop_description_markup: str,
) -> str:
    mods = [item.strip().lstrip("\\") for item in mods_value.split(";") if item.strip()]
    workshop_items = [item.strip() for item in workshop_value.split(";") if item.strip()]
    row_count = max(len(mods), len(workshop_items), len(display_names), 1)
    rows = []
    for index in range(row_count):
        mod_value = html.escape(mods[index] if index < len(mods) else "")
        workshop_value = html.escape(workshop_items[index] if index < len(workshop_items) else "")
        display_name = html.escape(display_names[index] if index < len(display_names) else "")
        workshop_link = ""
        if index < len(workshop_items) and workshop_items[index]:
            workshop_url = f"https://steamcommunity.com/sharedfiles/filedetails/?id={html.escape(workshop_items[index])}"
            workshop_link = f'<a class="workshop-link" href="{workshop_url}" target="_blank" rel="noreferrer">Open Workshop Page</a>'
        rows.append(
            f"""
            <div class="paired-row">
              <input name="ini_pair_mods" value="{mod_value}" placeholder="Mod folder name" />
              <input name="mod_display_name" value="{display_name}" placeholder="Display name in manager only" />
              <input name="ini_pair_workshop" value="{workshop_value}" placeholder="Workshop ID" />
              <div class="workshop-link-wrap">{workshop_link}</div>
              <div class="row-actions">
                <button type="button" class="row-button secondary" onclick="moveListRow(this, -1)">Up</button>
                <button type="button" class="row-button secondary" onclick="moveListRow(this, 1)">Down</button>
                <button type="button" class="row-button secondary" onclick="removeListRow(this)">Remove</button>
              </div>
            </div>
            """
        )
    return f"""
    <div class="field ini-field list-field" id="{element_id}">
      <div class="setting-head">
        <span>Mods And Workshop Items</span>
      </div>
      <div class="paired-help">
        <div>
          <strong>Mods</strong>
          {mods_description_markup}
        </div>
        <div>
          <strong>Display Name</strong>
          <p class="setting-help">Saved in this manager only. It does not get written into the server file.</p>
        </div>
        <div>
          <strong>WorkshopItems</strong>
          {workshop_description_markup}
        </div>
        <div>
          <strong>Workshop Link</strong>
          <p class="setting-help">Generated from the Workshop ID for quick opening.</p>
        </div>
      </div>
      <div class="paired-header">
        <span>Mods</span>
        <span>Name</span>
        <span>WorkshopItems</span>
        <span>Link</span>
        <span>Actions</span>
      </div>
      <div class="list-editor">
        {''.join(rows)}
      </div>
      <div class="button-row">
        <button type="button" class="row-button" onclick="addPairRow(this)">Add Mod + Workshop Row</button>
      </div>
    </div>
    """


def render_page() -> str:
    server_dir = STATE.server_dir
    server_name = STATE.server_name.strip() or "servertest"
    running = is_server_running()
    ini_document = parse_ini_file(ini_path(server_dir, server_name))
    advanced_contents = load_advanced_contents(server_dir, server_name)
    sandbox_path = advanced_path(server_dir, server_name, "{server}_SandboxVars.lua")
    sandbox_document = load_sandbox_document_safe(sandbox_path)
    sandbox_fields = (
        flatten_sandbox_fields(sandbox_document.data, sandbox_document.comments)
        if sandbox_document.data and not sandbox_document.parse_error
        else []
    )

    ini_form = []
    ini_jump_options = []
    ini_lookup = {field.key: field for field in ini_document.fields}
    mods_field = ini_lookup.get("Mods")
    workshop_field = ini_lookup.get("WorkshopItems")
    mods_section_markup = ""
    if mods_field or workshop_field:
        mods_section_markup = render_mod_workshop_editor(
            mods_field.value if mods_field else "",
            workshop_field.value if workshop_field else "",
            get_mod_display_names(),
            setting_id("ini", "mods-workshopitems"),
            f'<p class="setting-help">{html.escape(format_comments(mods_field.comments))}</p>' if mods_field and mods_field.comments else "",
            f'<p class="setting-help">{html.escape(format_comments(workshop_field.comments))}</p>' if workshop_field and workshop_field.comments else "",
        )
    for field in ini_document.fields:
        label = html.escape(field.key)
        description = html.escape(format_comments(field.comments))
        element_id = setting_id("ini", field.key)
        ini_jump_options.append(f'<option value="#{element_id}">{label}</option>')
        description_markup = f'<p class="setting-help">{description}</p>' if description else ""
        if field.key in {"Mods", "WorkshopItems"}:
            continue
        if field.value_type == "bool":
            ini_form.append(
                f"""
                <div class="ini-field" id="{element_id}">
                  <div class="setting-head">
                    <div class="sandbox-label">{label}</div>
                  </div>
                  {description_markup}
                  <select name="ini__{label}">
                    <option value="true" {'selected' if field.value.lower() == 'true' else ''}>True</option>
                    <option value="false" {'selected' if field.value.lower() == 'false' else ''}>False</option>
                  </select>
                  <input type="hidden" name="ini_type__{label}" value="bool" />
                </div>
                """
            )
            continue
        ini_form.append(
            f"""
            <label class="field ini-field" id="{element_id}">
              <div class="setting-head">
                <span>{label}</span>
              </div>
              {description_markup}
              <input name="ini__{label}" value="{html.escape(field.value)}" />
              <input type="hidden" name="ini_type__{label}" value="{html.escape(field.value_type)}" />
            </label>
            """
        )

    advanced_form = []
    for label, pattern in ADVANCED_FILES:
        if label == "SandboxVars":
            continue
        file_path = advanced_path(server_dir, server_name, pattern)
        advanced_form.append(
            f"""
            <section class="editor-card">
              <div class="editor-head">
                <h3>{html.escape(label)}</h3>
                <p>{html.escape(str(file_path))}</p>
              </div>
              <textarea name="raw_{html.escape(label)}">{html.escape(advanced_contents[label])}</textarea>
            </section>
            """
        )

    sandbox_form = []
    sandbox_jump_options = []
    for field in sandbox_fields:
        indent = field.depth * 20
        element_id = setting_id("sandbox", field.path)
        label = html.escape(field.label)
        description = html.escape(format_comments(field.comments))
        description_markup = f'<p class="setting-help">{description}</p>' if description else ""
        sandbox_jump_options.append(f'<option value="#{element_id}">{html.escape(field.path)}</option>')
        if field.value_type == "section":
            sandbox_form.append(
                f"""
                <div class="sandbox-section" id="{element_id}" style="margin-left: {indent}px;">
                  <h3>{label}</h3>
                  {description_markup}
                </div>
                """
            )
            continue
        if field.value_type == "bool":
            sandbox_form.append(
                f"""
                <div class="sandbox-field" id="{element_id}" style="margin-left: {indent}px;">
                  <div class="sandbox-label">{label}</div>
                  {description_markup}
                  <select name="sandbox__{html.escape(field.path)}">
                    <option value="true" {'selected' if field.value.lower() == 'true' else ''}>True</option>
                    <option value="false" {'selected' if field.value.lower() == 'false' else ''}>False</option>
                  </select>
                  <input type="hidden" name="sandbox_type__{html.escape(field.path)}" value="bool" />
                </div>
                """
            )
            continue
        sandbox_form.append(
            f"""
            <label class="field sandbox-field" id="{element_id}" style="margin-left: {indent}px;">
              <span>{label}</span>
              {description_markup}
              <input name="sandbox__{html.escape(field.path)}" value="{html.escape(field.value)}" />
              <input type="hidden" name="sandbox_type__{html.escape(field.path)}" value="{html.escape(field.value_type)}" />
            </label>
            """
        )

    status_markup = ""
    if STATE.status_message:
        status_markup = (
            f'<div class="status {html.escape(STATE.status_level)}">'
            f"{html.escape(STATE.status_message)}</div>"
        )

    running_markup = "Running" if running else "Stopped"
    running_class = "success" if running else "warning"
    latest_logs = "\n".join(html.escape(line) for line in current_logs())
    access_url = get_access_url()

    server_target_body = f"""
    <form method="post" action="/select-server" class="server-picker">
      <label class="field">
        <span>Server Folder</span>
        <input name="server_dir" value="{html.escape(str(server_dir))}" />
      </label>
      <label class="field">
        <span>Server Name</span>
        <input name="server_name" value="{html.escape(server_name)}" />
      </label>
      <button type="submit">Load Server</button>
    </form>
    """

    server_process_body = f"""
    <form method="post" action="/save-launch">
      <label class="field">
        <span>Launch Command</span>
        <input name="launch_command" value="{html.escape(STATE.launch_command)}" placeholder="StartServer64.bat -servername servertest" />
      </label>
      <label class="field">
        <span>Launch Working Directory</span>
        <input name="launch_workdir" value="{html.escape(str(STATE.launch_workdir))}" />
      </label>
      <button type="submit">Save Launch Settings</button>
    </form>
    <div class="button-row">
      <form method="post" action="/start-server">
        <button type="submit">Start Server</button>
      </form>
      <form method="post" action="/stop-server">
        <button type="submit" class="secondary">Stop Server</button>
      </form>
    </div>
    """

    live_console_body = f"""
    <form method="post" action="/send-command" class="console-command-form">
      <label class="field">
        <span>Send Console Command</span>
        <input name="console_command" placeholder="save, quit, help, players, etc." />
      </label>
      <button type="submit">Send Command</button>
    </form>
    <pre id="log-console" class="log-console">{latest_logs}</pre>
    """

    common_settings_body = f"""
    <form method="post" action="/save-common">
      <input type="hidden" name="server_dir" value="{html.escape(str(server_dir))}" />
      <input type="hidden" name="server_name" value="{html.escape(server_name)}" />
      <label class="field jump-field">
        <span>Jump To Setting</span>
        <select onchange="if (this.value) window.location.hash = this.value;">
          <option value="">Choose a server setting</option>
          {''.join(ini_jump_options)}
        </select>
      </label>
      <div class="grid ini-grid">
        {''.join(ini_form) if ini_form else '<p class="muted-copy">No `.ini` file found yet for this server.</p>'}
      </div>
      {('<button type="submit">Save Server Settings</button>' if ini_form else '')}
    </form>
    """

    mods_body = f"""
    <form method="post" action="/save-mods">
      <input type="hidden" name="server_dir" value="{html.escape(str(server_dir))}" />
      <input type="hidden" name="server_name" value="{html.escape(server_name)}" />
      {mods_section_markup if mods_section_markup else '<p class="muted-copy">No Mods or WorkshopItems setting found in this `.ini` file.</p>'}
      {('<button type="submit">Save Mods And Workshop Items</button>' if mods_section_markup else '')}
    </form>
    """

    if sandbox_document.parse_error:
        sandbox_body = f"""
        <form method="post" action="/save-sandbox-raw">
          <input type="hidden" name="server_dir" value="{html.escape(str(server_dir))}" />
          <input type="hidden" name="server_name" value="{html.escape(server_name)}" />
          <div class="status warning">SandboxVars parser fallback: {html.escape(sandbox_document.parse_error)}</div>
          <label class="field">
            <span>Raw SandboxVars</span>
            <textarea name="sandbox_raw">{html.escape(sandbox_document.raw_text)}</textarea>
          </label>
          <button type="submit">Save Raw SandboxVars</button>
        </form>
        """
    else:
        sandbox_body = f"""
        <form method="post" action="/save-sandbox">
          <input type="hidden" name="server_dir" value="{html.escape(str(server_dir))}" />
          <input type="hidden" name="server_name" value="{html.escape(server_name)}" />
          <label class="field jump-field">
            <span>Jump To Sandbox Setting</span>
            <select onchange="if (this.value) window.location.hash = this.value;">
              <option value="">Choose a sandbox setting</option>
              {''.join(sandbox_jump_options)}
            </select>
          </label>
          {''.join(sandbox_form) if sandbox_form else '<p class="muted-copy">No SandboxVars file found yet. Load a server with an existing file or save one first.</p>'}
          {('<button type="submit">Save SandboxVars</button>' if sandbox_form else '')}
        </form>
        """

    advanced_body = f"""
    <form method="post" action="/save-advanced">
      <input type="hidden" name="server_dir" value="{html.escape(str(server_dir))}" />
      <input type="hidden" name="server_name" value="{html.escape(server_name)}" />
      {''.join(advanced_form)}
      <button type="submit">Save Advanced Files</button>
    </form>
    """

    maintenance_body = f"""
    <form method="post" action="/reset-map" class="danger-form">
      <p class="setting-help">This deletes everything inside <strong>{html.escape(str(DEFAULT_SAVES_DIR))}</strong>.</p>
      <p class="setting-help">Type <strong>RESET</strong> exactly, then click the button.</p>
      <label class="field danger-field">
        <span>Confirmation</span>
        <input name="reset_confirmation" placeholder="RESET" />
      </label>
      <button type="submit" class="danger-button">Reset Map</button>
    </form>
    """

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PZ Server Manager</title>
  <link rel="stylesheet" href="/static/style.css" />
</head>
<body>
  <main class="layout">
    <section class="hero">
      <div>
        <p class="eyebrow">Project Zomboid</p>
        <h1>Server Manager</h1>
        <p class="subhead">Edit your dedicated server from a browser instead of bouncing between config files.</p>
      </div>
      <div class="hero-card">
        <p>Network address</p>
        <strong>{html.escape(access_url)}</strong>
      </div>
    </section>

    {status_markup}

    {render_dropdown_panel("Server Target", f"{server_dir} | {server_name}", server_target_body, open_by_default=True, panel_key="server-target")}
    {render_dropdown_panel("Server Process", "Launch your dedicated server and control it from the browser.", server_process_body, extra_badge=f'<span class="pill {running_class}">{html.escape(running_markup)}{f" | PID {STATE.server_pid}" if running and STATE.server_pid else ""}</span>', panel_key="server-process")}
    {render_dropdown_panel("Live Console", "Streams stdout and stderr from the server process started by this manager.", live_console_body, panel_key="live-console")}
    {render_dropdown_panel("Common Settings", str(ini_path(server_dir, server_name)), common_settings_body, panel_key="common-settings")}
    {render_dropdown_panel("Mods And Workshop Items", "Pair mods, manager-only names, Workshop IDs, and quick links.", mods_body, panel_key="mods-workshop")}
    {render_dropdown_panel("SandboxVars", str(sandbox_path), sandbox_body, panel_key="sandboxvars")}
    {render_dropdown_panel("Advanced Files", "Raw editors for the remaining Lua-based files.", advanced_body, panel_key="advanced-files")}
    {render_dropdown_panel("Maintenance", "Danger zone actions for save data.", maintenance_body, panel_key="maintenance")}
  </main>
  <script>
    const panelStateKey = 'pz-manager-panel-state';

    function loadPanelState() {{
      try {{
        return JSON.parse(localStorage.getItem(panelStateKey) || '{{}}');
      }} catch (_error) {{
        return {{}};
      }}
    }}

    function savePanelState(state) {{
      localStorage.setItem(panelStateKey, JSON.stringify(state));
    }}

    function wirePanelState() {{
      const state = loadPanelState();
      document.querySelectorAll('.dropdown-panel[data-panel-key]').forEach((panel) => {{
        const key = panel.dataset.panelKey;
        if (Object.prototype.hasOwnProperty.call(state, key)) {{
          panel.open = Boolean(state[key]);
        }}
        panel.addEventListener('toggle', () => {{
          const nextState = loadPanelState();
          nextState[key] = panel.open;
          savePanelState(nextState);
        }});
      }});
    }}

    function addPairRow(button) {{
      const editor = button.closest('.field, .list-field, .ini-field').querySelector('.list-editor');
      const row = document.createElement('div');
      row.className = 'paired-row';
      row.innerHTML = `<input name="ini_pair_mods" value="" placeholder="Mod folder name" /><input name="mod_display_name" value="" placeholder="Display name in manager only" /><input name="ini_pair_workshop" value="" placeholder="Workshop ID" /><div class="workshop-link-wrap"></div><div class="row-actions"><button type="button" class="row-button secondary" onclick="moveListRow(this, -1)">Up</button><button type="button" class="row-button secondary" onclick="moveListRow(this, 1)">Down</button><button type="button" class="row-button secondary" onclick="removeListRow(this)">Remove</button></div>`;
      editor.appendChild(row);
    }}

    function moveListRow(button, direction) {{
      const row = button.closest('.paired-row');
      const editor = row.parentElement;
      if (direction < 0) {{
        const prev = row.previousElementSibling;
        if (prev) {{
          editor.insertBefore(row, prev);
        }}
        return;
      }}
      const next = row.nextElementSibling;
      if (next) {{
        editor.insertBefore(next, row);
      }}
    }}

    function removeListRow(button) {{
      const editor = button.closest('.list-editor');
      const rows = editor.querySelectorAll('.paired-row');
      if (rows.length <= 1) {{
        rows[0].querySelectorAll('input').forEach((input) => input.value = '');
        return;
      }}
      button.closest('.paired-row').remove();
    }}

    async function refreshLogs() {{
      const response = await fetch('/logs', {{ cache: 'no-store' }});
      if (!response.ok) return;
      const payload = await response.json();
      const consoleEl = document.getElementById('log-console');
      consoleEl.textContent = payload.lines.join('\\n');
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }}
    wirePanelState();
    refreshLogs();
    setInterval(refreshLogs, 1500);
  </script>
</body>
</html>
"""
