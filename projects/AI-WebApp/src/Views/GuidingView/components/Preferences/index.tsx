export const RCPreferencesPage = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		getCopy ,
		getLanguageOptions ,
		getResolvedTheme ,
		setLanguage ,
		setTheme,
	} = reaxel_GuidingView();
	const copy = getCopy();
	
	return <section className="guiding-page">
		<div className="guiding-controls">
			<Form layout="vertical">
				<Form.Item label={ copy.language }>
					<Select
						value={ store.UIControls.appearance.language }
						onChange={ setLanguage }
						options={ getLanguageOptions() }
					/>
				</Form.Item>
			</Form>
			<Form layout="vertical">
				<Form.Item label={ copy.theme }>
					<Radio.Group
						value={ store.UIControls.appearance.theme }
						onChange={ event => setTheme( event.target.value ) }
					>
						<Radio.Button value="system">{ copy.followSystem } { getResolvedTheme() }</Radio.Button>
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
	</section>;
} );

import { reaxel_GuidingView } from '#src/Views/GuidingView/reaxels/guiding-view';
import {
	Form ,
	Radio ,
	Select,
} from 'antd';
import { reaxper } from 'reaxes-react';
