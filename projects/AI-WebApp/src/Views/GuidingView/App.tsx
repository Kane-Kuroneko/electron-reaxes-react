export const App = reaxper( () => {
	const [ defaults , setDefaults ] = useState<Guiding.Defaults>( null );
	const [ page , setPage ] = useState( 0 );
	const [ language , setLanguage ] = useState<Appearance.Language>( 'follow-system' );
	const [ theme , setTheme ] = useState<Appearance.Theme>( 'system' );
	const [ networkStatus , setNetworkStatus ] = useState<Guiding.NetworkStatus>( 'unknown' );
	const [ testing , setTesting ] = useState( false );
	const [ testResult , setTestResult ] = useState<Guiding.ConnectivityResult>( null );
	const [ selectedAIIds , setSelectedAIIds ] = useState<string[]>( [] );
	const [ customAIs , setCustomAIs ] = useState<AI.AIItem[]>( [] );
	const [ customAIFields , setCustomAIFields ] = useState( {
		label : '' ,
		url : '',
	} );
	const [ finishing , setFinishing ] = useState( false );
	
	useEffect( () => {
		~async function () {
			const nextDefaults = await api.getGuidingDefaults();
			setDefaults( nextDefaults );
			setLanguage( nextDefaults.appearance.language );
			setTheme( nextDefaults.appearance.theme );
			setSelectedAIIds(
				nextDefaults.defaultAIs
				.filter( ai => !ai.disabled )
				.map( ai => ai.id ),
			);
			applyThemeToDocument( nextDefaults.appearance.resolvedTheme );
		}();
	} , [] );
	
	useEffect( () => {
		const systemTheme = defaults?.appearance.resolvedTheme || 'light';
		applyThemeToDocument( resolveThemePreference( theme , systemTheme ) );
	} , [ theme , defaults?.appearance.resolvedTheme ] );
	
	if( !defaults ) {
		return <div className="guiding-root guiding-loading">Loading setup...</div>;
	}
	
	const systemLanguage = defaults.appearance.resolvedLanguage;
	const resolvedLanguage = resolveLanguagePreference( language , systemLanguage );
	const copy = getCopy( resolvedLanguage );
	const canDirectConnect = networkStatus === 'direct'
		? true
		: networkStatus === 'blocked'
			? false
			: null;
	const progress = buildProgress( {
		language ,
		theme ,
		networkStatus ,
		canDirectConnect ,
		defaultAIs : defaults.defaultAIs ,
		selectedAIIds ,
		customAIs,
	} );
	
	const saveProgress = async(nextProgress = progress) => {
		await api.guidingSaveProgress( nextProgress );
	};
	
	const goNext = async() => {
		if( page === 0 ) {
			await saveProgress( {
				appearance : {
					language ,
					theme,
				},
			} );
			setPage( 1 );
			return;
		}
		if( page === 1 ) {
			await saveProgress( progress );
			if( canDirectConnect ) {
				setPage( 2 );
			}
			return;
		}
	};
	
	const finish = async(options:Partial<Guiding.FinishOptions> = {}) => {
		setFinishing( true );
		try {
			await api.guidingFinish( {
				...options ,
				progress,
			} );
		} finally {
			setFinishing( false );
		}
	};
	
	const runConnectivityTest = async() => {
		setTesting( true );
		try {
			const result = await api.guidingTestConnectivity();
			setTestResult( result );
			setNetworkStatus( result.canDirectConnect ? 'direct' : 'blocked' );
		} finally {
			setTesting( false );
		}
	};
	
	const addCustomAI = () => {
		const label = customAIFields.label.trim();
		const url = customAIFields.url.trim();
		if( !label || !url ) return;
		const id = `custom-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 , 8 ) }`;
		setCustomAIs( [
			...customAIs ,
			{
				id ,
				label ,
				disabled : false ,
				AI_family : 'chatgpt' ,
				url ,
				url_override : null ,
				desc : '' ,
				proxy_mode : 'follow_global_setting' ,
				from_server_list_proxy : null ,
				user_fill_proxy : null ,
				preloadOnStartup : false,
			},
		] );
		setCustomAIFields( {
			label : '' ,
			url : '',
		} );
	};
	
	return <ConfigProvider
		theme={ {
			algorithm : resolveThemePreference( theme , defaults.appearance.resolvedTheme ) === 'dark'
				? antdTheme.darkAlgorithm
				: antdTheme.defaultAlgorithm,
		} }
	>
		<div className="guiding-root">
			<div className="guiding-shell">
				<header className="guiding-header">
					<div>
						<div className="guiding-kicker">AI WebApp</div>
						<h1>{ copy.title }</h1>
					</div>
					<Steps
						current={ page }
						size="small"
						items={ copy.steps.map( title => ( { title } ) ) }
					/>
				</header>
				
				<main className="guiding-content">
					{ page === 0 && <section className="guiding-page">
						<div className="guiding-controls">
							<Form layout="vertical">
								<Form.Item label={ copy.language }>
									<Select
										value={ language }
										onChange={ setLanguage }
										options={ languageOptions( defaults.systemLanguageName ) }
									/>
								</Form.Item>
							</Form>
							<Form layout="vertical">
								<Form.Item label={ copy.theme }>
									<Radio.Group
										value={ theme }
										onChange={ e => setTheme( e.target.value ) }
									>
										<Radio.Button value="system">{ copy.followSystem } { resolveThemePreference( 'system' , defaults.appearance.resolvedTheme ) }</Radio.Button>
										<Radio.Button value="light">Light</Radio.Button>
										<Radio.Button value="dark">Dark</Radio.Button>
									</Radio.Group>
								</Form.Item>
							</Form>
						</div>
						<div className="intro-grid">
							{ copy.intro.map( item => <article
								key={ item.title }
								className="intro-item"
							>
								<h2>{ item.title }</h2>
								<p>{ item.body }</p>
							</article> ) }
						</div>
					</section> }
					
					{ page === 1 && <section className="guiding-page">
						<div className="section-heading">
							<h2>{ copy.networkTitle }</h2>
							<p>{ copy.networkBody }</p>
						</div>
						<Radio.Group
							value={ networkStatus }
							onChange={ e => setNetworkStatus( e.target.value ) }
							className="network-choice"
						>
							<Radio value="direct">{ copy.directNetwork }</Radio>
							<Radio value="blocked">{ copy.blockedNetwork }</Radio>
						</Radio.Group>
						<Button
							type="primary"
							loading={ testing }
							onClick={ runConnectivityTest }
						>{ copy.testNetwork }</Button>
						{ testResult && <div className="test-result">
							<div className={ testResult.canDirectConnect ? 'result-good' : 'result-bad' }>
								{ testResult.canDirectConnect ? copy.directDetected : copy.blockedDetected }
							</div>
							{ testResult.targets.map( target => <div
								key={ target.id }
								className="target-row"
							>
								<span>{ target.label }</span>
								<span>{ target.ok ? 'OK' : target.error || 'Failed' }</span>
							</div> ) }
						</div> }
					</section> }
					
					{ page === 2 && canDirectConnect && <section className="guiding-page">
						<div className="section-heading">
							<h2>{ copy.aiTitle }</h2>
							<p>{ copy.aiBody }</p>
						</div>
						<Checkbox.Group
							value={ selectedAIIds }
							onChange={ values => setSelectedAIIds( values as string[] ) }
							className="ai-grid"
						>
							{ defaults.defaultAIs.map( ai => <Checkbox
								key={ ai.id }
								value={ ai.id }
								className="ai-option"
							>
								<span>{ ai.label }</span>
								<small>{ ai.url }</small>
							</Checkbox> ) }
						</Checkbox.Group>
						<div className="custom-ai">
							<Input
								placeholder={ copy.customLabel }
								value={ customAIFields.label }
								onChange={ e => setCustomAIFields( { ...customAIFields , label : e.target.value } ) }
							/>
							<Input
								placeholder="https://example.com"
								value={ customAIFields.url }
								onChange={ e => setCustomAIFields( { ...customAIFields , url : e.target.value } ) }
							/>
							<Button onClick={ addCustomAI }>{ copy.addCustom }</Button>
						</div>
						{ customAIs.length > 0 && <div className="custom-ai-cards">
							{ customAIs.map( ai => <div
								key={ ai.id }
								className="custom-ai-card"
							>
								<div className="custom-ai-card__body">
									<span>{ ai.label }</span>
									<small>{ ai.url }</small>
								</div>
								<Button
									size="small"
									onClick={ () => setCustomAIs( customAIs.filter( item => item.id !== ai.id ) ) }
								>{ copy.remove }</Button>
							</div> ) }
						</div> }
					</section> }
				</main>
				
				<footer className="guiding-footer">
					{ page > 0 && <LongPressButton
						onConfirm={ () => finish( { skip : true } ) }
					>{ copy.holdSkip }</LongPressButton> }
					<div className="footer-spacer" />
					{ page > 0 && <Button onClick={ () => setPage( page - 1 ) }>{ copy.back }</Button> }
					{ page === 1 && canDirectConnect === false && <LongPressButton
						type="primary"
						loading={ finishing }
						onConfirm={ () => finish( { openSettings : true } ) }
					>{ copy.openSettings }</LongPressButton> }
					{ page < 2 && canDirectConnect !== false && <Button
						type="primary"
						disabled={ page === 1 && networkStatus === 'unknown' }
						onClick={ goNext }
					>{ copy.next }</Button> }
					{ page === 2 && <LongPressButton
						type="primary"
						loading={ finishing }
						onConfirm={ () => finish() }
					>{ copy.holdFinish }</LongPressButton> }
				</footer>
			</div>
		</div>
	</ConfigProvider>;
} );

const LongPressButton = (props:any) => {
	const {
		onConfirm ,
		...buttonProps
	} = props;
	const [ holding , setHolding ] = useState( false );
	const [ progress , setProgress ] = useState( 0 );
	const timerRef = useRef<ReturnType<typeof setInterval>>( null );
	const startedAt = useRef( 0 );
	const holdMs = 900;
	
	const stop = () => {
		if( timerRef.current ) {
			clearInterval( timerRef.current );
			timerRef.current = null;
		}
		setHolding( false );
		setProgress( 0 );
	};
	
	const start = () => {
		if( buttonProps.loading || timerRef.current ) return;
		startedAt.current = Date.now();
		setHolding( true );
		timerRef.current = setInterval( () => {
			const nextProgress = Math.min( 1 , ( Date.now() - startedAt.current ) / holdMs );
			setProgress( nextProgress );
			if( nextProgress >= 1 ) {
				stop();
				onConfirm?.();
			}
		} , 16 );
	};
	
	return <Button
		{ ...buttonProps }
		onMouseDown={ start }
		onMouseUp={ stop }
		onMouseLeave={ stop }
		onTouchStart={ start }
		onTouchEnd={ stop }
		className={ `${ buttonProps.className || '' } long-press-button ${ holding ? 'is-holding' : '' }` }
		style={ {
			...buttonProps.style ,
			'--hold-progress' : progress,
		} as any }
	/>;
};

const applyThemeToDocument = (theme:'light' | 'dark') => {
	document.documentElement.dataset.aiWebappTheme = theme;
	document.documentElement.style.colorScheme = theme;
};

const languageOptions = (systemLanguageName:string) => [
	{
		value : 'follow-system' ,
		label : `Follow System (${ systemLanguageName })`,
	} ,
	{ value : 'en-US' , label : 'English' } ,
	{ value : 'zh-CN' , label : '简体中文' } ,
	{ value : 'zh-TW' , label : '正體中文' } ,
	{ value : 'ja-JP' , label : '日本語' } ,
	{ value : 'ko-KR' , label : '한국어' },
];

const buildProgress = (data:{
	language: Appearance.Language;
	theme: Appearance.Theme;
	networkStatus: Guiding.NetworkStatus;
	canDirectConnect: boolean | null;
	defaultAIs: AI.AIItem[];
	selectedAIIds: string[];
	customAIs: AI.AIItem[];
}):Guiding.Progress => {
	const nextProgress:Guiding.Progress = {
		appearance : {
			language : data.language ,
			theme : data.theme,
		},
	};
	if( data.networkStatus !== 'unknown' ) {
		nextProgress.network = {
			status : data.networkStatus ,
			canDirectConnect : data.canDirectConnect,
		};
	}
	if( data.canDirectConnect ) {
		nextProgress.AIs = [
			...data.defaultAIs.map( ai => ( {
				...ai ,
				disabled : !data.selectedAIIds.includes( ai.id ),
			} ) ) ,
			...data.customAIs,
		];
	}
	return nextProgress;
};

const getCopy = (language:Languages) => {
	if( language === 'zh-CN' || language === 'zh-TW' ) {
		return {
			title : '初始化你的 AI 工作空间' ,
			steps : [ '偏好' , '网络' , 'AI 页面' ] ,
			language : '语言' ,
			theme : '主题' ,
			followSystem : '跟随系统' ,
			intro : [
				{ title : '多 AI 页面统一管理' , body : '把常用 AI 服务放在同一个 Electron 宿主中，按配置顺序切换，避免浏览器标签分散。' } ,
				{ title : '每个 AI 独立会话' , body : '内置页面使用稳定分区保存登录态，代理和数据隔离以页面实例为单位处理。' } ,
				{ title : '网络策略可精细配置' , body : '支持全局代理、单 AI 代理覆盖、系统代理和直连，适合不同网络环境。' } ,
				{ title : '本地优先' , body : '设置保存在本机 userData 目录，菜单、托盘和快捷切换都围绕本地运行时同步。' },
			] ,
			networkTitle : '检测你的网络环境' ,
			networkBody : '测试会访问 Google、X / Twitter、YouTube。结论只用于初始化代理默认值，不会自动进入下一步。' ,
			directNetwork : '可以直连国际网络' ,
			blockedNetwork : '需要代理或系统网络配置' ,
			testNetwork : '测试连接' ,
			directDetected : '检测结果：当前网络大概率可以直连。' ,
			blockedDetected : '检测结果：当前网络大概率需要代理。' ,
			proxyTitle : '先完成网络设置' ,
			proxyBody : '当前默认会保留本地代理配置。进入设置页后可以选择系统代理、手动代理或每个 AI 单独代理。' ,
			openSettings : '保存并打开设置' ,
			aiTitle : '选择要启用的 AI 页面' ,
			aiBody : '未勾选的内置 AI 会保留在配置中但默认隐藏，后续可在设置里重新启用。' ,
			customLabel : '自定义名称' ,
			addCustom : '添加自定义 AI' ,
			holdFinish : '长按确认完成' ,
			holdSkip : '长按跳过' ,
			back : '上一步' ,
			next : '下一步',
			remove : '移除',
		};
	}
	return {
		title : 'Initialize your AI workspace' ,
		steps : [ 'Preferences' , 'Network' , 'AI Pages' ] ,
		language : 'Language' ,
		theme : 'Theme' ,
		followSystem : 'Follow System' ,
		intro : [
			{ title : 'One shell for multiple AIs' , body : 'Keep common AI services in one Electron host and switch by your configured order instead of scattered browser tabs.' } ,
			{ title : 'Isolated AI sessions' , body : 'Each AI page uses a stable partition for login state, proxy behavior, and storage isolation.' } ,
			{ title : 'Network policy per page' , body : 'Use global proxy defaults, per-AI overrides, system proxy, or direct mode depending on your network.' } ,
			{ title : 'Local-first runtime' , body : 'Settings live in the local userData directory, while menu, tray, and quick switching sync with the main process.' },
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
		next : 'Next',
		remove : 'Remove',
	};
};

import {
	resolveLanguagePreference ,
	resolveThemePreference,
} from '#src/shared/appearance';
import type { Guiding } from '#src/Types/Guiding';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import type { AI } from '#src/Types/SettingsTypes/AI';
import type { Languages } from '#src/Types/Languages';
import {
	Button ,
	Checkbox ,
	ConfigProvider ,
	Form ,
	Input ,
	Radio ,
	Select ,
	Steps ,
	theme as antdTheme,
} from 'antd';
import { reaxper } from 'reaxes-react';
import './index.less';
