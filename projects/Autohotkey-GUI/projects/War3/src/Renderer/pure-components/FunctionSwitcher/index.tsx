export const FunctionSwitcher = reaxper( ( props: props ) => {
	
	
	return <span className = { style['switchTitle'] }>
		<Switch
			value = { props.value }
			onChange = { props.onChange }
		/>
		<span className={style['title']}>{ props.children }</span>
	</span>;
} );


type props = React.PropsWithChildren<{
	value?: boolean;
	onChange?: SwitchProps['onChange'];
}>;

console.log(style);
import {Switch,SwitchProps} from 'antd';
// import {} from '';
import style from './style.module.less';
