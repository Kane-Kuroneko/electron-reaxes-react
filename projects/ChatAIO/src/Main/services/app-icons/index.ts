/**
 * App / tray 图标路径解析。
 * - 未打包（DEV）：使用 statics 下的 *-dev 文件
 * - 已打包：使用正式版文件名（electron-builder 亦指向 statics/gpt）
 */

export const getStaticsDir = (): string => {
	if( app.isPackaged ) {
		return path.join( process.resourcesPath , 'statics' );
	}
	/* main.js 在 dist/；ChatAIO 的 statics 在工程根（非 dist/statics） */
	const fromMainBundle = path.join( __dirname , '..' , 'statics' );
	const fromAppPath = path.join( app.getAppPath() , 'statics' );
	if( fs.existsSync( fromMainBundle ) ) return fromMainBundle;
	if( fs.existsSync( fromAppPath ) ) return fromAppPath;
	return fromMainBundle;
};

/** 未打包时为 true，与 userData `ChatAIO-dev` 约定一致 */
export const useDevAppIcons = (): boolean => !app.isPackaged;

/**
 * 在 primary stem 后插入 -dev（与 replace-app-icons --variant dev 对齐）。
 * gpt.ico → gpt-dev.ico；tray-icon.macos.png → tray-icon-dev.macos.png
 */
export const withDevIconName = ( filename: string ): string => {
	const dot = filename.indexOf( '.' );
	if( dot < 0 ) return `${ filename }-dev`;
	return `${ filename.slice( 0 , dot ) }-dev${ filename.slice( dot ) }`;
};

const resolveIconFilename = ( prodFilename: string ): string => {
	return useDevAppIcons() ? withDevIconName( prodFilename ) : prodFilename;
};

export const getAppIconPath = (): string => {
	/* macOS Dock/runtime 使用带透明边距的 .icns；Win→.ico；Linux→.png */
	const ext = process.platform === 'win32'
		? 'ico'
		: process.platform === 'darwin'
			? 'icns'
			: 'png';
	return path.join( getStaticsDir() , resolveIconFilename( `gpt.${ ext }` ) );
};

export const getTrayIconPath = (): string => {
	/* Win/Linux 托盘用 PNG，避免 ICO 多尺寸选取含糊；macOS 仍用 template */
	const filename = process.platform === 'darwin'
		? 'tray-icon.macos.png'
		: 'gpt.png';
	return path.join( getStaticsDir() , resolveIconFilename( filename ) );
};

/** 加载托盘图；Windows 用 32px 以尽量保留 DEV 角标可读性 */
export const loadTrayNativeImage = () => {
	const iconPath = getTrayIconPath();
	if( !fs.existsSync( iconPath ) ) {
		console.error( `[app-icons] tray icon missing: ${ iconPath }` );
	} else {
		console.log( `[app-icons] tray icon: ${ iconPath }` );
	}
	let image = nativeImage.createFromPath( iconPath );
	if( image.isEmpty() ) {
		console.warn( `[app-icons] tray icon empty after load: ${ iconPath }` );
		return image;
	}
	if( process.platform === 'win32' ) {
		image = image.resize( { width : 32 , height : 32 } );
	}
	return image;
};

/** 应用到 BrowserWindow（Win/Linux）/ macOS Dock（DEV 与正式版文件名分流） */
export const applyRuntimeAppIcon = ( win?: BrowserWindow | null ) => {
	const iconPath = getAppIconPath();
	if( !fs.existsSync( iconPath ) ) {
		console.error( `[app-icons] app icon missing: ${ iconPath }` );
		return;
	}
	const image = nativeImage.createFromPath( iconPath );
	if( image.isEmpty() ) {
		console.warn( `[app-icons] failed to load icon: ${ iconPath }` );
		return;
	}
	if( process.platform === 'darwin' ) {
		app.dock?.setIcon( image );
		return;
	}
	if( win && !win.isDestroyed() ) {
		win.setIcon( image );
	}
};

import {
	app ,
	nativeImage ,
	type BrowserWindow ,
} from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
