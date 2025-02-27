const { app, ipcMain, dialog, BrowserWindow, nativeTheme } = require('electron');
const fs = require("fs");
const path = require('path');

console.log(__dirname);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  //saveFile(null);

  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 900,
    minHeight: 700,
    webSecurity: false,
    icon: __dirname + "/Resources/Icon.ico",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  //mainWindow.removeMenu();

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  ipcMain.on("openDialog", (event, arg) => {
    dialog.showOpenDialog(mainWindow, 
    {}).then(result => {
        event.reply("openDialog-reply", fs.readFileSync(result.filePaths[0], { encoding: 'utf-8' }));
    })
  })

  ipcMain.on("saveRbm", (event, arg) => {
    dialog.showSaveDialog(mainWindow, 
    {
      filters: [{ name: 'Text File', extensions: ['txt'] }]
    }).then(result => {
      console.log(result.filePath)
      event.reply("saveRbm-reply", result.filePath);
    })
  })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
