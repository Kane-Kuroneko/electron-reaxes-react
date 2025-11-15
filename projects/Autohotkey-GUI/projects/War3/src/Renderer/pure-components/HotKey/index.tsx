export const HotKey = reaxper( ( props:props ) => {
	
	
	const {
		children ,
		small ,
		className= '',
		...others
	} = props;
	
	return <span className = {`${less['hotkey']} ${small?'small':''} ${className}`} { ...others }>
		{ children }
	</span>;
} );

type props = React.PropsWithChildren<{
	small? : boolean,
}> & React.HTMLAttributes<any>

import less from './style.module.less';
