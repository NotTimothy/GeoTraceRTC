const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

function startApiProcess() {
  const apiPath = path.join(__dirname, 'bin', 'log-parser.exe');
  apiProcess = spawn(apiPath);

  apiProcess.stdout.on('data', (data) => {
    console.log(`API stdout: ${data}`);
  });

  apiProcess.stderr.on('data', (data) => {
    console.error(`API stderr: ${data}`);
  });

  apiProcess.on('error', (err) => {
    console.error('Failed to start the Rust API process:', err);
  });

  apiProcess.on('close', (code) => {
    console.log(`API process exited with code ${code}`);
  });
}

startApiProcess()

ipcMain.on('open-file-dialog', (event) => {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  }).then((result) => {
    if (!result.canceled) {
      const filePath = result.filePaths[0];
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
          event.reply('file-error', 'Error reading the file');
          return;
        }
        try {
          const jsonData = JSON.parse(data);
          sendFileToRustApi(data)
            .then(async (response) => {
              const locationData = response.ip.map((ip, index) => ({
                ip: ip,
                address: response.address[index],
                port: response.port[index],
                network_type: response.network_type[index],
                protocol: response.protocol[index],
                candidate_type: response.candidate_type[index],
              }));
              try {
                const uniqueIps = [...new Set(locationData.map((data) => data.ip))];
                const locationDataWithCoordinates = await Promise.all(
                  uniqueIps.map(async (ip) => {
                    const locationResponse = await axios.get(`https://ipapi.co/${ip}/json/`);
                    return locationData
                      .filter((data) => data.ip === ip)
                      .map((data) => ({
                        ...data,
                        ...locationResponse.data,
                      }));
                  })
                );
                event.reply('location-data', locationDataWithCoordinates.flat());
              } catch (error) {
                event.reply('location-error', 'Error retrieving location data');
              }
            })
            .catch((error) => {
              console.error('Error sending file to Rust API:', error);
            });
        } catch (error) {
          event.reply('file-error', 'Invalid JSON format');
        }
      });
    }
  });
});

async function sendFileToRustApi(fileData) {
  try {
    const response = await axios.post('http://127.0.0.1:8080/api/process-file', fileData, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error sending file to Rust API:', error);
    throw error;
  }
}