export const WechatPayQrCode = reaxper( () => {
	
	const { Sponsor_Store } = reaxel_Sponsor();
	return <div
		className="payment-content"
	>
		<Image
			src = { qrcode }
			width = "200px"
			height = "272px"
			preview = { false }
			draggable={false}
			
		/>
	</div>;
} );

export const WechatPayTitle = reaxper( () => {
	
	return <div
		className="payment-title"
	>
		<WechatFilled
			style = { { fontSize : '20px' , color : "rgb(5,193,96)" } }
		/>
		<b className='text'><I18n>WeChat Pay</I18n></b>
	</div>;
} );


import { Image } from 'antd';
import { reaxel_Sponsor } from '#renderer/reaxels/hotkey-enhancer/sponsor';
import { WechatFilled } from '@ant-design/icons';
import qrcode from './qrcode.jpg';
