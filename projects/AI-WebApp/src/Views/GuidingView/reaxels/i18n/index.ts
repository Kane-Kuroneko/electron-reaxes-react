export type GuidingCopy = {
	title: string;
	steps: string[];
	language: string;
	theme: string;
	followSystem: string;
	intro: {
		title: string;
		body: string;
	}[];
	networkTitle: string;
	networkBody: string;
	directNetwork: string;
	blockedNetwork: string;
	testNetwork: string;
	directDetected: string;
	blockedDetected: string;
	proxyTitle: string;
	proxyBody: string;
	openSettings: string;
	aiTitle: string;
	aiBody: string;
	customLabel: string;
	addCustom: string;
	holdFinish: string;
	holdSkip: string;
	back: string;
	next: string;
	remove: string;
};

export const guidingSourceCopy:GuidingCopy = {
	title : 'Initialize your AI workspace' ,
	steps : [ 'Preferences' , 'Network' , 'AI Pages' ] ,
	language : 'Language' ,
	theme : 'Theme' ,
	followSystem : 'Follow System' ,
	intro : [
		{
			title : 'One shell for multiple AIs' ,
			body : 'Keep common AI services in one Electron host and switch by your configured order instead of scattered browser tabs.',
		} ,
		{
			title : 'Isolated AI sessions' ,
			body : 'Each AI page uses a stable partition for login state, proxy behavior, and storage isolation.',
		} ,
		{
			title : 'Network policy per page' ,
			body : 'Use global proxy defaults, per-AI overrides, system proxy, or direct mode depending on your network.',
		} ,
		{
			title : 'Local-first runtime' ,
			body : 'Settings live in the local userData directory, while menu, tray, and quick switching sync with the main process.',
		},
	] ,
	networkTitle : 'Check your network' ,
	networkBody : 'The test reaches Google, X / Twitter, and YouTube. It only selects a suggested default and will not advance automatically.' ,
	directNetwork : 'I can connect directly' ,
	blockedNetwork : 'I need proxy or system network settings' ,
	testNetwork : 'Test connection' ,
	directDetected : 'Result: this network likely supports direct access.' ,
	blockedDetected : 'Result: this network likely needs proxy settings.' ,
	proxyTitle : 'Finish network setup first' ,
	proxyBody : 'The app will keep the local proxy defaults. Open Settings to choose system proxy, manual proxy, or per-AI proxy rules.' ,
	openSettings : 'Save and open Settings' ,
	aiTitle : 'Choose enabled AI pages' ,
	aiBody : 'Unchecked built-in pages stay in configuration but remain hidden until you enable them later.' ,
	customLabel : 'Custom name' ,
	addCustom : 'Add custom AI' ,
	holdFinish : 'Hold to finish' ,
	holdSkip : 'Hold to skip' ,
	back : 'Back' ,
	next : 'Next' ,
	remove : 'Remove',
};

export const reaxel_GuidingI18n = reaxel( () => {
	const i18n = Refaxel_I18n( [
		{
			language : 'zh-CN' ,
			resourceMap : zhCN ,
			name : '简体中文',
		} ,
		{
			language : 'zh-TW' ,
			resourceMap : zhTW ,
			name : '正體中文',
		} ,
		{
			language : 'ja-JP' ,
			resourceMap : jaJP ,
			name : '日本語',
		} ,
		{
			language : 'ko-KR' ,
			resourceMap : koKR ,
			name : '한국어',
		} ,
		{
			language : 'en-US' ,
			isSource : true ,
			name : 'English(US)',
		},
	] );
	Object.assign( i18n.statics.languageMaps , {
		'zh-CN' : zhCN ,
		'zh-TW' : zhTW ,
		'ja-JP' : jaJP ,
		'ko-KR' : koKR,
	} );
	
	const rtn = {
		get setLanguage() {
			return i18n().setLanguage;
		} ,
		get i18n() {
			return i18n().i18n;
		} ,
		get language() {
			return i18n().language;
		} ,
		getCopy() {
			return createGuidingCopy( i18n().i18n );
		},
	};
	
	return Object.assign( () => rtn , {
		store : i18n.store ,
		setState : i18n.setState ,
		mutate : i18n.mutate ,
		statics : {
			...i18n.statics,
		},
	} );
} );

const createGuidingCopy = (translate:(text:string) => string):GuidingCopy => {
	return {
		title : translate( guidingSourceCopy.title ) ,
		steps : guidingSourceCopy.steps.map( title => translate( title ) ) ,
		language : translate( guidingSourceCopy.language ) ,
		theme : translate( guidingSourceCopy.theme ) ,
		followSystem : translate( guidingSourceCopy.followSystem ) ,
		intro : guidingSourceCopy.intro.map( item => {
			return {
				title : translate( item.title ) ,
				body : translate( item.body ),
			};
		} ) ,
		networkTitle : translate( guidingSourceCopy.networkTitle ) ,
		networkBody : translate( guidingSourceCopy.networkBody ) ,
		directNetwork : translate( guidingSourceCopy.directNetwork ) ,
		blockedNetwork : translate( guidingSourceCopy.blockedNetwork ) ,
		testNetwork : translate( guidingSourceCopy.testNetwork ) ,
		directDetected : translate( guidingSourceCopy.directDetected ) ,
		blockedDetected : translate( guidingSourceCopy.blockedDetected ) ,
		proxyTitle : translate( guidingSourceCopy.proxyTitle ) ,
		proxyBody : translate( guidingSourceCopy.proxyBody ) ,
		openSettings : translate( guidingSourceCopy.openSettings ) ,
		aiTitle : translate( guidingSourceCopy.aiTitle ) ,
		aiBody : translate( guidingSourceCopy.aiBody ) ,
		customLabel : translate( guidingSourceCopy.customLabel ) ,
		addCustom : translate( guidingSourceCopy.addCustom ) ,
		holdFinish : translate( guidingSourceCopy.holdFinish ) ,
		holdSkip : translate( guidingSourceCopy.holdSkip ) ,
		back : translate( guidingSourceCopy.back ) ,
		next : translate( guidingSourceCopy.next ) ,
		remove : translate( guidingSourceCopy.remove ),
	};
};

import zhCN from './langs/zh-CN';
import zhTW from './langs/zh-TW';
import jaJP from './langs/ja-JP';
import koKR from './langs/ko-KR';
import { Refaxel_I18n } from '#generics/refaxels/i18n';
import { reaxel } from 'reaxes';
