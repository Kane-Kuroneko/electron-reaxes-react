export const Boxies = reaxper( () => {
	
	
	return <div className={ less.boxies }>
		<Box
			text="Create New Channel"
			logo={ <svg
				width="50"
				height="50"
				viewBox="-1 -1 25 25"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				className="stroke-[2] "
			>
				<path
					d="M3.33965 17L11.9999 22L20.6602 17V7L11.9999 2L3.33965 7V17Z"
					stroke="currentColor"
				></path>
				<path
					d="M11.9999 12L3.4999 7M11.9999 12L12 21.5M11.9999 12L20.5 7"
					stroke="currentColor"
				></path>
			</svg> }
		/>
		<Box text="New Free Chat" />
		<Box text="Create a Knowlege Library" />
		<Box text="Create New Channel" />
	</div>;
} );

const Box = reaxper( ( props: BoxProps ) => {
	
	const mixedProps = Object.assign( {
		text : 'default text' ,
		logo : <Empty description={ null } />,
	} as Partial<BoxProps> , props );
	
	return <div className="box">
		{mixedProps.logo}
		<span className="text">{mixedProps.text}</span>
	</div>
})
export type BoxProps = {
	text : string;
	logo : React.ReactNode;
}

import { Empty } from 'antd';
import less from './style.module.less';
