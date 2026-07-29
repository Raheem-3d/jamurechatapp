
// main.js (defensive, debug-friendly)
const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  Tray,
  Menu,
  dialog,
  clipboard,
  nativeImage,
  net,
  screen,
  shell
} = require("electron");

const path = require("path");
const fs = require("fs");
let autoUpdater = null;
try {
  autoUpdater = require("electron-updater").autoUpdater;
} catch (e) {
  console.warn("Could not load electron-updater module:", e && e.message ? e.message : e);
}

let mainWindow;
let tray = null;
let bounceId = null;
let isQuitting = false;
let splash = null; // ensure splash is declared
let updateInterval = null;
let lastLoadUrl = "http://10.0.4.106:3000"; // Track last attempted URL

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function createErrorPage(url, errorCode, errorDescription) {
  const targetUrl = url || lastLoadUrl || "http://localhost:3000";
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Server Disconnected - JamureChat</title>
        <style>
          * { box-sizing: border-box; }
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #0b141a;
            color: #e9edef;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          .card {
            background: #111b21;
            border: 1px solid #2a3942;
            border-radius: 16px;
            padding: 40px 32px;
            max-width: 460px;
            width: 90%;
            text-align: center;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .icon-container {
            width: 72px;
            height: 72px;
            background: rgba(234, 67, 53, 0.15);
            border: 1px solid rgba(234, 67, 53, 0.3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
          }
          .icon {
            font-size: 36px;
            line-height: 1;
          }
          h1 {
            margin: 0 0 10px 0;
            font-size: 22px;
            font-weight: 600;
            color: #e9edef;
          }
          p {
            margin: 0 0 20px 0;
            font-size: 14px;
            line-height: 1.5;
            color: #8696a0;
          }
          .info-box {
            background: #202c33;
            border-radius: 8px;
            padding: 12px;
            width: 100%;
            margin-bottom: 24px;
            font-family: monospace;
            font-size: 12px;
            color: #00a884;
            word-break: break-all;
            text-align: left;
          }
          .info-label {
            color: #8696a0;
            font-size: 11px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }
          .btn {
            width: 100%;
            padding: 13px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .btn-primary {
            background: #00a884;
            color: #ffffff;
          }
          .btn-primary:hover {
            background: #008c71;
          }
          .btn-primary:active {
            transform: scale(0.98);
          }
          .btn.loading {
            opacity: 0.7;
            pointer-events: none;
          }
          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
          }
          .btn.loading .spinner {
            display: block;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .auto-retry {
            font-size: 12px;
            color: #8696a0;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-container">
            <span class="icon">🔌</span>
          </div>
          <h1>Server Offline</h1>
          <p>Unable to connect to JamureChat server. The server might be restarting or offline.</p>
          
          <div class="info-box">
            <div class="info-label">Server Endpoint</div>
            <div>${targetUrl}</div>
            ${errorCode ? `<div style="margin-top:4px;color:#f87171;">Status: ${errorCode} ${errorDescription ? '(' + errorDescription + ')' : ''}</div>` : ''}
          </div>

          <div class="actions">
            <button id="retryBtn" class="btn btn-primary" onclick="retryConnection()">
              <div class="spinner"></div>
              <span id="btnText">🔄 Refresh & Retry</span>
            </button>
          </div>

          <div class="auto-retry" id="autoRetryText">Auto-retrying in <span id="countdown">10</span>s...</div>
        </div>

        <script>
          let countdownSec = 10;
          let timer = null;

          function retryConnection() {
            if (timer) clearInterval(timer);
            const btn = document.getElementById('retryBtn');
            const btnText = document.getElementById('btnText');
            if (btn) btn.classList.add('loading');
            if (btnText) btnText.textContent = 'Connecting...';

            try {
              if (window.electronAPI && typeof window.electronAPI.refreshApp === 'function') {
                window.electronAPI.refreshApp('${targetUrl}');
              } else if (window.electron && window.electron.ipcRenderer) {
                window.electron.ipcRenderer.send('error-page:refresh', { url: '${targetUrl}' });
              }
            } catch (e) { console.error(e); }

            setTimeout(() => {
              window.location.href = '${targetUrl}';
            }, 300);
          }

          function startCountdown() {
            const cdEl = document.getElementById('countdown');
            timer = setInterval(() => {
              countdownSec--;
              if (cdEl) cdEl.textContent = countdownSec;
              if (countdownSec <= 0) {
                clearInterval(timer);
                retryConnection();
              }
            }, 1000);
          }

          startCountdown();
        </script>
      </body>
    </html>
  `;
}


app.on("before-quit", async () => {
  try {
    const cookies = await session.defaultSession.cookies.get({});
    console.log("COOKIES BEFORE QUIT:", cookies);
  } catch (e) {
    console.error(e);
  }
});

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err && err.stack ? err.stack : err);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

// Ensure a single running instance; focus existing on second launch
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv, workingDirectory) => {
    // Someone tried to run a second instance, focus/restore existing window
    showMainWindow();
  });
}

function createSplash() {
  // Small frameless splash with a simple CSS spinner (data URL so no extra file)
  const splashHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Loading…</title>
        <style>
          html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center;background:#fff;font-family:system-ui;}
          .box{display:flex;flex-direction:column;align-items:center;gap:12px}
          .spinner{
            width:56px;height:56px;border-radius:50%;border:6px solid rgba(0,0,0,0.08);border-top-color:rgba(0,0,0,0.6);
            animation:spin 1s linear infinite;
          }
          @keyframes spin{to{transform:rotate(360deg)}}
          .text{font-size:13px;color:#333}
        </style>
      </head>
      <body>
        <div class="box">
          <div class="spinner" aria-hidden="true"></div>
          <div class="text">Loading application…</div>
        </div>
      </body>
    </html>
  `;
  splash = new BrowserWindow({
    width: 360,
    height: 220,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    center: true,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splash.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(splashHtml)
  );
}

function createWindow() {
  try {
    // first show splash
    createSplash();

    const preloadPath = path.join(__dirname, "preload.js");
    if (!fs.existsSync(preloadPath)) {
      console.warn(
        "preload.js not found at",
        preloadPath,
        "renderer preload will not be available"
      );
    }

    // create main window but keep it hidden (show: false)
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // important: hidden until loaded
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: false,
        partition: "persist:jamure",
      },
    });

    // Log cookies and localStorage after load (same as yours)
    mainWindow.webContents.on("did-finish-load", async () => {
      try {
        const cookies = await session
          .fromPartition("persist:jamure")
          .cookies.get({});
        console.log("cookies after load:", cookies);
        const ls = await mainWindow.webContents.executeJavaScript(
          "JSON.stringify(localStorage)"
        );
        console.log("localStorage after load:", ls);
      } catch (e) {
        console.error(e);
      }

      // Close splash and show main window
      try {
        if (splash && !splash.isDestroyed()) {
          splash.close();
          splash = null;
        }
      } catch (err) {
        console.warn("could not close splash:", err);
      }

      // now show the main window
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    });

    // handle failed loads (network error etc)
    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        console.error(
          "did-fail-load:",
          errorCode,
          errorDescription,
          validatedURL,
          isMainFrame
        );

        // Only show error page for main frame
        if (isMainFrame) {
          const errorHtml = createErrorPage(validatedURL, errorCode, errorDescription);
          mainWindow.webContents.loadURL(
            "data:text/html;charset=utf-8," + encodeURIComponent(errorHtml)
          );
        }

        // Close splash if it's still open
        try {
          if (splash && !splash.isDestroyed()) {
            splash.close();
            splash = null;
          }
        } catch (err) {
          console.warn("could not close splash:", err);
        }

        // Show main window so user can see the error
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
          mainWindow.show();
        }
      }
    );

    // optional: open devtools in dev mode
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }

    const urlToLoad = "http://10.0.4.106:3000";
    lastLoadUrl = urlToLoad; // Track the URL
    console.log("loading URL:", urlToLoad);
    mainWindow.loadURL(urlToLoad).catch((err) => {
      console.error("loadURL rejected:", err);
      // Show error page instead of blank screen
      const errorHtml = createErrorPage(urlToLoad, "NETWORK_ERROR", err.message);
      mainWindow.webContents.loadURL(
        "data:text/html;charset=utf-8," + encodeURIComponent(errorHtml)
      );
      // Close splash
      if (splash && !splash.isDestroyed()) {
        splash.close();
        splash = null;
      }
      // show window so user can see the error
      if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
    });

    // Window focus/blur handlers
    mainWindow.on("focus", () => {
      console.log("mainWindow focused");
      stopAttention();
    });

    mainWindow.on("blur", () => {
      console.log("mainWindow blurred");
    });

    // Prefer normal minimize (keep in taskbar). If you want close-to-tray only, keep close handler below.
    mainWindow.on("minimize", () => {
      try {
        // Ensure it remains in the taskbar
        mainWindow.setSkipTaskbar(false);
      } catch (err) {
        console.warn("minimize handler error:", err);
      }
    });

    // Close-to-tray: comment out to actually quit on close, or keep to hide-to-tray
    mainWindow.on("close", (e) => {
      if (!isQuitting) {
        e.preventDefault();
        try {
          // Keep visible in taskbar instead of hiding completely
          mainWindow.minimize();
          mainWindow.setSkipTaskbar(false);
        } catch (err) {
          console.warn("close handler error:", err);
        }
      }
    });

    mainWindow.on("closed", () => {
      console.log("mainWindow closed");
      mainWindow = null;
    });
  } catch (e) {
    console.error("createWindow failed:", e && e.stack ? e.stack : e);
    if (splash && !splash.isDestroyed()) {
      splash.close();
      splash = null;
    }
  }
}

function createTray() {
  log("createTray called");
  try {
    const iconPath = path.join(__dirname, "public", "Desktopicon.ico");

    if (!fs.existsSync(iconPath)) {
      console.warn(
        "Tray icon not found at",
        iconPath,
        "- skipping tray creation to avoid crashes"
      );
      return;
    }

    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      { label: "Open App", click: () => showMainWindow() },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setToolTip("Jamure App");
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => showMainWindow());
    tray.on("click", () => showMainWindow());
  } catch (e) {
    // don't let tray errors kill the app
    console.error(
      "createTray failed (continuing without tray):",
      e && e.stack ? e.stack : e
    );
  }
}

function showMainWindow() {
  log("showMainWindow called");
  try {
    if (!mainWindow) {
      createWindow(true);
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();

      // Enable resizing again when returning to normal mode
      mainWindow.setResizable(true);
      mainWindow.setMaximizable(true);

      // Restore to original size (not buzz size)
      mainWindow.setSize(1200, 800, true);
      mainWindow.center(); // Optional: center the window

      // Reset minimum size
      mainWindow.setMinimumSize(400, 300);

      // Ensure it appears in the taskbar again
      try { mainWindow.setSkipTaskbar(false); } catch { }
      mainWindow.focus();
    }
    stopAttention();
  } catch (e) {
    console.error("showMainWindow error:", e && e.stack ? e.stack : e);
  }
}
// Restore or show and optionally flash if not focused
function restoreOrRevealWindow() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    try { mainWindow.setSkipTaskbar(false); } catch { }
  } catch (e) {
    console.warn("restoreOrRevealWindow error", e);
  }
}

function startAttention() {
  log("startAttention");
  if (process.platform === "darwin") {
    try {
      bounceId = app.dock && app.dock.bounce && app.dock.bounce();
    } catch (e) {
      console.warn("dock.bounce failed", e);
    }
  } else {
    if (mainWindow) {
      try {
        mainWindow.flashFrame(true);
      } catch (e) {
        console.warn(e);
      }
    } else {
      createWindow(false);
      if (mainWindow) {
        try {
          mainWindow.flashFrame(true);
        } catch (e) {
          console.warn(e);
        }
      }
    }
  }
}

function stopAttention() {
  log("stopAttention");
  if (process.platform === "darwin") {
    try {
      if (bounceId !== null) {
        app.dock.cancelBounce(bounceId);
        bounceId = null;
      }
    } catch (e) {
      console.warn(e);
    }
  } else {
    if (mainWindow) {
      try {
        mainWindow.flashFrame(false);
      } catch (e) {
        console.warn(e);
      }
    }
  }
}

ipcMain.on("show-notification", (event, { title, body, icon, senderName, messagePreview, messageId, channelId, userId }) => {
  log("ipc show-notification", title, "from", senderName);

  // Build notification title and body
  const notifTitle = senderName ? `New message from ${senderName}` : (title || "New Message");
  const notifBody = messagePreview || body || "";

  const notif = new Notification({
    title: notifTitle,
    body: notifBody,
    icon: icon || path.join(__dirname, "public", "Desktopicon.ico"),
    badge: path.join(__dirname, "public", "Desktopicon.ico"),
    requireInteraction: true, // Keep notification persistent
    tag: messageId || "message", // Group notifications by message ID
  });

  notif.on("click", () => {
    showMainWindow();
    // Navigate to the appropriate conversation
    if (mainWindow && mainWindow.webContents) {
      if (channelId) {
        mainWindow.webContents.send("navigate-to", `/dashboard/channels/${channelId}`);
      } else if (userId) {
        mainWindow.webContents.send("navigate-to", `/dashboard/messages/${userId}`);
      }
    }
  });

  notif.show();

  const needsAttention = !mainWindow || !mainWindow.isVisible() || !mainWindow.isFocused();
  if (needsAttention) startAttention();
});

// Show a simple notification for buzz
function showBuzzNotification({ title, body, icon, userId, channelId } = {}) {
  try {
    const notif = new Notification({
      title: title || "Buzz!",
      body: body || "You have a new message",
      icon: icon || path.join(__dirname, "public", "Desktopicon.ico"),
    });

    notif.on("click", () => {
      showMainWindow();
      // Send IPC to show overlay when notification is clicked
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('buzz:show-overlay', {
          userId: userId || null,
          channelId: channelId || null,
          title: title || 'Chat',
          width: 380,
          height: 600,
          margin: 20
        });
      }
    });

    notif.show();
  } catch (e) {
    console.error("showBuzzNotification error:", e);
  }
}



function showBuzzChatOverlay({ userId, channelId, title, messageType, id } = {}) {
  try {
    // Get screen dimensions for positioning
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    const chatWidth = 600;
    const chatHeight = 900;
    const margin = 40;

    // Calculate position for bottom-right corner
    const x = screenWidth - chatWidth - margin;
    const y = screenHeight - chatHeight - margin;

    // Store current window state for restoration later
    let wasMaximized = false;
    let previousBounds = null;

    // Build origin dynamically from current URL or fallback
    let baseOrigin = "http://localhost:3000";
    if (mainWindow && mainWindow.webContents) {
      try {
        const curUrl = mainWindow.webContents.getURL();
        if (curUrl && curUrl.startsWith("http")) {
          baseOrigin = new URL(curUrl).origin;
        } else if (lastLoadUrl && lastLoadUrl.startsWith("http")) {
          baseOrigin = new URL(lastLoadUrl).origin;
        }
      } catch { }
    } else if (lastLoadUrl && lastLoadUrl.startsWith("http")) {
      try { baseOrigin = new URL(lastLoadUrl).origin; } catch { }
    }

    let buzzUrl = baseOrigin;

    // Debug: log all parameters
    console.log("Buzz parameters:", { userId, channelId, title, messageType, id });

    // Priority: 1. Explicit channelId, 2. Explicit userId, 3. Generic id with type detection
    if (channelId) {
      // Channel message - use channels endpoint
      buzzUrl += `/dashboard/channels/${channelId}`;
      console.log("Using channelId for URL:", channelId);
    } else if (userId) {
      // Direct message - use messages endpoint
      buzzUrl += `/dashboard/messages/${userId}`;
      console.log("Using userId for URL:", userId);
    } else if (id) {
      // If only id is provided, try to detect type
      // You can add logic here to detect if id is a channel or user ID
      // For example, based on prefix or pattern
      if (id.startsWith('ch_') || id.includes('channel') || messageType === 'channel') {
        buzzUrl += `/dashboard/channels/${id}`;
        console.log("Detected channel from id:", id);
      } else {
        buzzUrl += `/dashboard/messages/${id}`;
        console.log("Detected user from id:", id);
      }
    } else {
      // Default to dashboard if no specific ID
      buzzUrl += "/dashboard";
      console.log("No ID provided, using dashboard");
    }

    // Add popup parameter for the renderer to know it's a buzz overlay
    buzzUrl += "?popup=true&buzz=true";

    console.log("Loading buzz URL:", buzzUrl);

    // Ensure main window exists
    if (!mainWindow || mainWindow.isDestroyed()) {
      // Create new window with fixed size
      mainWindow = new BrowserWindow({
        width: chatWidth,
        height: chatHeight,
        x: x,
        y: y,
        show: false,
        resizable: true, // Allow resizing
        minimizable: true,
        maximizable: true, // Allow maximizing
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, "preload.js"),
          webSecurity: false,
          partition: "persist:jamure",
        },
      });

      // Load the appropriate URL
      mainWindow.loadURL(buzzUrl).catch((err) => {
        console.error("Buzz loadURL rejected:", err);
        // Show error page instead of blank screen
        const errorHtml = createErrorPage(buzzUrl, 'NETWORK_ERROR', err.message);
        mainWindow.webContents.loadURL(
          'data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml)
        );
      });

      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // Send overlay data after window is ready
        setTimeout(() => {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('buzz:show-overlay', {
              userId: userId || null,
              channelId: channelId || null,
              title: title || 'Chat',
              width: chatWidth,
              height: chatHeight,
              margin: margin,
              position: 'bottom-right',
              url: buzzUrl
            });
            mainWindow.webContents.send('play-buzz-sound');
          }
        }, 500);
      });
    } else {
      // Save current state before modifying
      wasMaximized = mainWindow.isMaximized();
      previousBounds = mainWindow.getBounds();

      // Store previous URL for navigation back
      if (!mainWindow.previousBuzzState) {
        mainWindow.previousBuzzState = {
          wasMaximized: wasMaximized,
          bounds: previousBounds,
          currentUrl: mainWindow.webContents.getURL() || 'http://10.0.4.106:3000'
        };
      }

      // If maximized, restore to normal first
      if (wasMaximized) {
        mainWindow.unmaximize();
        // Small delay to ensure window is restored
        setTimeout(() => {
          setBuzzSizeAndPosition(x, y, chatWidth, chatHeight);
          // Load the appropriate URL
          mainWindow.loadURL(buzzUrl).catch((err) => {
            console.error("Buzz loadURL rejected:", err);
            // Show error page instead of blank screen
            const errorHtml = createErrorPage(buzzUrl, 'NETWORK_ERROR', err.message);
            mainWindow.webContents.loadURL(
              'data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml)
            );
          });
        }, 50);
      } else {
        setBuzzSizeAndPosition(x, y, chatWidth, chatHeight);
        // Load the appropriate URL
        mainWindow.loadURL(buzzUrl).catch((err) => {
          console.error("Buzz loadURL rejected:", err);
          // Show error page instead of blank screen
          const errorHtml = createErrorPage(buzzUrl, 'NETWORK_ERROR', err.message);
          mainWindow.webContents.loadURL(
            'data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml)
          );
        });
      }

      console.log(`Buzz window resized to: ${chatWidth}x${chatHeight} at position: ${x},${y}, wasMaximized: ${wasMaximized}, URL: ${buzzUrl}`);

      // Send IPC to renderer to show the overlay
      if (mainWindow && mainWindow.webContents) {
        // Small delay to ensure window is properly resized and page loaded
        setTimeout(() => {
          mainWindow.webContents.send('buzz:show-overlay', {
            userId: userId || null,
            channelId: channelId || null,
            title: title || 'Chat',
            width: chatWidth,
            height: chatHeight,
            margin: margin,
            position: 'bottom-right',
            mode: 'buzz-chat',
            url: buzzUrl
          });

          // Also send play sound command
          mainWindow.webContents.send('play-buzz-sound');
        }, wasMaximized ? 300 : 200);
      }
    }

    // Request attention
    startAttention();

  } catch (err) {
    console.error('showBuzzChatOverlay error:', err);
  }
}


function setBuzzSizeAndPosition(x, y, width, height) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Show window if hidden
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  // Restore if minimized
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  // Step-by-step approach
  // 1. First set position
  mainWindow.setPosition(x, y);

  // 2. Then set size with animation
  mainWindow.setSize(width, height, true);

  // 3. Enable resizing for buzz mode (user can resize if they want)
  mainWindow.setResizable(true);

  // 4. Enable maximize button
  mainWindow.setMaximizable(true);

  // 5. Set minimum size to prevent it from being too small
  mainWindow.setMinimumSize(width, height);

  // 6. Focus the window
  mainWindow.focus();
}

// Update exitBuzzMode function to handle URL navigation back
function exitBuzzMode(restorePreviousState = true, navigateToPrevious = true) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Reset minimum size
      mainWindow.setMinimumSize(400, 300);

      // If we have stored previous state, restore it
      if (restorePreviousState && mainWindow.previousBuzzState) {
        const { wasMaximized, bounds, currentUrl } = mainWindow.previousBuzzState;

        // Restore to previous bounds
        mainWindow.setBounds(bounds);

        // Navigate back to previous URL if requested
        if (navigateToPrevious && currentUrl) {
          setTimeout(() => {
            mainWindow.loadURL(currentUrl).catch((err) => {
              console.error("Failed to load previous URL:", err);
              const fallbackOrigin = lastLoadUrl ? new URL(lastLoadUrl).origin : 'http://localhost:3000';
              mainWindow.loadURL(`${fallbackOrigin}/dashboard`);
            });
          }, 100);
        }

        // Maximize if it was maximized before
        if (wasMaximized) {
          setTimeout(() => {
            mainWindow.maximize();
          }, 150);
        }

        // Clear stored state
        delete mainWindow.previousBuzzState;
      } else {
        // Default restore to original size and dashboard
        mainWindow.setSize(1200, 800, true);
        mainWindow.center();

        // Navigate to dashboard
        setTimeout(() => {
          const fallbackOrigin = lastLoadUrl ? new URL(lastLoadUrl).origin : 'http://localhost:3000';
          mainWindow.loadURL(`${fallbackOrigin}/dashboard`);
        }, 100);
      }

      // Ensure window is visible
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }

      mainWindow.focus();
    }
  } catch (e) {
    console.error('exitBuzzMode error:', e);
  }
}


// Unified buzz handler: show embedded overlay in main window
function handleBuzz(payload = {}) {
  try {
    const userId = payload.userId || payload.fromUserId;
    const channelId = payload.channelId;
    const title = payload.title || (payload.senderName ? `🚨 Buzz from ${payload.senderName}` : "🚨 Buzz Alert!");
    const body = payload.body || payload.message || "You have an important message.";
    const icon = payload.icon;

    log("🚨 handleBuzz received on main:", { userId, channelId, title, body });

    // 1. Restore & Show main window if hidden or minimized
    showMainWindow();

    // 2. Bring window to top of all open apps temporarily
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(false);
          }
        }, 3500);
      } catch (e) { }
    }

    // 3. Request attention & flash taskbar
    startAttention();

    // 4. Send buzz popup payload to renderer process
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("buzz:popup", { userId, channelId, title, message: body, senderName: payload.senderName });
      mainWindow.webContents.send("play-buzz-sound");
    }

    // 5. Show native OS Notification
    showBuzzNotification({ title, body, icon, userId, channelId });
  } catch (e) {
    console.error("handleBuzz error", e);
  }
}




// Allow buzz from renderer
ipcMain.on("buzz", (event, payload) => handleBuzz(payload || {}));

// Allow buzz from the app (e.g., background timers, sockets in main)
app.on("buzz", (payload) => handleBuzz(payload || {}));

function enableAutoLaunch() {
  log(
    "enableAutoLaunch called, packaged=",
    app.isPackaged,
    "execPath=",
    process.execPath
  );
  try {
    if (!app.isPackaged) {
      console.warn(
        "Skipping auto-launch in dev mode to avoid starting electron.exe at login."
      );
      return;
    }

    if (process.platform === "win32") {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: ["--background-start"],
      });
    } else {
      app.setLoginItemSettings({ openAtLogin: true });
    }
  } catch (e) {
    console.warn("enableAutoLaunch failed", e);
  }
}

ipcMain.handle("copy-text", (event, text) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("copy-image", async (event, imageUrl) => {
  try {
    // Handle file:// URLs
    if (imageUrl.startsWith("file://")) {
      const image = nativeImage.createFromPath(imageUrl.replace("file://", ""));
      if (!image.isEmpty()) {
        clipboard.writeImage(image);
        return { success: true };
      }
    }

    // Handle http/https URLs and base64
    if (imageUrl.startsWith("http") || imageUrl.startsWith("data:")) {
      const response = await net.fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const image = nativeImage.createFromBuffer(Buffer.from(buffer));

      if (!image.isEmpty()) {
        clipboard.writeImage(image);
        return { success: true };
      }
    }

    return { success: false, error: "Invalid image format" };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  log("app.whenReady start");
  const startedInBackground = process.argv.includes("--background-start");

  // On Windows, set AppUserModelId so notifications display with app identity
  if (process.platform === "win32") {
    try { app.setAppUserModelId("com.jamure.chatapp"); } catch { }
  }

  // create window and tray
  createWindow(startedInBackground ? false : true);
  createTray();
  enableAutoLaunch();

  if (!startedInBackground) {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
  }

  // --------- AUTO-UPDATER START ---------
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (!isDev && autoUpdater) {
    // Only run auto-update in production
    try {
      autoUpdater.autoDownload = true; // Auto-download updates seamlessly in background
      autoUpdater.autoInstallOnAppQuit = true;

      // Forward updater events to renderer for optional UI
      const sendToRenderer = (channel, payload) => {
        try {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send(channel, payload);
          }
        } catch { }
      };

      autoUpdater.on("checking-for-update", () => {
        log("Updater: checking-for-update");
        sendToRenderer("updater:checking", {});
      });
      autoUpdater.on("update-available", (info) => {
        log("Updater: update-available", info && info.version);
        sendToRenderer("updater:available", info);
      });
      autoUpdater.on("update-not-available", (info) => {
        log("Updater: update-not-available");
        sendToRenderer("updater:not-available", info);
      });
      autoUpdater.on("download-progress", (progress) => {
        sendToRenderer("updater:download-progress", progress);
      });
      autoUpdater.on("update-downloaded", (info) => {
        log("Updater: update-downloaded", info && info.version);
        sendToRenderer("updater:downloaded", info);
        const result = dialog.showMessageBoxSync(mainWindow, {
          type: "info",
          buttons: ["Install & Restart", "Later"],
          title: "Update Ready",
          message: `Version ${info.version} downloaded. Install now?`,
        });
        if (result === 0) autoUpdater.quitAndInstall();
      });
      autoUpdater.on("error", (err) => {
        log("Updater: error", err);
        sendToRenderer("updater:error", { message: String(err) });
      });

      // Initial check on startup
      autoUpdater.checkForUpdates();

      // Periodic checks (every 4 hours)
      updateInterval = setInterval(() => {
        try { autoUpdater.checkForUpdates(); } catch { }
      }, 4 * 60 * 60 * 1000);
    } catch (e) {
      log("Auto-updater setup failed:", e);
    }
  }
  // --------- AUTO-UPDATER END ---------

  // Attach will-download after ready (safer)
  try {
    session.defaultSession.on("will-download", (event, item, webContents) => {
      try {
        const url = item.getURL();
        const filename = item.getFilename();
        log("will-download", { url, filename });

        const savePath = path.join(app.getPath("downloads"), filename);
        item.setSavePath(savePath);

        try {
          webContents.send("download-started", { filename, url, savePath });
        } catch (e) { }

        item.on("updated", (e, state) => {
          if (state === "interrupted") {
            log("Download interrupted for", filename);
            try {
              webContents.send("download-progress", {
                filename,
                state: "interrupted",
              });
            } catch (e) { }
          } else if (state === "progressing") {
            if (item.isPaused()) {
              log("Download paused:", filename);
              try {
                webContents.send("download-progress", {
                  filename,
                  state: "paused",
                });
              } catch (e) { }
            } else {
              const received = item.getReceivedBytes();
              const total = item.getTotalBytes();
              try {
                webContents.send("download-progress", {
                  filename,
                  received,
                  total,
                });
              } catch (e) { }
            }
          }
        });

        item.once("done", (e, state) => {
          if (state === "completed") {
            log("Download completed:", savePath);
            try {
              webContents.send("download-done", {
                filename,
                savePath,
                success: true,
              });
            } catch (e) { }
          } else {
            log("Download failed:", state);
            try {
              webContents.send("download-done", {
                filename,
                savePath,
                success: false,
                state,
              });
            } catch (e) { }
          }
        });
      } catch (err) {
        console.error("Error in will-download handler", err);
      }
    });
  } catch (e) {
    console.error(
      "Failed to attach will-download:",
      e && e.stack ? e.stack : e
    );
  }

  log("app.whenReady done");
});

// simple ipc to trigger download
ipcMain.on("download-file", (event, { url, filename }) => {
  log("IPC download-file received", { url, filename });
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.downloadURL(url);
  } else {
    log("No mainWindow available to start download");
    try {
      event.sender.send("download-done", {
        filename,
        savePath: null,
        success: false,
        state: "no-main-window",
      });
    } catch (e) { }
  }
});

ipcMain.handle("save-blob", async (event, { name, bufferBase64 }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save file",
      defaultPath: path.join(app.getPath("downloads"), name || "file"),
    });
    if (canceled || !filePath) return { success: false, reason: "canceled" };

    const buffer = Buffer.from(bufferBase64, "base64");
    fs.writeFileSync(filePath, buffer);
    console.log("save-blob: wrote file to", filePath);
    return { success: true, filePath };
  } catch (err) {
    console.error("save-blob failed", err);
    return { success: false, error: String(err) };
  }
});

ipcMain.on("renderer-ready", () => {
  if (splash && !splash.isDestroyed()) splash.close();
  if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
});

app.on("activate", () => {
  log("app activate");
  if (!mainWindow) createWindow(true);
  else showMainWindow();
});

// Consolidate before-quit handler
app.on("before-quit", () => {
  log("before-quit");
  isQuitting = true;
});

app.on("window-all-closed", () => {
  log("window-all-closed, isQuitting=", isQuitting);
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});

// -------- IPC: Updater controls from renderer --------
ipcMain.handle("updater:check", async () => {
  try {
    if (!autoUpdater) return { ok: false, error: "Auto-updater not available" };
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle("updater:download", async () => {
  try {
    if (!autoUpdater) return { ok: false, error: "Auto-updater not available" };
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle("updater:install", async () => {
  try {
    if (!autoUpdater) return { ok: false, error: "Auto-updater not available" };
    // quitAndInstall will not return
    autoUpdater.quitAndInstall();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});


// Add this to your IPC handlers section
ipcMain.on('buzz:close-overlay', () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Enable resizing again
      mainWindow.setResizable(true);
      mainWindow.setMaximizable(true);

      // Restore to original size
      mainWindow.setSize(1200, 800, true);
      mainWindow.center();

      // Reset minimum size
      mainWindow.setMinimumSize(400, 300);
    }
  } catch (e) {
    console.error('buzz:close-overlay error:', e);
  }
});
ipcMain.handle('open-external-link', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle('open-path', async (event, targetPath) => {
  try {
    const path = require('path');
    let cleanPath = targetPath.trim();
    cleanPath = cleanPath.replace(/^["']|["']$/g, '');
    cleanPath = cleanPath.replace(/^file:\/\/\/?/i, '');
    cleanPath = decodeURIComponent(cleanPath);

    const normalized = path.normalize(cleanPath);
    console.log('📂 Opening folder path in Electron:', normalized);

    // 1. Try shell.openPath
    const err = await shell.openPath(normalized);
    if (!err) {
      return { success: true };
    }

    console.warn('shell.openPath error:', err, 'trying showItemInFolder');

    // 2. Try shell.showItemInFolder
    shell.showItemInFolder(normalized);
    return { success: true };
  } catch (error) {
    console.error('Failed to open path:', error);
    try {
      const fileUrl = `file:///${targetPath.replace(/^["']|["']$/g, '').replace(/^file:\/\/\/?/i, '').replace(/\\/g, '/')}`;
      await shell.openExternal(fileUrl);
      return { success: true };
    } catch (e) {
      return { success: false, error: error.message };
    }
  }
});

// Handle refresh from error page
ipcMain.on('error-page:refresh', (event, { url }) => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('Refreshing URL:', url || lastLoadUrl);
      const urlToLoad = url || lastLoadUrl || 'http://10.0.4.106:3000';
      lastLoadUrl = urlToLoad;
      mainWindow.loadURL(urlToLoad).catch((err) => {
        console.error('Refresh failed:', err);
        const errorHtml = createErrorPage(urlToLoad, 'NETWORK_ERROR', err.message);
        mainWindow.webContents.loadURL(
          'data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml)
        );
      });
    }
  } catch (e) {
    console.error('error-page:refresh handler error:', e);
  }
});

// Handle navigation from error page
ipcMain.on('error-page:navigate', (event, { url }) => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('Navigating to:', url);
      lastLoadUrl = url;
      mainWindow.loadURL(url).catch((err) => {
        console.error('Navigation failed:', err);
        const errorHtml = createErrorPage(url, 'NETWORK_ERROR', err.message);
        mainWindow.webContents.loadURL(
          'data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml)
        );
      });
    }
  } catch (e) {
    console.error('error-page:navigate handler error:', e);
  }
});