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
			variant="outline"
			onConfirm={ () => finish( { skip : true } ) }
		><I18n>Hold to skip</I18n></LongPressButton> }
		<div className="footer-spacer" />
		{ page > 0 && <Button variant="outline" onClick={ goBack }><I18n>Back</I18n></Button> }
		{ page === 1 && canDirectConnect === false && <LongPressButton
			loading={ store.Status.finishing }
			onConfirm={ () => finish( { openSettings : true } ) }
		><I18n>Save and open Settings</I18n></LongPressButton> }
		{ page < 2 && <Button
			disabled={ page === 1 && store.UIControls.network.status === 'unknown' }
			onClick={ goNext }
		><I18n>Next</I18n></Button> }
		{ page === 2 && <LongPressButton
			loading={ store.Status.finishing }
			onConfirm={ () => finish() }
		><I18n>Hold to finish</I18n></LongPressButton> }
	</footer>;
} );

import { reaxel_GuidingView } from '#GuidingView/reaxels/guiding-view';
import { I18n } from '#GuidingView/reaxels/exports';
import { Button } from '#Views/shared/ui/button';
import { LongPressButton } from '#Views/shared/ui/long-press-button';
import { reaxper } from 'reaxes-react';
