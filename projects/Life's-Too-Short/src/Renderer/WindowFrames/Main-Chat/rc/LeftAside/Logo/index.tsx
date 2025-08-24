export const Logo = reaxper( () => {
	
	const navigate = useNavigate();
	
	return <div className={ less.logo }>
		<span
			className="title"
			onClick={() => {
				navigate('/')
			}}
		>Life's Too Short AI</span>
		<UpdateIcon
			style={ {
				zoom : '0.3' ,
				position : "absolute" ,
				right : 0 ,
				top : -48 ,
			} }
		/>
		<AppVersion />
	</div>;
} );

import { useNavigate } from 'react-router-dom';
import { AppVersion } from '#Main-Chat/rc/App-Version';
import { UpdateIcon } from '#Main-Chat/rc/Update-Icon';
import less from './style.module.less';
