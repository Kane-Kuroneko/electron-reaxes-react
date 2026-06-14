export const RCGuidingFooter = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		finish ,
		getCanDirectConnect ,
		goBack ,
		goNext,
	} = reaxel_GuidingView();
	const page = store.Page.current;
	const canDirectConnect = getCanDirectConnect();
	
	return <footer className="guiding-footer">
		{ page > 0 && <LongPressButton
			onConfirm={ () => finish( { skip : true } ) }
		><I18n>Hold to skip</I18n></LongPressButton> }
		<div className="footer-spacer" />
		{ page > 0 && <Button onClick={ goBack }><I18n>Back</I18n></Button> }
		{ page === 1 && canDirectConnect === false && <LongPressButton
			type="primary"
			loading={ store.Status.finishing }
			onConfirm={ () => finish( { openSettings : true } ) }
		><I18n>Save and open Settings</I18n></LongPressButton> }
		{ page < 2 && <Button
			type="primary"
			disabled={ page === 1 && store.UIControls.network.status === 'unknown' }
			onClick={ goNext }
		><I18n>Next</I18n></Button> }
		{ page === 2 && <LongPressButton
			type="primary"
			loading={ store.Status.finishing }
			onConfirm={ () => finish() }
		><I18n>Hold to finish</I18n></LongPressButton> }
	</footer>;
} );

import { LongPressButton } from '#src/Views/GuidingView/components/LongPressButton';
import { reaxel_GuidingView } from '#src/Views/GuidingView/reaxels/guiding-view';
import { I18n } from '#src/Views/GuidingView/reaxels/exports';
import { Button } from 'antd';
import { reaxper } from 'reaxes-react';
