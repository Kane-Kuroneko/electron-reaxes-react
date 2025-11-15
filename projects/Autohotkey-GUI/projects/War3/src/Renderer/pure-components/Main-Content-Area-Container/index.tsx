export const MainConententAreaContainer = reaxper( ( props: React.PropsWithChildren ) => {
	
	
	return <div className = { less.mainContentContainer }>
		{ props.children }
	</div>;
} );


import less from './style.module.less';
