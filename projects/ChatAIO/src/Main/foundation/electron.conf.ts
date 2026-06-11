if(dev()){
	app.commandLine.appendSwitch('remote-debugging-port', '9222');
	app.commandLine.appendSwitch('remote-allow-origins', '*');
}

// app.commandLine.appendSwitch('ignore-gpu-blacklist');
// app.commandLine.appendSwitch('disable-gpu-sandbox');
// app.commandLine.appendSwitch('enable-features', 'DirectComposition,SkiaGraphite,UseSkiaRenderer,RawDraw');
// app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion'); // 减少 occlusion 计算
// app.commandLine.appendSwitch('force-color-profile', 'srgb'); // 避免 color management 开销


import { app } from "electron";
import { dev } from 'electron-is';
