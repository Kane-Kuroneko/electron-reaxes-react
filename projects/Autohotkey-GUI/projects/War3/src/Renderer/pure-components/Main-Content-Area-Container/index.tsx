export const MainConententAreaContainer = reaxper( ( props: React.PropsWithChildren ) => {
	
	
	return <div className = { less.mainContentContainer }>
		{ props.children }
	</div>;
} );


import * as less from './style.module.less';
