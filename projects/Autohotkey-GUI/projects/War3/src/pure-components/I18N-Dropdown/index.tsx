export const I18NDropdown = reaxper(() => {
	
	
	return <span className={less['i18nDropdown']}>
		<Dropdown
			menu = { {
				items : menu ,
			} }
			trigger={['click']}
		>
			<a onClick = { ( e ) => e.preventDefault() }>
				English
			</a>
		</Dropdown>
	</span>;
})

const menu = [
	{
		key : '1' ,
		label : (
			<a
				target = "_blank"
				rel = "noopener noreferrer"
			>
				English
			</a>
		) ,
	} ,
	{
		key : '2' ,
		label : (
			<a
				target = "_blank"
				rel = "noopener noreferrer"
			>
				Korean
			</a>
		) ,
		
		
	} ,
	{
		key : '3' ,
		label : (
			<a
				target = "_blank"
				rel = "noopener noreferrer"
			>
				Traditional Chinese
			</a>
		) ,
		
	} ,
	{
		key : '4' ,
		
		label : (
			<a
				target = "_blank"
				rel = "noopener noreferrer"
			>
				simplified Chinese
			</a>
		) ,
	} ,
];

type props = React.PropsWithChildren<{
	
	
}>;


import * as less from './style.module.less';
import { Dropdown } from 'antd';
