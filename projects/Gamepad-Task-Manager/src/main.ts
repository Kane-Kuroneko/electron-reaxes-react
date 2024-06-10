import { app, BrowserWindow } from "electron";
const win = new BrowserWindow({
	width: 1280,
	height: 720
});
win.loadURL("https://localhost:3111");
