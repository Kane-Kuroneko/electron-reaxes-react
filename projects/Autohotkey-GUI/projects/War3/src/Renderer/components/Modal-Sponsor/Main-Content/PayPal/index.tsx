export const PayPalQrCode = reaxper( () => {
	
	return <div
		className = "payment-content paypal"
	>
		<a
			className = "link"
			onClick = { ( e ) => {
				e.preventDefault();
				if( isBrowser ) {
					window.open( paypalAddress );
				} else {
					IpcRendererSend( 'open-url' ).send( paypalAddress );
				}
			} }
		>
			{paypalAddress}
		</a>
		<Button
			type = "primary"
			style = { { marginLeft : '8px' } }
			onClick = { async () => {
				console.log('isBrowser',isBrowser);
				if( isBrowser ) {
					if( copyToClipboard( paypalAddress ) ) {
						message.success( i18n( 'copied successfully' ) );
					} else {
						message.error( i18n( 'copy failed, please copy manually' ) );
					}
				} else {
					IpcRendererInvoke( 'clipboard' ).invoke( {
						operation : "write" ,
						value : paypalAddress ,
					} ).then(() => {
						message.success( i18n( 'copied successfully' ) );
					}).catch(e => {
						message.error( i18n( 'copy failed, please copy manually' ) );
					});
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

const paypalAddress = 'https://www.paypal.com/paypalme/kuronekokane';


import { reaxel_Sponsor } from '#renderer/reaxels/hotkey-enhancer/sponsor';
import { IpcRendererSend ,IpcRendererInvoke} from '#renderer/utils/useIPC';
import copyToClipboard from 'copy-to-clipboard';
import { isBrowser } from '#renderer/ENV';
import { Button , message } from 'antd';
import Icon from '@ant-design/icons';
import { SVG_PayPal } from '#renderer/pure-components/SVG/PayPal.component';
