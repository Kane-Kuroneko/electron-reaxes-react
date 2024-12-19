const iconGapPX = 68;
const { I18n_Store } = reaxel_I18n();

export const FloatButtons = reaxper( () => {
	
	return <>
		{
			IconElements.map( ( { key , Icon , Tooltip,onClick } , index ) => {
				return <Tooltip
					key = { key }
					placement = "top"
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
		<FloatResetAllConf/>
	</>;
} );

const IconElements = [
	{
		key : 'github' ,
		Tooltip : reaxper((props:TooltipProps) => {
			return <Tooltip
				{...props}
				title={<Button.Group>
					<Button><I18n>View On Github</I18n></Button>
				</Button.Group>}
				color={'white'}
				
			>{ props.children }</Tooltip>;
		}),
		onClick(){
			window.open( 'https://github.com' );
		},
		Icon : reaxper(() => {
			return <GithubFilled />;
		})
	} ,
	{
		key : 'sponsor' ,
		Tooltip : reaxper((props:TooltipProps) => {
			return <Tooltip
				{...props}
				title={i18n( 'Donate to This Project' )}
			>{ props.children }</Tooltip>;
		}),
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

import { FloatResetAllConf } from './left/Reset-All-Conf';
import { FloatLog } from './Float-Log';
import { reaxel_Sponsor } from '#reaxels/GUI/sponsor';
import { reaxel_I18n } from '#reaxels/i18n';
import { GithubFilled , HeartOutlined , RedEnvelopeOutlined } from '@ant-design/icons';
import { FloatButton , Button , Tooltip , TooltipProps } from 'antd';

import * as less from './style.module.less';
