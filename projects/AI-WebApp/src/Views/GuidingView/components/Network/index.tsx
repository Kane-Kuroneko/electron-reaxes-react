export const RCNetworkPage = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		getCopy ,
		runConnectivityTest ,
		setNetworkStatus,
	} = reaxel_GuidingView();
	const copy = getCopy();
	
	return <section className="guiding-page">
		<div className="section-heading">
			<h2>{ copy.networkTitle }</h2>
			<p>{ copy.networkBody }</p>
		</div>
		<Radio.Group
			value={ store.UIControls.network.status }
			onChange={ event => setNetworkStatus( event.target.value ) }
			className="network-choice"
		>
			<Radio value="direct">{ copy.directNetwork }</Radio>
			<Radio value="blocked">{ copy.blockedNetwork }</Radio>
		</Radio.Group>
		<Button
			type="primary"
			loading={ store.Status.testing }
			onClick={ runConnectivityTest }
		>{ copy.testNetwork }</Button>
		{ store.Data.testResult && <div className="test-result">
			<div className={ store.Data.testResult.canDirectConnect ? 'result-good' : 'result-bad' }>
				{ store.Data.testResult.canDirectConnect ? copy.directDetected : copy.blockedDetected }
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

import { reaxel_GuidingView } from '#src/Views/GuidingView/reaxels/guiding-view';
import {
	Button ,
	Radio,
} from 'antd';
import { reaxper } from 'reaxes-react';
