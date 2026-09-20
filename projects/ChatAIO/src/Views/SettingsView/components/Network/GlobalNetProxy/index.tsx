const {
	store : { UIControls : { networks : store } } ,
	setState : { UIControls : { networks : setState } },
} = reaxel_SettingsView;

const persistSoon = (() => {
	let timer = 0;
	return () => {
		window.clearTimeout( timer );
		timer = window.setTimeout( () => {
			void reaxel_SettingsView().persistRuntimeSettings();
		} , 400 );
	};
})();

const persistNow = () => {
	void reaxel_SettingsView().persistRuntimeSettings();
};

export const GlobalProxy = reaxper( () => {
	return <SettingsSection
		title={ <I18n>Global Proxy</I18n> }
		description={ <I18n>Default network path for AI pages that follow global settings.</I18n> }
	>
		<SettingsStack title={ <I18n>Mode</I18n> }>
			<RadioGroup
				value={ store.proxy_mode }
				className="gap-2.5"
				onValueChange={ ( value ) => {
					const proxyMode = value as NetworkProxy.GlobalProxyMode;
					const proxyServers = getEnabledProxyServers();
					setState( {
						proxy_mode : proxyMode ,
						using_proxy_server_id : proxyMode === 'from_server_list'
							? getSelectedProxyServerId( proxyServers ) || proxyServers[0]?.proxy_server_id || null
							: store.using_proxy_server_id,
					} );
					persistNow();
				} }
			>
				<RadioRow value="direct"><I18n>Direct(No Proxy)</I18n></RadioRow>
				<RadioRow value="use_system"><I18n>Follow system proxy settings</I18n></RadioRow>
				<RadioRow value="from_server_list"><I18n>Select from proxy servers</I18n></RadioRow>
				<RadioRow value="user_fill"><I18n>Manual proxy configuration</I18n></RadioRow>
			</RadioGroup>
		</SettingsStack>
		<ProxyServerSelector/>
		<ManualProxy/>
	</SettingsSection>;
} );

const getEnabledProxyServers = () => {
	return store.proxy_server_list.filter( server => server.enabled !== false );
};

const getSelectedProxyServerId = (proxyServers = getEnabledProxyServers()) => {
	return proxyServers.some( server => server.proxy_server_id === store.using_proxy_server_id )
		? store.using_proxy_server_id
		: null;
};

const ProxyServerSelector = reaxper( () => {
	if(store.proxy_mode !== 'from_server_list'){
		return null;
	}
	const proxyServers = getEnabledProxyServers();
	const selectedProxyServerId = getSelectedProxyServerId( proxyServers );
	return <SettingsRow title={ <I18n>Proxy Server</I18n> }>
		<SimpleSelect
			className="min-w-[16rem]"
			value={ selectedProxyServerId || undefined }
			placeholder={ i18n( 'Select a proxy server' ) }
			onValueChange={ ( value ) => {
				setState( {
					using_proxy_server_id : value || null,
				} );
				persistNow();
			} }
			options={ proxyServers.map( server => ( {
				value : server.proxy_server_id ,
				label : `${ server.server_name } (${ server.proxy_conf.protocol }://${ server.proxy_conf.hostname }:${ server.proxy_conf.port })`,
			} ) ) }
		/>
	</SettingsRow>;
} );

const ManualProxy = reaxper( () => {
	if(store.proxy_mode !== 'user_fill'){
		return null;
	}
	return <>
		<SettingsRow title={ <I18n>Protocol</I18n> }>
			<Segmented
				value={ notFalse( store.proxy_fields ).protocol }
				onChange={ ( value:NetworkProxy.Protocol ) => {
					setState.proxy_fields( {
						...notFalse( store.proxy_fields ) ,
						protocol : value ,
					} );
					persistNow();
				} }
				options={ [
					{ label : 'HTTP' , value : 'http' } ,
					{ label : 'HTTPS' , value : 'https' } ,
					{ label : 'Socks5' , value : 'socks5' } ,
				] }
			/>
		</SettingsRow>
		<SettingsRow title={ <I18n>Host name</I18n> }>
			<Input
				className="w-56"
				value={ notFalse( store.proxy_fields ).hostname }
				placeholder="127.0.0.1"
				onChange={ ( e ) => {
					setState( {
						proxy_fields : {
							...notFalse( store.proxy_fields ) ,
							hostname : e.target.value ,
						},
					} );
					persistSoon();
				} }
			/>
		</SettingsRow>
		<SettingsRow title={ <I18n>Port number</I18n> }>
			<Input
				className="w-28"
				type="number"
				min={ 0 }
				max={ 65535 }
				value={ notFalse( store.proxy_fields ).port ?? '' }
				placeholder="7890"
				onChange={ ( e ) => {
					const next = e.target.value === '' ? null : Number( e.target.value );
					setState( {
						proxy_fields : {
							...notFalse( store.proxy_fields ) ,
							port : next ,
						},
					} );
					persistSoon();
				} }
			/>
		</SettingsRow>
		<SettingsStack title={ <I18n>No proxy for</I18n> }>
			<CheckboxField
				checked={ store.proxy_fields.no_proxy_for__enabled }
				onCheckedChange={ ( checked ) => {
					setState( {
						proxy_fields : {
							...notFalse( store.proxy_fields ) ,
							no_proxy_for__enabled : checked ,
						} ,
					} );
					persistNow();
				} }
			><I18n>Bypass proxy for selected AI pages</I18n></CheckboxField>
			<AIProxySelector/>
		</SettingsStack>
	</>;
} );

const AIProxySelector = reaxper( () => {
	const { AIs } = reaxel_SettingsView.store.Data;
	useEffect( () => {
		void reaxel_AIFavicons().ensureLoaded();
	} , [] );

	if( !store.proxy_fields.no_proxy_for__enabled ) {
		return null;
	}

	const enabledAIs = AIs.filter( ai => !ai.disabled );
	const families = enabledAIs.reduce( ( acc , ai ) => {
		let group = acc.find( item => item.family === ai.AI_family );
		if( !group ) {
			group = { family : ai.AI_family , ais : [] };
			acc.push( group );
		}
		group.ais.push( ai );
		return acc;
	} , [] as Array<{ family: AI.AIFamily; ais: AI.AIItem[] }> );

	const selected = new Set( ( store.proxy_fields.no_proxy_for || [] ).flatMap( item => {
		if( item.type === 'family' ) {
			return [ `family:${ item.family }` ];
		}
		return [ `name:${ item.value }` ];
	} ) );

	const isFamilyChecked = ( family:string , members:AI.AIItem[] ) => {
		if( selected.has( `family:${ family }` ) ) return true;
		return members.length > 0 && members.every( ai => selected.has( `name:${ ai.id }` ) );
	};

	const writeSelection = ( nextSelected:Set<string> ) => {
		const noProxyForItems:NetworkProxy.NoProxyForItem[] = [];
		families.forEach( group => {
			const familyKey = `family:${ group.family }`;
			const allChildren = group.ais.length > 0 && group.ais.every( ai => (
				nextSelected.has( `name:${ ai.id }` ) || nextSelected.has( familyKey )
			) );
			if( nextSelected.has( familyKey ) || allChildren ) {
				noProxyForItems.push( {
					type : 'family' ,
					value : group.family ,
					id : `family_${ group.family }` ,
					family : group.family,
				} );
				return;
			}
			group.ais.forEach( ai => {
				if( nextSelected.has( `name:${ ai.id }` ) ) {
					noProxyForItems.push( {
						type : 'name' ,
						value : ai.id ,
						id : `name_${ ai.id }` ,
						family : ai.AI_family ,
						label : ai.label,
					} );
				}
			} );
		} );
		setState.proxy_fields( {
			...notFalse( store.proxy_fields ) ,
			no_proxy_for : noProxyForItems,
		} );
		persistNow();
	};

	return <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
		{ families.map( group => {
			const familyChecked = isFamilyChecked( group.family , group.ais );
			return <Collapsible
				key={ group.family }
				defaultOpen
			>
				<div className="flex items-center gap-2">
					<Checkbox
						checked={ familyChecked }
						onCheckedChange={ ( checked ) => {
							const next = new Set( selected );
							if( checked === true ) {
								next.add( `family:${ group.family }` );
								group.ais.forEach( ai => next.delete( `name:${ ai.id }` ) );
							} else {
								next.delete( `family:${ group.family }` );
								group.ais.forEach( ai => next.delete( `name:${ ai.id }` ) );
							}
							writeSelection( next );
						} }
					/>
					<CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium">
						<AIFamilyIdentity
							family={ group.family }
							size={ 15 }
						/>
					</CollapsibleTrigger>
				</div>
				<CollapsibleContent className="mt-1 space-y-1 pl-7">
					{ group.ais.map( ai => {
						const checked = familyChecked || selected.has( `name:${ ai.id }` );
						return <label
							key={ ai.id }
							className="flex cursor-pointer items-center gap-2 text-sm"
						>
							<Checkbox
								checked={ checked }
								onCheckedChange={ ( value ) => {
									const next = new Set( selected );
									next.delete( `family:${ group.family }` );
									if( familyChecked ) {
										group.ais.forEach( member => {
											if( member.id !== ai.id ) next.add( `name:${ member.id }` );
										} );
									}
									if( value === true ) {
										next.add( `name:${ ai.id }` );
										const allChildren = group.ais.every( member => member.id === ai.id || next.has( `name:${ member.id }` ) );
										if( allChildren ) {
											group.ais.forEach( member => next.delete( `name:${ member.id }` ) );
											next.add( `family:${ group.family }` );
										}
									} else {
										next.delete( `name:${ ai.id }` );
									}
									writeSelection( next );
								} }
							/>
							<AIIdentity
								ai={ ai }
								size={ 14 }
							/>
						</label>;
					} ) }
				</CollapsibleContent>
			</Collapsible>;
		} ) }
	</div>;
} );

import { AIFamilyIdentity , AIIdentity } from '#SettingsView/components/AIIdentity';
import { reaxel_AIFavicons } from '#SettingsView/reaxels/ai-favicons';
import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
import { AI } from "#src/Types/SettingsTypes/AI";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { Checkbox } from '#Views/shared/ui/checkbox';
import { CheckboxField } from '#Views/shared/ui/checkbox-field';
import {
	Collapsible ,
	CollapsibleContent ,
	CollapsibleTrigger,
} from '#Views/shared/ui/collapsible';
import { Input } from '#Views/shared/ui/input';
import {
	RadioGroup ,
	RadioRow,
} from '#Views/shared/ui/radio-group';
import { Segmented } from '#Views/shared/ui/segmented';
import { SimpleSelect } from '#Views/shared/ui/select';
import {
	SettingsRow ,
	SettingsSection ,
	SettingsStack,
} from '#Views/shared/ui/settings-row';
import { reaxper } from 'reaxes-react';
