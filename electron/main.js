const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const isDev = !app.isPackaged;
const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;

let mainWindow;
let serverProcess;

function waitForServer(url, callback) {
  const retry = () => {
    http
      .get(url, () => callback())
      .on("error", () => setTimeout(retry, 300));
  };
  retry();
}

function startStandaloneServer() {
  const serverPath = path.join(process.resourcesPath, "standalone", "server.js");
  serverProcess = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT, NODE_ENV: "production" },
    stdio: "inherit",
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0b0f1a",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (isDev) {
    createWindow();
  } else {
    startStandaloneServer();
    waitForServer(URL, createWindow);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
