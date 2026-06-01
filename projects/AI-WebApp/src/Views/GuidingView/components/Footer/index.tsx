export const RCGuidingFooter = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		finish ,
		getCanDirectConnect ,
		getCopy ,
		goBack ,
		goNext,
	} = reaxel_GuidingView();
	const copy = getCopy();
	const page = store.Page.current;
	const canDirectConnect = getCanDirectConnect();
	
	return <footer className="guiding-footer">
		{ page > 0 && <LongPressButton
			onConfirm={ () => finish( { skip : true } ) }
		>{ copy.holdSkip }</LongPressButton> }
		<div className="footer-spacer" />
		{ page > 0 && <Button onClick={ goBack }>{ copy.back }</Button> }
		{ page === 1 && canDirectConnect === false && <LongPressButton
			type="primary"
			loading={ store.Status.finishing }
			onConfirm={ () => finish( { openSettings : true } ) }
		>{ copy.openSettings }</LongPressButton> }
		{ page < 2 && canDirectConnect !== false && <Button
			type="primary"
			disabled={ page === 1 && store.UIControls.network.status === 'unknown' }
			onClick={ goNext }
		>{ copy.next }</Button> }
		{ page === 2 && <LongPressButton
			type="primary"
			loading={ store.Status.finishing }
			onConfirm={ () => finish() }
		>{ copy.holdFinish }</LongPressButton> }
	</footer>;
} );

import { LongPressButton } from '#src/Views/GuidingView/components/LongPressButton';
import { reaxel_GuidingView } from '#src/Views/GuidingView/reaxels/guiding-view';
import { Button } from 'antd';
import { reaxper } from 'reaxes-react';
