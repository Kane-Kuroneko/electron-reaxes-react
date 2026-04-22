import type { WebContentsView } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ViewCrashReporter {
	private logFilePath: string;
	
	constructor(view: WebContentsView, viewName: string = 'Unknown') {
		// 创建logs目录
		const logsDir = path.join(process.cwd(), 'logs');
		if (!fs.existsSync(logsDir)) {
			fs.mkdirSync(logsDir, { recursive: true });
		}
		
		// 设置日志文件路径
		this.logFilePath = path.join(logsDir, 'webview-crashes.md');
		
		// 如果文件不存在，创建并初始化markdown文件
		if (!fs.existsSync(this.logFilePath)) {
			this.initializeLogFile();
		}
		
		// 监听渲染进程崩溃事件
		view.webContents.on('render-process-gone', (event, details) => {
			this.logCrash(viewName, details);
		});
		
		// 监听页面崩溃事件（已弃用，已由 render-process-gone 事件处理）
		// view.webContents.on('crashed', (event, killed) => {
		// 	this.logCrashEvent(viewName, {
		// 		reason: 'crashed',
		// 		exitCode: killed ? 1 : 0,
		// 		killed,
		// 	});
		// });
		
		// 监听未捕获的异常
		view.webContents.on('unresponsive', () => {
			this.logCrashEvent(viewName, {
				reason: 'unresponsive',
				exitCode: -1,
			});
		});
	}
	
	/**
	 * 初始化日志文件
	 */
	private initializeLogFile(): void {
		const header = `# WebView Crash Logs\n\n`; +
			`> 此文件记录所有 WebView 崩溃事件\n\n` +
			`---\n\n`;
		fs.writeFileSync(this.logFilePath, header, 'utf8');
	}
	
	/**
	 * 记录崩溃事件
	 */
	private logCrash(viewName: string, details: any): void {
		const timestamp = new Date().toISOString();
		const crashEntry = this.formatCrashEntry(viewName, details, timestamp);
		
		// 追加到日志文件
		fs.appendFileSync(this.logFilePath, crashEntry, 'utf8');
		
		// 同时输出到控制台
		console.error(`[WebView Crash] ${viewName} crashed at ${timestamp}`, details);
	}
	
	/**
	 * 记录一般崩溃事件
	 */
	private logCrashEvent(viewName: string, details: any): void {
		const timestamp = new Date().toISOString();
		const crashEntry = this.formatCrashEntry(viewName, details, timestamp);
		
		// 追加到日志文件
		fs.appendFileSync(this.logFilePath, crashEntry, 'utf8');
		
		// 同时输出到控制台
		console.error(`[WebView Event] ${viewName} event at ${timestamp}`, details);
	}
	
	/**
	 * 格式化崩溃条目为markdown格式
	 */
	private formatCrashEntry(viewName: string, details: any, timestamp: string): string {
		const entry = `## 🚨 Crash Event\n\n` +
			`- **View Name**: ${viewName}\n` +
			`- **Timestamp**: ${timestamp}\n` +
			`- **Reason**: ${details.reason || 'render-process-gone'}\n` +
			`- **Exit Code**: ${details.exitCode ?? 'N/A'}\n` +
			`- **Killed**: ${details.killed ?? 'N/A'}\n\n` +
			`### 📋 Details\n\n` +
			`\`\`\`json\n` +
			`${JSON.stringify(details, null, 2)}\n` +
			`\`\`\`\n\n` +
			`---\n\n`;
		
		return entry;
	}
}
