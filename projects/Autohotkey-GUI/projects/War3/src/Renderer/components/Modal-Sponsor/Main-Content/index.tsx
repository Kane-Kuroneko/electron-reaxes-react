@reaxper
export class Payment extends React.Component {
	
	render() {		
		return <div className = "payment">
			<h1><I18n>Choose a donation channel</I18n></h1>
			<Collapse
				items = { collapseItems }
				activeKey = { reaxel_Sponsor.store.Collapse_expaned_keys }
				onChange={(keys) => {
					reaxel_Sponsor.setState( { Collapse_expaned_keys : keys } );
				}}
				accordion
			>
			
			</Collapse>
		</div>;
	}
}

@reaxper
export class Narrative extends React.Component {
	static 'zh-CN'(){
		return <div className = "narrative">
			<h1>你知道吗?</h1>
			<h2>为作者捐赠会带来包括但不限于以下好处：</h2>
			<ol type="I">
				<li>作者将会投入更多的时间持续改进此项目，修复bug以及添加更牛逼的功能</li>
				<li>慷慨的捐赠数额可以让此应用不需要展示广告而保持干净简洁</li>
				<li>作者将用捐赠资金研发用于支持此项目核心逻辑的JavaScript开源库，如 <code>reaxes</code>，<code>reaxes-react</code>，<code>reaxel-i18n</code>等。</li>
				<li>成为开源项目的捐赠者并展示在页面上，这本身就很炫酷了不是吗</li>
			</ol>
			<h1>鸣谢</h1>
			<ol>
				<li>
					感谢以下开源库/工具：Electron、React、Antd、AutoHotKey、ChatGPT
				</li>
				<li>
					感谢DaotionLab为reaxes系列库的诞生提供契机
				</li>
			</ol>
		</div>;
	}
	static 'en-US'(){
		return <div className = "narrative">
			<h1>Do you know ?</h1>
			<h2>Donating to the author brings the following benefits, including but not limited to:</h2>
			<ol type = "I">
				<li>The author will dedicate more time to continuously improving this project, fixing bugs, and adding even more powerful features.</li>
				<li>A generous donation amount allows the app to remain ad-free, keeping it clean and simple.</li>
				<li>The author will use the donation funds to develop JavaScript open-source libraries that support the core logic of this project, such as <code>reaxes</code>, <code>reaxes-react</code>, <code>reaxel-i18n</code>, and more.</li>
				<li>Being a donor to an open-source project and having your name displayed on the page is pretty cool, don't you think?</li>
			</ol>
			<h1>Acknowledgments</h1>
			<ol>
				<li>
					Thanks to the following open-source libraries/tools: Electron, React, Antd, AutoHotKey, ChatGPT.
				</li>
				<li>
					Special thanks to DaotionLab for providing the opportunity that led to the creation of the reaxes library series.
				</li>
			</ol>
		</div>;
	}
	
	render() {
		const { language } = reaxel_I18n();
		return Narrative[language]?.();
	}
}


@reaxper
export class MainContent extends React.Component {
	
	render() {
		return <div className = { less.sponsorMainContent }>
			<Narrative />
			<VerticalDiver />
			<Payment />
		</div>;
	}
}

const collapseItems: CollapseProps["items"] = [
	{
		key : 'alipay' ,
		label : <AliPayTitle /> ,
		children : <AliPayQrCode /> ,
	} ,
	{
		key : 'wechatpay' ,
		label : <WechatPayTitle /> ,
		children : <WechatPayQrCode /> ,
	} ,
	{
		key : 'paypal' ,
		label : <PayPalTitle /> ,
		children : <PayPalQrCode /> ,
	} ,
];
import { PayPalTitle , PayPalQrCode } from './PayPal';
import { AliPayQrCode , AliPayTitle } from './AliPay';
import { WechatPayTitle , WechatPayQrCode } from './WechatPay';
import { AlipayCircleFilled , WechatFilled  } from '@ant-design/icons';
import { CollapseProps , Collapse , Button , Flex , QRCode , Divider } from 'antd';
import { reaxel_I18n } from '#renderer/reaxels/i18n';
import { reaxel_Sponsor } from '#renderer/reaxels/hotkey-enhancer/sponsor';
import { VerticalDiver } from '#renderer/pure-components/Vertical-Diver';
import * as less from './style.module.less';
