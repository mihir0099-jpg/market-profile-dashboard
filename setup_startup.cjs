const fs = require('fs');
const path = require('path');
const startupFolder = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const vbsPath = path.join(startupFolder, 'LaunchBhaicharaDaemon.vbs');
const scriptContent = 'Set WshShell = CreateObject("WScript.Shell")\r\nWshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""C:\\Users\\mihir\\.gemini\\antigravity\\scratch\\market-profile-dashboard\\keep_alive.ps1""", 0, False\r\n';
fs.writeFileSync(vbsPath, scriptContent, 'utf8');
console.log('Successfully written VBS to:', vbsPath);
