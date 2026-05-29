const {
	store : { UIControls : { networks : store } } ,
	setState : { UIControls : { networks : setState } },
} = reaxel_SettingsView;

export const GlobalProxy = reaxper( () => {
	
	return <div className={ `${ less.globalProxy } settings-section` }>
		<div className="section-title"><I18n>Global Proxy</I18n></div>
		<Form layout="vertical">
			<Form.Item>
				<Radio.Group
					value={ store.proxy_mode }
					onChange={ ( e ) => {
						setState( {
							proxy_mode : e.target.value ,
						} );
					} }
					style={ { userSelect : 'none' } }
				>
					<Space direction="vertical" size={ 8 }>
						<Radio value="direct"><I18n>Direct(No Proxy)</I18n></Radio>
						<Radio value="use_system"><I18n>Follow system proxy settings</I18n></Radio>
						<Radio value="from_server_list"><I18n>Select from proxy servers</I18n></Radio>
						<Radio value="user_fill"><I18n>Manual proxy configuration</I18n></Radio>
					</Space>
				</Radio.Group>
			</Form.Item>
			<ProxyServerSelector/>
			<ManualProxy/>
		</Form>
	</div>;
} );

const ProxyServerSelector = reaxper( () => {
	if(store.proxy_mode !== 'from_server_list'){
		return null;
	}
	return <div className={ less.proxySubFields }>
		<Form.Item
			label={<I18n>Proxy Server</I18n>}
			style={ { marginBottom : 0 } }
		>
			<Select
				value={store.using_proxy_server_id}
				onChange={(value) => {
					setState({
						using_proxy_server_id: value,
					});
				}}
				placeholder={i18n('Select a proxy server')}
				variant="outlined"
			>
				{store.proxy_server_list
					.filter(server => server.enabled)
					.map(server => (
						<Select.Option
							key={server.proxy_server_id}
							value={server.proxy_server_id}
						>
							{server.server_name} ({server.proxy_conf.protocol}://{server.proxy_conf.hostname}:{server.proxy_conf.port})
						</Select.Option>
					))}
			</Select>
		</Form.Item>
	</div>;
} );

const ManualProxy = reaxper( () => {
	if(store.proxy_mode !== 'user_fill'){
		return null;
	}
	return <div className={ less.proxySubFields }>
		<Form.Item label={<I18n>Protocol</I18n>}>
			<Segmented
				value={notFalse(store.proxy_fields).protocol}
				onChange={ ( value:NetworkProxy.Protocol ) => {
					setState.proxy_fields( {
						...notFalse( store.proxy_fields ) ,
						protocol : value ,
					} );
				}}
				style={ { userSelect : 'none' } }
				options={ [
					{ label : 'HTTP' , value : 'http' } ,
					{ label : 'HTTPS' , value : 'https' } ,
					{ label : 'Socks5' , value : 'socks5' } ,
				] }
			/>
		</Form.Item>
		<Form.Item label={<I18n>Host name</I18n>}>
			<Input
				value={notFalse(store.proxy_fields).hostname }
				placeholder="127.0.0.1"
				onChange={
					( e ) => {
						setState( {
							proxy_fields:{
								...notFalse(store.proxy_fields),
								hostname : e.target.value ,
							}
						} );
					}
				}
			/>
		</Form.Item>
		<Form.Item label={<I18n>Port number</I18n>}>
			<InputNumber
				min={0}
				max={65535}
				value={ notFalse(store.proxy_fields).port }
				placeholder="7890"
				onChange={
					( value ) => {
						setState( {
							proxy_fields:{
								...notFalse(store.proxy_fields),
								port : value ,
							}
						} );
					}
				}
			/>
		</Form.Item>
		<div className={ less.noProxySection }>
			<Checkbox
				checked={ store.proxy_fields.no_proxy_for__enabled }
				onChange={ ( e ) => {
					setState( {
						proxy_fields : {
							...notFalse( store.proxy_fields ) ,
							no_proxy_for__enabled : e.target.checked ,
						} ,
					} );
				} }
				style={ { userSelect : 'none' , marginBottom : 8 } }
			><I18n>No proxy for</I18n></Checkbox>
			<AIProxySelector/>
		</div>
	</div>
} );


const AIProxySelector = reaxper( () => {
	const { AIs } = reaxel_SettingsView.store.Data;
	
	// 构建树形结构
	const treeData = AIs.filter( ai => !ai.disabled ).reduce((acc, ai) => {
		// 查找是否已存在该family节点
		let familyNode = acc.find(item => item.value === `family:${ai.AI_family}`);
		if (!familyNode) {
			familyNode = {
				label: (
					<span style={{ fontWeight: 'bold', fontSize: '14px' }}>
						<FolderOutlined style={{ marginRight: 4, color: '#1890ff' }} />
						{ai.AI_family}
					</span>
				),
				value: `family:${ai.AI_family}`,
				selectable: true,
				children: [],
			};
			acc.push(familyNode);
		}
		
		// 添加AI-name作为子节点
		familyNode.children.push({
			label: (
				<span style={{ paddingLeft: 4 }}>
					<RobotOutlined style={{ marginRight: 4, color: '#52c41a' }} />
					{ai.label}
				</span>
			),
			value: `name:${ai.id}`,
			selectable: true,
		});
		
		return acc;
	}, [] as Array<{label: React.ReactNode; value: string; selectable: boolean; children?: any[]}>);
	
	// 将存储的对象数组转换为TreeSelect需要的字符串数组格式
	const selectValue = (store.proxy_fields.no_proxy_for || []).map(item => {
		if (item.type === 'family') {
			return `family:${item.family}`;
		} else {
			return `name:${item.value}`;
		}
	});
	
	return (
		<TreeSelect
			disabled={ !store.proxy_fields.no_proxy_for__enabled }
			treeData={treeData}
			value={selectValue}
			variant="underlined"
			multiple
			treeCheckable
			showCheckedStrategy={TreeSelect.SHOW_PARENT}
			onChange={(value) => {
				// 将字符串数组转换为新的对象数组格式
				const noProxyForItems: NetworkProxy.NoProxyForItem[] = (value || []).map((val: string) => {
					if (val.startsWith('family:')) {
						const family = val.replace('family:', '');
						return {
							type: 'family' as const,
							value: family,
							id: `family_${family}`,
							family: family,
						};
					} else if (val.startsWith('name:')) {
						const aiId = val.replace('name:', '');
						const ai = AIs.find( item => item.id === aiId );
						return {
							type: 'name' as const,
							value: aiId,
							id: `name_${aiId}`,
							family: ai?.AI_family || 'unknown',
							label: ai?.label || aiId,
						};
					}
					// 不应该到达这里
					return {
						type: 'name' as const,
						value: val,
						id: val,
						family: 'unknown',
					};
				});
				
				setState.proxy_fields({
					...notFalse(store.proxy_fields),
					no_proxy_for: noProxyForItems,
				});
				
				// 打印已选项（优化版：分组显示）
				if (noProxyForItems.length > 0) {
					console.groupCollapsed('%c[No Proxy For] Selection Updated', 'color: #52c41a; font-weight: bold;');
					
					// 分类统计
					const families: string[] = [];
					const names: Array<{family: string; name: string}> = [];
					
					noProxyForItems.forEach((item) => {
						if (item.type === 'family') {
							families.push(item.family);
						} else if (item.type === 'name') {
							names.push({ family: item.family, name: item.value });
						}
					});
					
					// 打印 AI-Family 汇总
					if (families.length > 0) {
						console.log(
							`%c📁 AI-Families (${families.length}):`, 
							'color: #1890ff; font-weight: bold;',
							families.join(', ')
						);
					}
					
					// 打印 AI-Name 汇总（按 family 分组）
					if (names.length > 0) {
						const groupedByFamily = names.reduce((acc, { family, name }) => {
							if (!acc[family]) acc[family] = [];
							acc[family].push(name);
							return acc;
						}, {} as Record<string, string[]>);
						
						console.log(
							`%c🤖 AI-Names (${names.length}):`, 
							'color: #52c41a; font-weight: bold;'
						);
						
						Object.entries(groupedByFamily).forEach(([family, nameList]) => {
							console.log(`  • ${family}: ${nameList.join(', ')}`);
						});
					}
					
					// 打印 store 中的 no_proxy_for 字段（快照）
					console.log(
						`%c📋 Store no_proxy_for:`, 
						'color: #722ed1; font-weight: bold;',
						logProxy(store.proxy_fields.no_proxy_for)
					);
					
					console.groupEnd();
				} else {
					crayon.warn['#faad14']('[No Proxy For] All items cleared');
				}
			}}
			placeholder={i18n('Select AI family or AI name to bypass proxy')}
			style={{ width: '100%' }}
			treeDefaultExpandAll
		/>
	);
} );

import {
	Checkbox ,
	Form ,
	Input ,
	Radio ,
	Segmented ,
	Select ,
	Space ,
	TreeSelect,
	InputNumber
} from 'antd';
import { FolderOutlined, RobotOutlined } from '@ant-design/icons';

import { reaxper  } from 'reaxes-react';
import less from './index.module.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { crayon } from '#generics/utils/src/crayon.utility';
import { logProxy } from '#generics/utils/src/logProxy.utility';
