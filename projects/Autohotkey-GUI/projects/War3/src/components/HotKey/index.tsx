export const HotKey = reaxper( ( props:props ) => {
	
	
	const {
		children ,
		small ,
		...others
	} = props;
	
	return <span className = { less['.hot-key.small'] } { ...others }>
		{ children }
	</span>;
} );

<HotKey>打算</HotKey>

type props = React.PropsWithChildren<{
	small? : boolean,
}> & React.HTMLAttributes<any>

import less from './style.less';
