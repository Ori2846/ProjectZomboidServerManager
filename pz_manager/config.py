from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIST_DIR = PROJECT_ROOT / "site" / "my-app" / "dist"
DEFAULT_SERVER_DIR = Path.home() / "Zomboid" / "Server"
DEFAULT_ZOMBOID_DIR = Path.home() / "Zomboid"
DEFAULT_SAVES_DIR = DEFAULT_ZOMBOID_DIR / "Saves"
DEFAULT_DB_DIR = DEFAULT_ZOMBOID_DIR / "db"
DEFAULT_LAUNCH_DIR = Path(r"C:\pzserver")
DEFAULT_LAUNCH_COMMAND = str(DEFAULT_LAUNCH_DIR / "StartServer64.bat")
STEAM_APP_ID = "380870"
STATE_FILE = Path(".pz_manager_state.json")
LOG_FILE = Path(".pz_manager_server.log")
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
