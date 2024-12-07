const iconGapPX = 68;
const { I18n_Store } = reaxel_I18n();

export const RightBottomFloatButtons = reaxper( () => {
	const reax_Sponsor = reaxel_Sponsor();
	return <>
		{
			IconElements.map( ({key,Icon},index) => {
				const onclick = {
					['sponsor'](){
						reax_Sponsor.toggleVisible(true);
					}
				}[key];
				return <FloatButton
					key = { key }
					className = { less['rb-float-button'] }
					shape = "circle"
					icon = { <Icon
						onClick = { onclick }
						style = { { fontSize : '100%' } }
					/> }
					style = { { insetInlineEnd : `${ index * iconGapPX + 36 }px` } }
				/>;
			} )
		}
	</>;
} );

const IconElements = [
	{
		key : 'github' ,
		Icon : GithubFilled ,
	} ,
	{
		key : 'sponsor' ,
		get Icon() {
			return {
				"en-US" : HeartOutlined ,
				'ko-KR' : HeartOutlined ,
				'zh-CN' : RedEnvelopeOutlined ,
				'ja-JP' : HeartOutlined ,
				'zh-TW' : HeartOutlined ,
			}[I18n_Store.language];
		} ,
	} ,
];


import { reaxel_Sponsor } from '#reaxels/GUI/sponsor';
import { reaxel_I18n } from '#reaxels/i18n';
import { GithubFilled , HeartOutlined ,RedEnvelopeOutlined} from '@ant-design/icons';
import { FloatButton , Button } from 'antd';

import * as less from './style.module.less';
