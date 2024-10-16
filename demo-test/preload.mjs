const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('ipcRenderer' , {
	send : (...args) => ipcRenderer.send(...args) 
});
