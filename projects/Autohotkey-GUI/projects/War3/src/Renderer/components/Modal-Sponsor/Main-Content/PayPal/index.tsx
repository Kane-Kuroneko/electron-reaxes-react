export const PayPalQrCode = reaxper( () => {
	
	const { Sponsor_Store } = reaxel_Sponsor();
	return <div
		className = "payment-content paypal"
	>
		<a
			className = "link"
			onClick = { ( e ) => {
				e.preventDefault();
				if( isBrowser ) {
					window.open( 'https://www.paypal.com/paypalme/kuronekokane' );
				} else {
					IpcRendererSend( 'open-url' ).send( 'https://www.paypal.com/paypalme/kuronekokane' );
				}
			} }
		>
			https://www.paypal.com/paypalme/kuronekokane
		</a>
		<Button
			type = "primary"
			style = { { marginLeft : '8px' } }
			onClick = { () => {
				if( isBrowser ) {
					if( copyToClipboard( "https://www.paypal.com/paypalme/kuronekokane" ) ) {
						message.success( i18n( 'copied successfully' ) );
					} else {
						message.error( i18n( 'copy failed, please copy manually' ) );
					}
				} else {
					IpcRendererSend( 'clipboard' ).send( {
						operation : "write" ,
						value : "https://www.paypal.com/paypalme/kuronekokane" ,
					} );
				}
			} }
		><I18n>Copy</I18n></Button>
	</div>;
} );

export const PayPalTitle = reaxper( () => {
	
	return <div
		className = "payment-title"
	>
		<Icon
			component = { SVG_PayPal }
			style = { { fontSize : '20px' } }
		/>
		<b className = "text"><I18n>PayPal</I18n></b>
	</div>;
} );

import { reaxel_Sponsor } from '#renderer/reaxels/hotkey-enhancer/sponsor';
import { IpcRendererSend } from '#renderer/utils/useIPC';
import copyToClipboard from 'copy-to-clipboard';
import { isBrowser } from '#renderer/ENV';
import { Button , message } from 'antd';
import Icon from '@ant-design/icons';
import { SVG_PayPal } from '#renderer/pure-components/SVG/PayPal.component';
