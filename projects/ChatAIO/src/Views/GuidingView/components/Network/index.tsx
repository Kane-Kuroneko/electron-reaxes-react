export const RCNetworkPage = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		runConnectivityTest ,
		setNetworkStatus,
	} = reaxel_GuidingView();
	
	return <section className="guiding-page">
		<div className="section-heading">
			<h2><I18n>Check your network</I18n></h2>
			<p><I18n>The test reaches Google, X / Twitter, and YouTube. It only selects a suggested default and will not advance automatically.</I18n></p>
		</div>
		<Radio.Group
			value={ store.UIControls.network.status }
			onChange={ event => setNetworkStatus( event.target.value ) }
			className="network-choice"
		>
			<Radio value="direct"><I18n>I can connect directly</I18n></Radio>
			<Radio value="blocked"><I18n>I need proxy or system network settings</I18n></Radio>
		</Radio.Group>
		<Button
			type="primary"
			loading={ store.Status.testing }
			onClick={ runConnectivityTest }
		><I18n>Test connection</I18n></Button>
		{ store.Data.testResult && <div className="test-result">
			<div className={ store.Data.testResult.canDirectConnect ? 'result-good' : 'result-bad' }>
				<I18n>{ store.Data.testResult.canDirectConnect
					? 'Result: this network likely supports direct access.'
					: 'Result: this network likely needs proxy settings.' }</I18n>
			</div>
			{ store.Data.testResult.targets.map( target => <div
				key={ target.id }
				className="target-row"
			>
				<span>{ target.label }</span>
				<span>{ target.ok ? 'OK' : target.error || 'Failed' }</span>
			</div> ) }
		</div> }
	</section>;
} );

import { reaxel_GuidingView } from '#GuidingView/reaxels/guiding-view';
import { I18n } from '#GuidingView/reaxels/exports';
import {
	Button ,
	Radio,
} from 'antd';
import { reaxper } from 'reaxes-react';
