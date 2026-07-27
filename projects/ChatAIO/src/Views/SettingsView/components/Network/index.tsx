export const RCNetworkPanel = reaxper( () => {
	return <>
		<GlobalProxy />
		<ProxyServers />
	</>;
} );


import { GlobalProxy } from './GlobalNetProxy';
import { ProxyServers } from "./ProxyServers";
