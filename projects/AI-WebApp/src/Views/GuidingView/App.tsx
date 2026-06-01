export const App = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		getCopy ,
		getResolvedTheme ,
		init,
	} = reaxel_GuidingView();
	
	useEffect( () => {
		void init();
	} , [] );
	
	if( store.Status.error ) {
		return <div className="guiding-root guiding-loading">Failed to load setup.</div>;
	}
	
	if( store.Status.loading || !store.Data.defaults ) {
		return <div className="guiding-root guiding-loading">Loading setup...</div>;
	}
	
	const copy = getCopy();
	const PageComponent = {
		0 : RCPreferencesPage ,
		1 : RCNetworkPage ,
		2 : RCAIPagesPage,
	}[store.Page.current] || RCPreferencesPage;
	
	return <ConfigProvider
		theme={ {
			algorithm : getResolvedTheme() === 'dark'
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
						current={ store.Page.current }
						size="small"
						items={ copy.steps.map( title => ( { title } ) ) }
					/>
				</header>
				
				<main className="guiding-content">
					<PageComponent/>
				</main>
				
				<RCGuidingFooter/>
			</div>
		</div>
	</ConfigProvider>;
} );

import { RCAIPagesPage } from './components/AIPages';
import { RCGuidingFooter } from './components/Footer';
import { RCNetworkPage } from './components/Network';
import { RCPreferencesPage } from './components/Preferences';
import { reaxel_GuidingView } from '#src/Views/GuidingView/reaxels/guiding-view';
import {
	ConfigProvider ,
	Steps ,
	theme as antdTheme,
} from 'antd';
import { reaxper } from 'reaxes-react';
import './index.less';
