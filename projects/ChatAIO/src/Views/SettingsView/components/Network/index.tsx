export const RCNetworkPanel = reaxper( () => {
	
	
	return <div className="settings-panel">
		<GlobalProxy />
		<ProxyServers />
	</div>;
} );


import { GlobalProxy } from './GlobalNetProxy';
import { ProxyServers } from "./ProxyServers";
