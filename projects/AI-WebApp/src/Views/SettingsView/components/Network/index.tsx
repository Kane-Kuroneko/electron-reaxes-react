export const RCNetworkPanel = reaxper( () => {
	
	
	return <div
		style={ {
			display : 'flex' ,
			flexFlow : 'column nowrap' ,
		} }
	>
		<GlobalProxy />
		<ProxyServers />
	</div>;
} );


import { GlobalProxy } from './GlobalNetProxy';
import { ProxyServers } from "./ProxyServers";

