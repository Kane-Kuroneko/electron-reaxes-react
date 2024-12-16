const iconGapPX = 68;
const { I18n_Store } = reaxel_I18n();

export const RightBottomFloatButtons = reaxper( () => {
	
	return <>
		{
			IconElements.map( ( { key , Icon , tooltip,onClick } , index ) => {
				return <Tooltip
					key = { key }
					placement = "top"
					title = { tooltip }
				>
					<FloatButton
						onClick = { onClick }
						className = { less['rb-float-button'] }
						shape = "circle"
						icon = { <Icon /> }
						style = { { insetInlineEnd : `${ index * iconGapPX + 36 }px` , zIndex : 1000 } }
					/>
				</Tooltip>;
			} )
		}
		<FloatLog />
	</>;
} );

const IconElements = [
	{
		key : 'github' ,
		get tooltip (){
			return i18n( 'View On Github' );
		},
		onClick(){
			window.open( 'https://github.com' );
		},
		Icon : reaxper(() => {
			return <GithubFilled />;
		})
	} ,
	{
		key : 'sponsor' ,
		get tooltip(){
			return i18n( 'Donate to This Project' );
		},
		onClick() {
			const reax_Sponsor = reaxel_Sponsor();
			reax_Sponsor.toggleVisible( true );
		},
		Icon :  reaxper(() => {
			const I = {
				"en-US" : HeartOutlined ,
				'ko-KR' : HeartOutlined ,
				'zh-CN' : RedEnvelopeOutlined ,
				'ja-JP' : HeartOutlined ,
				'zh-TW' : HeartOutlined ,
			}[I18n_Store.language];
			
			return <I />;
		}) ,
	} ,
];

import { FloatLog } from './Float-Log';
import { reaxel_Sponsor } from '#reaxels/GUI/sponsor';
import { reaxel_I18n } from '#reaxels/i18n';
import { GithubFilled , HeartOutlined , RedEnvelopeOutlined } from '@ant-design/icons';
import { FloatButton , Button , Tooltip } from 'antd';

import * as less from './style.module.less';
