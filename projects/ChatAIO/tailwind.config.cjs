const path = require('path');

/**
 * webpack 从仓库根启动，Tailwind 默认按 cwd 解析 content。
 * 必须相对本文件（ChatAIO 根）扫描，否则只会打出 Preflight、工具类全空。
 * 见 docs/features/settings-ui-shadcn.md
 */
const viewContent = ( dir ) => {
	return path.join( __dirname , 'src/Views' , dir , '**/*.{ts,tsx}' ).replaceAll( '\\' , '/' );
};

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode : [ 'selector' , '.dark' ] ,
	content : {
		relative : true ,
		files : [
			viewContent( 'shared' ) ,
			viewContent( 'SettingsView' ) ,
			viewContent( 'PromptView' ) ,
			viewContent( 'GuidingView' ) ,
		] ,
	} ,
	theme : {
		extend : {
			borderRadius : {
				lg : 'var(--radius)' ,
				md : 'calc(var(--radius) - 2px)' ,
				sm : 'calc(var(--radius) - 4px)' ,
			} ,
			colors : {
				background : 'hsl(var(--background))' ,
				foreground : 'hsl(var(--foreground))' ,
				card : {
					DEFAULT : 'hsl(var(--card))' ,
					foreground : 'hsl(var(--card-foreground))' ,
				} ,
				popover : {
					DEFAULT : 'hsl(var(--popover))' ,
					foreground : 'hsl(var(--popover-foreground))' ,
				} ,
				primary : {
					DEFAULT : 'hsl(var(--primary))' ,
					foreground : 'hsl(var(--primary-foreground))' ,
				} ,
				secondary : {
					DEFAULT : 'hsl(var(--secondary))' ,
					foreground : 'hsl(var(--secondary-foreground))' ,
				} ,
				muted : {
					DEFAULT : 'hsl(var(--muted))' ,
					foreground : 'hsl(var(--muted-foreground))' ,
				} ,
				accent : {
					DEFAULT : 'hsl(var(--accent))' ,
					foreground : 'hsl(var(--accent-foreground))' ,
				} ,
				destructive : {
					DEFAULT : 'hsl(var(--destructive))' ,
					foreground : 'hsl(var(--destructive-foreground))' ,
				} ,
				border : 'hsl(var(--border))' ,
				input : 'hsl(var(--input))' ,
				ring : 'hsl(var(--ring))' ,
			} ,
			keyframes : {
				'accordion-down' : {
					from : { height : '0' } ,
					to : { height : 'var(--radix-accordion-content-height)' } ,
				} ,
				'accordion-up' : {
					from : { height : 'var(--radix-accordion-content-height)' } ,
					to : { height : '0' } ,
				} ,
			} ,
			animation : {
				'accordion-down' : 'accordion-down 0.2s ease-out' ,
				'accordion-up' : 'accordion-up 0.2s ease-out' ,
			} ,
		} ,
	} ,
	plugins : [] ,
};
