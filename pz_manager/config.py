import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_APP_DIR = PROJECT_ROOT / "site" / "my-app"
FRONTEND_DIST_DIR = FRONTEND_APP_DIR / "dist"
APP_STORAGE_DIR = Path(os.getenv("LOCALAPPDATA") or Path.home() / "AppData" / "Local") / "ProjectZomboidServerManager"
DEFAULT_SERVER_DIR = Path.home() / "Zomboid" / "Server"
DEFAULT_ZOMBOID_DIR = Path.home() / "Zomboid"
DEFAULT_SAVES_DIR = DEFAULT_ZOMBOID_DIR / "Saves"
DEFAULT_DB_DIR = DEFAULT_ZOMBOID_DIR / "db"
DEFAULT_LAUNCH_DIR = Path(r"C:\pzserver")
DEFAULT_LAUNCH_COMMAND = str(DEFAULT_LAUNCH_DIR / "StartServer64.bat")
STEAMCMD_DIR = PROJECT_ROOT / "tools" / "steamcmd"
STEAMCMD_EXE = STEAMCMD_DIR / "steamcmd.exe"
STEAMCMD_DOWNLOAD_URL = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip"
STEAM_APP_ID = "380870"
STATE_FILE = APP_STORAGE_DIR / ".pz_manager_state.json"
LOG_FILE = APP_STORAGE_DIR / ".pz_manager_server.log"
LEGACY_STATE_FILE = PROJECT_ROOT / ".pz_manager_state.json"
LEGACY_LOG_FILE = PROJECT_ROOT / ".pz_manager_server.log"
HOST = "0.0.0.0"
PORT = 8765

COMMON_FIELDS = [
    ("PublicName", "Server Name"),
    ("ServerWelcomeMessage", "Welcome Message"),
    ("MaxPlayers", "Max Players"),
    ("PauseEmpty", "Pause When Empty"),
    ("Open", "Open Server"),
    ("Public", "Public Listing"),
    ("PVP", "PVP Enabled"),
    ("DefaultPort", "Game Port"),
    ("UDPPort", "UDP Port"),
    ("HoursForLootRespawn", "Loot Respawn Hours"),
]

ADVANCED_FILES = [
    ("SandboxVars", "{server}_SandboxVars.lua"),
    ("SpawnRegions", "{server}_spawnregions.lua"),
    ("SpawnPoints", "{server}_spawnpoints.lua"),
]
