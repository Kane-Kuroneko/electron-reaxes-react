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
				AI_family : 'custom' ,
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

type GuidingCopy = {
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

const guidingCopies:Record<Languages , GuidingCopy> = {
	'en-US' : {
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
	} ,
	'zh-CN' : {
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
	} ,
	'zh-TW' : {
		title : '初始化你的 AI 工作區' ,
		steps : [ '偏好' , '網路' , 'AI 頁面' ] ,
		language : '語言' ,
		theme : '主題' ,
		followSystem : '跟隨系統' ,
		intro : [
			{ title : '多 AI 頁面統一管理' , body : '把常用 AI 服務放在同一個 Electron 宿主中，依照設定順序切換，避免瀏覽器分頁分散。' } ,
			{ title : '每個 AI 獨立工作階段' , body : '內建頁面使用穩定分區保存登入狀態，代理與資料隔離以頁面實例為單位處理。' } ,
			{ title : '網路策略可精細設定' , body : '支援全域代理、單一 AI 代理覆蓋、系統代理與直連，適合不同網路環境。' } ,
			{ title : '本機優先' , body : '設定保存在本機 userData 目錄，選單、系統列與快捷切換都圍繞本機執行階段同步。' },
		] ,
		networkTitle : '檢測你的網路環境' ,
		networkBody : '測試會存取 Google、X / Twitter、YouTube。結論只用於初始化代理預設值，不會自動進入下一步。' ,
		directNetwork : '可以直連國際網路' ,
		blockedNetwork : '需要代理或系統網路設定' ,
		testNetwork : '測試連線' ,
		directDetected : '檢測結果：目前網路大概率可以直連。' ,
		blockedDetected : '檢測結果：目前網路大概率需要代理。' ,
		proxyTitle : '先完成網路設定' ,
		proxyBody : '目前預設會保留本機代理設定。進入設定頁後可以選擇系統代理、手動代理或每個 AI 單獨代理。' ,
		openSettings : '儲存並開啟設定' ,
		aiTitle : '選擇要啟用的 AI 頁面' ,
		aiBody : '未勾選的內建 AI 會保留在設定中但預設隱藏，後續可在設定裡重新啟用。' ,
		customLabel : '自訂名稱' ,
		addCustom : '新增自訂 AI' ,
		holdFinish : '長按確認完成' ,
		holdSkip : '長按跳過' ,
		back : '上一步' ,
		next : '下一步',
		remove : '移除',
	} ,
	'ja-JP' : {
		title : 'AI ワークスペースを初期化' ,
		steps : [ '設定' , 'ネットワーク' , 'AI ページ' ] ,
		language : '言語' ,
		theme : 'テーマ' ,
		followSystem : 'システムに従う' ,
		intro : [
			{ title : '複数 AI ページを一元管理' , body : 'よく使う AI サービスを 1 つの Electron ホストにまとめ、設定順に切り替えます。' } ,
			{ title : 'AI ごとに独立したセッション' , body : '内蔵ページは安定した partition にログイン状態を保存し、プロキシとデータをページ単位で分離します。' } ,
			{ title : '細かいネットワーク制御' , body : 'グローバルプロキシ、AI ごとの上書き、システムプロキシ、直接接続を環境に応じて選べます。' } ,
			{ title : 'ローカル優先' , body : '設定はローカルの userData に保存され、メニュー、トレイ、クイック切替はローカル実行時に同期されます。' },
		] ,
		networkTitle : 'ネットワーク環境を確認' ,
		networkBody : 'Google、X / Twitter、YouTube へ接続を試します。結果は初期プロキシ設定の参考にのみ使い、自動では進みません。' ,
		directNetwork : '国際ネットワークへ直接接続できる' ,
		blockedNetwork : 'プロキシまたはシステムネットワーク設定が必要' ,
		testNetwork : '接続をテスト' ,
		directDetected : '結果：現在のネットワークは直接接続できる可能性が高いです。' ,
		blockedDetected : '結果：現在のネットワークはプロキシ設定が必要な可能性が高いです。' ,
		proxyTitle : '先にネットワーク設定を完了' ,
		proxyBody : 'ローカルプロキシの既定値を保持します。設定画面でシステムプロキシ、手動プロキシ、AI ごとのプロキシを選べます。' ,
		openSettings : '保存して設定を開く' ,
		aiTitle : '有効にする AI ページを選択' ,
		aiBody : '未選択の内蔵 AI は設定に残りますが、後で有効にするまで非表示になります。' ,
		customLabel : 'カスタム名' ,
		addCustom : 'カスタム AI を追加' ,
		holdFinish : '長押しして完了' ,
		holdSkip : '長押ししてスキップ' ,
		back : '戻る' ,
		next : '次へ',
		remove : '削除',
	} ,
	'ko-KR' : {
		title : 'AI 작업 공간 초기화' ,
		steps : [ '환경 설정' , '네트워크' , 'AI 페이지' ] ,
		language : '언어' ,
		theme : '테마' ,
		followSystem : '시스템 설정 따르기' ,
		intro : [
			{ title : '여러 AI 페이지 통합 관리' , body : '자주 쓰는 AI 서비스를 하나의 Electron 호스트에 모으고 설정한 순서대로 전환합니다.' } ,
			{ title : 'AI별 독립 세션' , body : '내장 페이지는 안정적인 partition에 로그인 상태를 저장하고, 프록시와 데이터를 페이지 단위로 분리합니다.' } ,
			{ title : '세밀한 네트워크 정책' , body : '전역 프록시, AI별 재정의, 시스템 프록시, 직접 연결을 네트워크 환경에 맞게 선택할 수 있습니다.' } ,
			{ title : '로컬 우선' , body : '설정은 로컬 userData 디렉터리에 저장되며, 메뉴와 트레이, 빠른 전환은 로컬 런타임과 동기화됩니다.' },
		] ,
		networkTitle : '네트워크 환경 확인' ,
		networkBody : 'Google, X / Twitter, YouTube 접속을 테스트합니다. 결과는 초기 프록시 기본값 제안에만 사용되며 자동으로 다음 단계로 넘어가지 않습니다.' ,
		directNetwork : '국제 네트워크에 직접 연결할 수 있음' ,
		blockedNetwork : '프록시 또는 시스템 네트워크 설정이 필요함' ,
		testNetwork : '연결 테스트' ,
		directDetected : '결과: 현재 네트워크는 직접 연결이 가능할 가능성이 높습니다.' ,
		blockedDetected : '결과: 현재 네트워크는 프록시 설정이 필요할 가능성이 높습니다.' ,
		proxyTitle : '먼저 네트워크 설정 완료' ,
		proxyBody : '로컬 프록시 기본값을 유지합니다. 설정 화면에서 시스템 프록시, 수동 프록시 또는 AI별 프록시 규칙을 선택할 수 있습니다.' ,
		openSettings : '저장 후 설정 열기' ,
		aiTitle : '활성화할 AI 페이지 선택' ,
		aiBody : '선택하지 않은 내장 AI는 설정에 남지만, 나중에 활성화할 때까지 숨겨집니다.' ,
		customLabel : '사용자 지정 이름' ,
		addCustom : '사용자 지정 AI 추가' ,
		holdFinish : '길게 눌러 완료' ,
		holdSkip : '길게 눌러 건너뛰기' ,
		back : '이전' ,
		next : '다음',
		remove : '제거',
	},
};

const getCopy = (language:Languages) => {
	return guidingCopies[language] || guidingCopies['en-US'];
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
