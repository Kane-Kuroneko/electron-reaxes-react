export const AliPayQrCode = reaxper( () => {
	
	const { Sponsor_Store } = reaxel_Sponsor();
	return <div
		className="payment-content"
	>
		<Image
			src = { qrcode }
			width = "200px"
			height="311px"
			preview = { false }
			draggable={false}
		/>
	</div>;
} );

export const AliPayTitle = reaxper( () => {
	
	return <div
		className="payment-title"
	>
		<AlipayCircleFilled
			style = { { fontSize : '20px' , color : "rgb(50,122,248)" } }
		/>
		<b className='text' style={{userSelect:"none"}}><I18n>AliPay</I18n></b>
	</div>;
} );


import { Image } from 'antd';
import { reaxel_Sponsor } from '#renderer/reaxels/hotkey-enhancer/sponsor';
import { AlipayCircleFilled } from '@ant-design/icons';
import qrcode from './qrcode.jpg';
