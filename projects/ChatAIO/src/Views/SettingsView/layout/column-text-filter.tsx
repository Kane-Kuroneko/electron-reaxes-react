/**
 * Manage AIs 表头文本筛选。
 * open/value 在 reaxel_SettingsView.UIControls.manage_AIs.column_filter（UI-only，不 persist）。
 * 面板是 reaxper，自己读 store、输入只 setState；不要用 Context / 父级 useState 灌值。
 * antd Table dataSource=[] 会把表体换成 placeholder，filterDropdown 跟表头单元格一起拆掉，
 * 所以 Input 不挂在 filterDropdown 里，而走 document.body 上的稳定 portal。
 * 点空白不关；多列可同时开。设计：docs/features/manage-ais-table-ux.md
 */

export const ColumnTextFilterPanel = reaxper( ( {
	filterKey ,
	placeholderKey ,
	className ,
	style ,
} : {
	filterKey : ManageAIsColumnFilterKey;
	placeholderKey? : string;
	className? : string;
	style? : React.CSSProperties;
} ) => {
	const value = reaxel_SettingsView.store.UIControls.manage_AIs.column_filter.value[filterKey];
	const {
		setManageAIsColumnFilterValue ,
		closeAndClearManageAIsColumnFilter ,
	} = reaxel_SettingsView();

	return <div
		className={ [ 'settings-column-text-filter' , className ].filter( Boolean ).join( ' ' ) }
		style={ style }
		onKeyDown={ e => e.stopPropagation() }
	>
		<Input
			allowClear
			autoFocus
			placeholder={ i18n( placeholderKey ?? 'Search' ) }
			value={ value }
			onChange={ e => {
				setManageAIsColumnFilterValue( filterKey , e.target.value );
			} }
		/>
		{ /* 关闭 x 相对最外层面板定位，中心对齐其右上角。见 docs/features/manage-ais-table-ux.md */ }
		<button
			type="button"
			className="settings-column-text-filter__close"
			aria-label={ i18n( 'Close filter' ) }
			onClick={ e => {
				e.preventDefault();
				e.stopPropagation();
				closeAndClearManageAIsColumnFilter( filterKey );
			} }
		>
			<CloseOutlined />
		</button>
	</div>;
} );

export const ColumnTextFilterIcon = reaxper( ( { filterKey } : { filterKey : ManageAIsColumnFilterKey } ) => {
	const open = reaxel_SettingsView.store.UIControls.manage_AIs.column_filter.open[filterKey];
	const value = reaxel_SettingsView.store.UIControls.manage_AIs.column_filter.value[filterKey];
	const active = Boolean( value.trim() ) || open;
	return <span data-manage-ais-filter-trigger={ filterKey }>
		<SearchOutlined style={ { color : active ? '#1677ff' : undefined } } />
	</span>;
} );

/**
 * 开着的列筛选面板。挂在 Table 外面、portal 到 body：空表拆 header/dropdown 也拆不掉 Input。
 */
export const ManageAIsColumnFilterOverlays = reaxper( () => {
	const open = reaxel_SettingsView.store.UIControls.manage_AIs.column_filter.open;
	const openKeys = MANAGE_AIS_COLUMN_FILTER_KEYS.filter( key => open[key] );
	if( openKeys.length === 0 || typeof document === 'undefined' ) {
		return null;
	}
	return createPortal(
		<>
			{ openKeys.map( key => (
				<ManageAIsColumnFilterOverlay
					key={ key }
					filterKey={ key }
					placeholderKey={ MANAGE_AIS_FILTER_PLACEHOLDER[key] }
				/>
			) ) }
		</> ,
		document.body ,
	);
} );

const MANAGE_AIS_FILTER_PLACEHOLDER : Record<ManageAIsColumnFilterKey , string> = {
	label : 'Search AI name' ,
	AI_family : 'Search AI family' ,
	url : 'Search AI URL' ,
};

const FILTER_OVERLAY_GAP = 4;

/**
 * 浮层相对漏斗图标右对齐：`position:fixed` 的 CSS `right` = 视口宽 − icon.right。
 * 不要用 `left = icon.right - 假定宽度`（min-width 160 不是实宽，placeholder 更宽时右边会偏）。
 * 打开 / resize / 表内 scroll.x|y 都跟 icon 的 getBoundingClientRect，不夹到离谱坐标。
 */
const ManageAIsColumnFilterOverlay = reaxper( ( {
	filterKey ,
	placeholderKey ,
} : {
	filterKey : ManageAIsColumnFilterKey;
	placeholderKey : string;
} ) => {
	/* 只存 icon 的视口坐标，不是筛选业务态。业务 open/value 在 reaxel store。 */
	const [ position , setPosition ] = React.useState< { top : number; right : number } | null >( null );

	React.useLayoutEffect( () => {
		const measure = () => {
			const trigger = document.querySelector(
				`[data-manage-ais-filter-trigger="${ filterKey }"]` ,
			) as HTMLElement | null;
			if( !trigger ) {
				return;
			}
			const rect = trigger.getBoundingClientRect();
			const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
			setPosition( prev => {
				const next = {
					top : rect.bottom + FILTER_OVERLAY_GAP ,
					right : viewportWidth - rect.right ,
				};
				if( prev && prev.top === next.top && prev.right === next.right ) {
					return prev;
				}
				return next;
			} );
		};
		measure();
		window.addEventListener( 'resize' , measure );
		window.addEventListener( 'scroll' , measure , true );
		const host = document.querySelector( '.settings-table-host' );
		const table = document.querySelector( '.manage-ais-table' );
		const trigger = document.querySelector(
			`[data-manage-ais-filter-trigger="${ filterKey }"]` ,
		);
		const ro = new ResizeObserver( measure );
		if( host ) {
			ro.observe( host );
		}
		if( table ) {
			ro.observe( table );
		}
		if( trigger ) {
			ro.observe( trigger );
		}
		return () => {
			window.removeEventListener( 'resize' , measure );
			window.removeEventListener( 'scroll' , measure , true );
			ro.disconnect();
		};
	} , [ filterKey ] );

	if( !position ) {
		return null;
	}

	return <ColumnTextFilterPanel
		filterKey={ filterKey }
		placeholderKey={ placeholderKey }
		className="settings-column-text-filter--overlay"
		style={ {
			position : 'fixed' ,
			top : position.top ,
			right : position.right ,
			left : 'auto' ,
			zIndex : 1100 ,
		} }
	/>;
} );

const emptyFilterDropdownCache = new Map<string , () => null>();
const filterIconCache = new Map<string , () => React.ReactElement>();

const getEmptyFilterDropdown = ( filterKey : string ) => {
	const cached = emptyFilterDropdownCache.get( filterKey );
	if( cached ) {
		return cached;
	}
	const render = () => null;
	emptyFilterDropdownCache.set( filterKey , render );
	return render;
};

const getColumnTextFilterIcon = ( filterKey : ManageAIsColumnFilterKey ) => {
	const cached = filterIconCache.get( filterKey );
	if( cached ) {
		return cached;
	}
	const render = () => <ColumnTextFilterIcon filterKey={ filterKey } />;
	filterIconCache.set( filterKey , render );
	return render;
};

/**
 * 只向 antd 注册表头漏斗图标。antd 的 filterDropdown 永远受控关闭：
 * 真正的 Input 在 ManageAIsColumnFilterOverlays，避免空表拆掉浮层。
 * columns 不吃筛选 value/open。
 */
export const createColumnTextFilter = <RecordType ,>(
	filterKey : ManageAIsColumnFilterKey ,
) : Pick<
	ColumnType<RecordType> ,
	'filterDropdown' | 'filterIcon' | 'filterOnClose' | 'filterDropdownProps'
> => {
	return {
		filterOnClose : false ,
		filterDropdownProps : {
			open : false ,
			destroyOnHidden : true ,
			onOpenChange : ( nextOpen : boolean ) => {
				if( nextOpen ) {
					reaxel_SettingsView().openManageAIsColumnFilter( filterKey );
				}
			} ,
		} ,
		filterDropdown : getEmptyFilterDropdown( filterKey ) ,
		filterIcon : getColumnTextFilterIcon( filterKey ) ,
	};
};

import { i18n } from '#SettingsView/reaxels/exports';
import { reaxel_SettingsView } from '#SettingsView/reaxels/settings-view';
import {
	MANAGE_AIS_COLUMN_FILTER_KEYS ,
	type ManageAIsColumnFilterKey ,
} from '#shared/utils/manage-ais-table.utility';
import { CloseOutlined , SearchOutlined } from '@ant-design/icons';
import React from 'react';
import { createPortal } from 'react-dom';
import { reaxper } from 'reaxes-react';
import {
	Input ,
	type TableColumnType as ColumnType ,
} from 'antd';
