export const ModalSponsor = reaxper( () => {
	
	const {
		visible ,
		termsVisible ,
		toggleVisible ,
		toggleTermsVisible ,
	} = reaxel_Sponsor();
	const { language } = reaxel_I18n();
	
	return <>
		
		<Modal
			closable = { termsVisible ? false : true }
			title = { i18n( 'Donate to This Project' ) }
			open = { visible }
			onClose = { () => toggleVisible( false ) }
			onCancel = { () => {
				if( termsVisible ) {
					return;
				}
				toggleVisible( false );
			} }
			footer = { null }
			className = { less.sponsorModal }
			height = "92%"
			width = "92%"
			centered
		>
			{ termsVisible && TermsI18n[language] }
			{ termsVisible && <Button
				type = "primary"
				size="large"
				style = { { display : 'block' , margin : '40px auto 10px auto' } }
				onClick = { () => {
					reaxel_Sponsor().toggleTermsVisible( false );
				} }
			><I18n>By donating, you agree to these terms</I18n></Button> }
			
			{ !termsVisible && <a
				onClick = { ( e ) => {
					e.preventDefault();
					toggleTermsVisible( true );
				} }
			>
				<I18n>Donation Guidelines and Terms</I18n>
			</a> }
		</Modal>
	</>;
} );

@reaxper
class SponsorContent {
	
	'zh-CN' = <>
	
	</>;
}

@reaxper
class TermsI18n {
	
	static 'en-US' = <>
		<div className = "terms-container">
			<h1>Donation Terms</h1>
			<p>Thank you for your support! Please read the following terms carefully before donating to this project (
				<b>war3-ahk-reaxes</b>
			   ).
			</p>
			
			<h2>1. Voluntary Donation</h2>
			<p>All donations are made voluntarily and do not constitute an exchange for any goods or services.</p>
			
			<h2>2. Donation Usage</h2>
			<p>Your donation will be used for the following purposes:</p>
			<ul>
				<li>Essential living expenses of the developer</li>
				<li>Project improvements and future development</li>
				<li>(Potentially in the future) Donations to other open-source contributors</li>
			</ul>
			
			<h2>3. Non-Refundable Policy</h2>
			<p>Once a donation is successfully made, it is non-refundable (except in cases of system errors leading to duplicate donations).</p>
			
			<h2>4. Donor Information</h2>
			<p>
				If you wish to display your donation information publicly, please specify your desired name or nickname in the
				<span className = "highlight">payment note</span>. Otherwise, donor information will not be displayed by default.
				<br />
				Public donation details will be updated on the donor page within 48-72 hours.
				<br />
				(If you forgot to leave a note during payment, you can contact me via email to add it later. Please provide the payment time and amount.)
			</p>
			
			<h2>5. Disclaimer</h2>
			<p>We cannot guarantee that donated funds will be used exactly according to the expected timeline or outcomes.</p>
			
			<h2>6. Right to Adjust</h2>
			<p>We reserve the right to adjust the usage of funds as needed.</p>
			
			<h2>7. Contact Information</h2>
			<p>If you have any questions, feel free to contact us via email:
				<a href = "mailto:kane.kuroneko@gmail.com">kane.kuroneko@gmail.com</a>.
			</p>
			
			<div className = "footer">
				&copy; 2024 war3-ahk-reaxes. All rights reserved.
			</div>
		
		</div>
		
	</>;
	
	static 'zh-CN' = <>
		<div className = "terms-container">
			<h1>捐赠条款</h1>
			<p>感谢您的支持！在捐赠本项目（
				<b>war3-ahk-reaxes</b>
			   ）前，请仔细阅读以下条款。
			</p>
			
			<h2>1. 自愿捐赠</h2>
			<p>所有捐赠均为自愿行为，不构成任何货物或服务的交换。</p>
			
			<h2>2. 捐赠用途</h2>
			<p>您的捐赠将用于以下用途：</p>
			<ul>
				<li>开发者的必要生活支出</li>
				<li>项目改进及未来开发</li>
				<li>（未来可能的）向其他开源作者捐赠</li>
			</ul>
			
			<h2>3. 不可退款政策</h2>
			<p>一旦捐赠成功，款项不可退款。（发生系统错误导致重复捐赠除外）</p>
			
			<h2>4. 捐赠者信息</h2>
			<p>
				若希望将您的捐赠信息展示于页面上（公开捐赠），请在
				<span className = "highlight">支付备注</span>
				上填写希望展示的姓名或昵称，否则默认不展示捐赠者信息。
				<br />
				公开捐赠成功后信息将在48-72小时更新在捐赠者页面上
				<br />
				（若您在付款时忘记备注，也可以邮件联系我为您补上，需您提供付款时间和金额）
			</p>
			
			<h2>5. 免责声明</h2>
			<p>我们无法保证捐赠资金将完全按预期的时间表或效果使用。</p>
			
			<h2>6. 保留权利</h2>
			<p>我们保留根据需要调整资金使用方式的权利。</p>
			
			<h2>7. 联系方式</h2>
			<p>如有任何疑问，欢迎通过邮箱联系我们：
				<a href = "mailto:kane.kuroneko@gmail.com">kane.kuroneko@gmail.com</a>
			   。
			</p>
			
			<div className = "footer">
				&copy; 2024 war3-ahk-reaxes。版权所有。
			</div>
		
		</div>
		{/*<Button*/}
		{/*	type = "primary"*/}
		{/*	style = { { display : 'block' , margin : '40px auto' } }*/}
		{/*	onClick = { () => {*/}
		{/*		reaxel_Sponsor().toggleTermsVisible( false );*/}
		{/*	} }*/}
		{/*>若发生捐赠行为则默认您同意此条款</Button>*/}
	</>;
}

console.log( less );
import { reaxel_I18n } from '#reaxels/i18n';
import * as less from './style.module.less';
import { reaxel_Sponsor } from '#reaxels/GUI/sponsor';
import { Modal , Button } from 'antd';

