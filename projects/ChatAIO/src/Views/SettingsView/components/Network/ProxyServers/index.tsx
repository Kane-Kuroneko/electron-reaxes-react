const {
	store : { UIControls : { networks : store } } ,
	setState : { UIControls : { networks : setState } },
} = reaxel_SettingsView;

const persistNow = () => {
	void reaxel_SettingsView().persistRuntimeSettings();
};

export const ProxyServers = reaxper( () => {
	const [proxyTestModal , setProxyTestModal] = React.useState<{
		visible:boolean;
		server:NetworkProxy.ProxyServer.Server | null;
	}>( {
		visible : false ,
		server : null,
	} );
	const servers = reaxel_SettingsView.store.UIControls.networks.proxy_server_list;

	return <SettingsSection
		title={ <I18n>Proxy Servers</I18n> }
		description={ <I18n>Reusable servers for the global list and per-AI overrides.</I18n> }
	>
		<div className="flex justify-end px-4 py-3">
			<Button
				variant="outline"
				onClick={ () => {
					setState.edit_proxy_server_modal( {
						visible : true ,
						mode : 'add' ,
						editing_id : uuid() ,
						fields : {
							server_name : '' ,
							enabled : true ,
							proxy_conf : defaultProxyConf(),
						},
					} );
				} }
			><I18n>Add Server</I18n></Button>
		</div>
		<div className="overflow-x-auto">
			<Table className="min-w-[620px]">
				<TableHeader>
					<TableRow>
						<TableHead><I18n>Server Name</I18n></TableHead>
						<TableHead><I18n>Enabled</I18n></TableHead>
						<TableHead><I18n>Address</I18n></TableHead>
						<TableHead><I18n>Operations</I18n></TableHead>
						<TableHead><I18n>Delete</I18n></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{ servers.map( record => (
						<TableRow key={ record.proxy_server_id }>
							<TableCell className="max-w-[160px] truncate">{ record.server_name }</TableCell>
							<TableCell>
								<Checkbox
									checked={ record.enabled }
									onCheckedChange={ ( checked ) => {
										reaxel_SettingsView.mutate( state => {
											const target = state.UIControls.networks.proxy_server_list.find( server => {
												return server.proxy_server_id === record.proxy_server_id;
											} );
											if( target ) {
												target.enabled = checked === true;
											}
											if( checked !== true ) {
												clearProxyServerReferences( state , record.proxy_server_id );
											}
										} );
										persistNow();
									} }
								/>
							</TableCell>
							<TableCell className="max-w-[220px] truncate">
								{ record.proxy_conf.protocol }://{ record.proxy_conf.hostname }:{ record.proxy_conf.port }
							</TableCell>
							<TableCell>
								<div className="flex gap-1">
									<Button
										variant="link"
										size="sm"
										onClick={ () => {
											setState.edit_proxy_server_modal( {
												visible : true ,
												mode : 'edit' ,
												editing_id : record.proxy_server_id ,
												fields : {
													server_name : record.server_name ,
													enabled : record.enabled ,
													proxy_conf : record.proxy_conf ,
												} ,
											} );
										} }
									><I18n>Edit</I18n></Button>
									<Button
										variant="link"
										size="sm"
										onClick={ () => {
											setProxyTestModal( {
												visible : true ,
												server : record,
											} );
										} }
									><I18n>Test</I18n></Button>
								</div>
							</TableCell>
							<TableCell>
								<Button
									variant="link"
									size="sm"
									className="text-destructive"
									onClick={ () => {
										reaxel_SettingsView.mutate( state => {
											state.UIControls.networks.proxy_server_list = state.UIControls.networks.proxy_server_list.filter( server => {
												return server.proxy_server_id !== record.proxy_server_id;
											} );
											clearProxyServerReferences( state , record.proxy_server_id );
										} );
										persistNow();
									} }
								><I18n>Delete</I18n></Button>
							</TableCell>
						</TableRow>
					) ) }
				</TableBody>
			</Table>
		</div>
		<ProxyServerTestModal
			visible={ proxyTestModal.visible }
			server={ proxyTestModal.server }
			onCancel={ () => {
				setProxyTestModal( {
					visible : false ,
					server : null,
				} );
			} }
		/>
		<EditProxyServerModal/>
	</SettingsSection>;
} );

const clearProxyServerReferences = (state , proxyServerId:string) => {
	const networks = state.UIControls.networks;
	if( networks.using_proxy_server_id === proxyServerId ) {
		networks.using_proxy_server_id = null;
	}
	state.Data.AIs.forEach( ai => {
		if( ai.from_server_list_proxy === proxyServerId ) {
			ai.from_server_list_proxy = null;
		}
	} );
	const fields = state.UIControls.manage_AIs.edit_AI_modal.fields;
	if( fields.from_server_list_proxy === proxyServerId ) {
		fields.from_server_list_proxy = null;
	}
};

const ProxyServerTestModal = reaxper( ( {
	visible ,
	server ,
	onCancel,
}:{
	visible:boolean;
	server:NetworkProxy.ProxyServer.Server | null;
	onCancel:() => void;
} ) => {
	return <Dialog
		open={ visible }
		onOpenChange={ ( open ) => {
			if( open === false ) onCancel();
		} }
	>
		<DialogContent className="max-w-xl">
			<DialogHeader>
				<DialogTitle>
					<I18n>Test Proxy Server</I18n>{ server ? ` - ${ server.server_name }` : '' }
				</DialogTitle>
			</DialogHeader>
			{ server ? <ProxyTestPanel proxyConf={ server.proxy_conf }/> : null }
		</DialogContent>
	</Dialog>;
} );

const ProxyTestPanel = reaxper( ( { proxyConf }:{ proxyConf:NetworkProxy.ProxyConfFields } ) => {
	const proxyTestURLs = reaxel_SettingsView.store.UIControls.networks.proxy_test_urls;

	return <div className="space-y-3">
		<ProxyTestItem
			target="foreign"
			label={ <I18n>Foreign IP URL</I18n> }
			url={ proxyTestURLs.foreign }
			proxyConf={ proxyConf }
		/>
		<ProxyTestItem
			target="domestic"
			label={ <I18n>Domestic IP URL</I18n> }
			url={ proxyTestURLs.domestic }
			proxyConf={ proxyConf }
		/>
	</div>;
} );

const ProxyTestItem = reaxper( ( {
	target ,
	label ,
	url ,
	proxyConf,
}:{
	target:NetworkProxy.ProxyTestTarget;
	label:React.ReactNode;
	url:string;
	proxyConf:NetworkProxy.ProxyConfFields;
} ) => {
	const [testing , setTesting] = React.useState( false );
	const [result , setResult] = React.useState<NetworkProxy.ProxyTestResult | null>( null );
	const {
		setProxyTestURL,
	} = reaxel_SettingsView();
	const defaultURL = defaultProxyTestURLs()[target];
	const proxyConfSnapshot = JSON.stringify( proxyConf );

	React.useEffect( () => {
		setResult( null );
	} , [url , proxyConfSnapshot] );

	const changeURL = (nextURL:string) => {
		setResult( null );
		void setProxyTestURL( target , nextURL ).catch( error => {
			toast.error( error?.message || String( error ) );
		} );
	};

	const runTest = async() => {
		setTesting( true );
		try {
			const nextResult = await testProxyServer( proxyConf , url );
			setResult( nextResult );
		} catch ( error ) {
			setResult( {
				...createLocalProxyTestDiagnostic( proxyConf ) ,
				success : false ,
				url ,
				durationMs : 0 ,
				error : error?.message || String( error ),
			} );
		} finally {
			setTesting( false );
		}
	};

	const success = result?.success === true;
	const failed = result && !result.success;
	const fallbackDiagnostic = createLocalProxyTestDiagnostic( proxyConf );
	const diagnostic = result
		? {
			proxyServer : result.proxyServer || fallbackDiagnostic.proxyServer ,
			proxyRules : result.proxyRules || fallbackDiagnostic.proxyRules ,
		}
		: null;

	return <div className={ cn(
		'rounded-md border p-3' ,
		success && 'border-emerald-500/40 bg-emerald-500/5' ,
		failed && 'border-destructive/40 bg-destructive/5',
	) }>
		<div className="mb-1 text-sm font-medium">{ label }</div>
		<div className="flex gap-2">
			<Input
				value={ url }
				onChange={ event => changeURL( event.target.value ) }
			/>
			<SimpleTooltip content={ <I18n>Reset</I18n> }>
				<Button
					variant="outline"
					size="icon"
					onClick={ () => changeURL( defaultURL ) }
				>
					<RotateCcw className="h-4 w-4" />
				</Button>
			</SimpleTooltip>
			<Button
				loading={ testing }
				onClick={ runTest }
			><I18n>Test</I18n></Button>
		</div>
		<div className="mt-2 min-h-5 text-xs text-muted-foreground">
			{ result
				? success
					? `${ i18n( 'IP Address' ) }: ${ result.ipAddress } (${ result.durationMs }ms)`
					: <>
						<div className="text-destructive">{ result.error || i18n( 'Proxy test failed' ) }</div>
						{ diagnostic ? <div className="mt-1 break-all">
							<div>{ `Proxy: ${ diagnostic.proxyServer }` }</div>
							<div>{ `Rules: ${ diagnostic.proxyRules }` }</div>
						</div> : null }
					</>
				: null }
		</div>
	</div>;
} );

const createLocalProxyTestDiagnostic = (proxyConf:NetworkProxy.ProxyConfFields) => {
	const proxyServer = `${ proxyConf.hostname }:${ proxyConf.port }`;
	return {
		proxyServer ,
		proxyRules : `${ proxyConf.protocol }://${ proxyServer }` ,
		proxyProtocol : proxyConf.protocol,
	};
};

const EditProxyServerModal = reaxper( () => {
	const {
		store : { UIControls : { networks : {edit_proxy_server_modal:store} } } ,
		setState : { UIControls : { networks : {edit_proxy_server_modal:setState} } },
	} = reaxel_SettingsView;
	const {mode} = store;

	return <Dialog
		open={ store.visible }
		onOpenChange={ ( open ) => {
			if( open === false ) {
				setState( { visible : false } );
			}
		} }
	>
		<DialogContent className="max-w-lg">
			<DialogHeader>
				<DialogTitle>{ mode === 'add' ? <I18n>Add Proxy Server</I18n> : <I18n>Edit Proxy Server</I18n> }</DialogTitle>
			</DialogHeader>
			<div className="space-y-4">
				<div className="space-y-1.5">
					<div className="text-sm font-medium"><I18n>Server name</I18n></div>
					<Input
						value={ store.fields.server_name }
						placeholder={ i18n( 'Proxy server name' ) }
						onChange={ ( e ) => {
							setState.fields( {
								server_name : e.target.value,
							} );
						} }
					/>
				</div>
				<CheckboxField
					checked={ store.fields.enabled }
					onCheckedChange={ ( checked ) => {
						setState.fields( {
							enabled : checked,
						} );
					} }
				><I18n>Enabled</I18n></CheckboxField>
				<div className="space-y-1.5">
					<div className="text-sm font-medium"><I18n>Protocol</I18n></div>
					<Segmented
						value={ store.fields.proxy_conf.protocol }
						onChange={ ( value: NetworkProxy.Protocol ) => {
							setState.fields.proxy_conf( {
								protocol : value ,
							} );
						} }
						options={ [
							{ label : 'HTTP' , value : 'http' } ,
							{ label : 'HTTPS' , value : 'https' } ,
							{ label : 'Socks5' , value : 'socks5' } ,
						] }
					/>
				</div>
				<div className="space-y-1.5">
					<div className="text-sm font-medium"><I18n>Host name</I18n></div>
					<Input
						value={ store.fields.proxy_conf.hostname }
						placeholder="127.0.0.1"
						onChange={ ( e ) => {
							setState.fields.proxy_conf( {
								hostname : e.target.value ,
							} );
						} }
					/>
				</div>
				<div className="space-y-1.5">
					<div className="text-sm font-medium"><I18n>Port number</I18n></div>
					<Input
						type="number"
						min={ 0 }
						max={ 65535 }
						value={ store.fields.proxy_conf.port ?? '' }
						placeholder="7890"
						onChange={ ( e ) => {
							setState.fields.proxy_conf( {
								port : e.target.value === '' ? null : Number( e.target.value ) ,
							} );
						} }
					/>
				</div>
				<CheckboxField
					checked={ !!store.fields.proxy_conf.proxy_auth }
					onCheckedChange={ ( checked ) => {
						setState.fields.proxy_conf( {
							proxy_auth : checked ? {
								username : '' ,
								password : '' ,
							} : false ,
						} );
					} }
				><I18n>Authentication</I18n></CheckboxField>
				{ store.fields.proxy_conf.proxy_auth ? <>
					<Separator />
					<div className="text-sm font-medium"><I18n>Auth</I18n></div>
					<Input
						value={ notFalse( store.fields.proxy_conf.proxy_auth )?.username }
						placeholder={ i18n( 'Username' ) }
						onChange={ ( e ) => {
							setState.fields.proxy_conf( {
								proxy_auth : {
									...notFalse( store.fields.proxy_conf.proxy_auth ) ,
									username : e.target.value ,
								} ,
							} );
						} }
					/>
					<Input
						type="password"
						value={ notFalse( store.fields.proxy_conf.proxy_auth )?.password }
						placeholder={ i18n( 'Password' ) }
						onChange={ ( e ) => {
							setState.fields.proxy_conf( {
								proxy_auth : {
									...notFalse( store.fields.proxy_conf.proxy_auth ) ,
									password : e.target.value ,
								} ,
							} );
						} }
					/>
				</> : null }
				<Separator />
				<div className="text-sm font-medium"><I18n>Proxy Test</I18n></div>
				<ProxyTestPanel proxyConf={ store.fields.proxy_conf }/>
			</div>
			<DialogFooter>
				<Button
					variant="outline"
					onClick={ () => setState( { visible : false } ) }
				><I18n>Cancel</I18n></Button>
				<Button
					onClick={ () => {
						reaxel_SettingsView.mutate( state => {
							const networks = state.UIControls.networks;
							const nextServer:NetworkProxy.ProxyServer.Server = {
								proxy_server_id : store.editing_id ,
								server_name : store.fields.server_name ,
								enabled : store.fields.enabled ,
								proxy_conf : store.fields.proxy_conf,
							};
							const index = networks.proxy_server_list.findIndex( server => {
								return server.proxy_server_id === store.editing_id;
							} );
							if( index === -1 ) {
								networks.proxy_server_list.push( nextServer );
							} else {
								networks.proxy_server_list[index] = nextServer;
							}
							if( !nextServer.enabled ) {
								clearProxyServerReferences( state , nextServer.proxy_server_id );
								return;
							}
							if( !networks.using_proxy_server_id ) {
								networks.using_proxy_server_id = nextServer.proxy_server_id;
							}
						} );
						setState( {
							visible : false ,
							editing_id : null,
						} );
						persistNow();
					} }
				><I18n>Save</I18n></Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>;
} );

import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
import { testProxyServer } from "#SettingsView/services/Settings";
import {
	createDefaultProxyConf as defaultProxyConf ,
	createDefaultProxyTestURLs as defaultProxyTestURLs,
} from "#shared/statics/default-proxy";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { Button } from '#Views/shared/ui/button';
import { Checkbox } from '#Views/shared/ui/checkbox';
import { CheckboxField } from '#Views/shared/ui/checkbox-field';
import { cn } from '#Views/shared/ui/cn.utility';
import {
	Dialog ,
	DialogContent ,
	DialogFooter ,
	DialogHeader ,
	DialogTitle,
} from '#Views/shared/ui/dialog';
import { Input } from '#Views/shared/ui/input';
import { Segmented } from '#Views/shared/ui/segmented';
import { Separator } from '#Views/shared/ui/separator';
import { SettingsSection } from '#Views/shared/ui/settings-row';
import {
	Table ,
	TableBody ,
	TableCell ,
	TableHead ,
	TableHeader ,
	TableRow,
} from '#Views/shared/ui/table';
import { toast } from '#Views/shared/ui/toast';
import { SimpleTooltip } from '#Views/shared/ui/tooltip';
import { RotateCcw } from 'lucide-react';
import { reaxper } from 'reaxes-react';
import { v4 as uuid } from 'uuid';
import React from 'react';
