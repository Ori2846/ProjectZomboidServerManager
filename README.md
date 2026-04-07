# Project Zomboid Server Manager

Local browser-based editor for a Project Zomboid dedicated server.

## Why Python

Python is a good fit here because the job is mostly:

- reading and writing the server config files
- exposing them through a local web UI
- running as a simple tool on the same machine as the server

You do not need a heavy stack for that. This version uses only Python's standard library, so it starts without extra packages.

## What It Does

- edits common values from `{server}.ini`
- renders the full `{server}.ini` as generated form fields
- uses `True`/`False` buttons for boolean `.ini` settings and text inputs for the rest
- shows `.ini` setting descriptions on hover when the file includes comment lines above a setting
- preserves `.ini` comments and field order when saving
- loads and edits `{server}_SandboxVars.lua` if it exists
- renders SandboxVars as form fields with `True`/`False` buttons for booleans and text inputs for the rest
- provides raw editors for:
  - `{server}_spawnregions.lua`
  - `{server}_spawnpoints.lua`
- starts and stops the dedicated server from the browser
- shows live console output for servers launched by this manager
- lets you point the app at a different `Zomboid\\Server` folder and server name

## Run It

```powershell
.\.venv\Scripts\python.exe .\main.py
```

Then open `http://127.0.0.1:8765`.

By default it looks in:

```text
%USERPROFILE%\Zomboid\Server
```

If your server files live somewhere else, change the folder in the UI and click `Load Server`.

## Start And Stop The Server

Set these in the UI:

- `Launch Command`: the command that starts your server
- `Launch Working Directory`: the folder where that command should run

Example:

```text
Launch Command: StartServer64.bat -servername servertest
Launch Working Directory: C:\ProjectZomboidServer
```

The app tracks the launched PID and uses `taskkill` to stop that server process tree from the Stop button.

## Live Logs

The site includes a live console panel that polls the manager and shows stdout/stderr from the server process.

- Logs appear when the server was started from this manager
- Existing servers started outside the manager do not have historical console output available here

## Notes

- The first save will create missing files.
- This is a local tool, not a public website.
- If you want the next step, the app can be extended to start/stop the server process, back up saves, or expose more settings as dedicated form controls.
