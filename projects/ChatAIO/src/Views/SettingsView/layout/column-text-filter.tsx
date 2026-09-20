/**
 * Manage AIs 表头文本筛选。
 * open/value 在 reaxel_SettingsView.UIControls.manage_AIs.column_filter（UI-only，不 persist）。
 * 面板是 reaxper，自己读 store、输入只 setState；不要用 Context / 父级 useState 灌值。
 * Input 走 document.body 上的稳定 portal。点空白不关；多列可同时开。
 * 设计：docs/features/manage-ais-table-ux.md
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
			autoFocus
			placeholder={ i18n( placeholderKey ?? 'Search' ) }
			value={ value }
			onChange={ e => {
				setManageAIsColumnFilterValue( filterKey , e.target.value );
			} }
		/>
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
			<X className="h-3.5 w-3.5" />
		</button>
	</div>;
} );

export const ColumnTextFilterIcon = reaxper( ( { filterKey } : { filterKey : ManageAIsColumnFilterKey } ) => {
	const open = reaxel_SettingsView.store.UIControls.manage_AIs.column_filter.open[filterKey];
	const value = reaxel_SettingsView.store.UIControls.manage_AIs.column_filter.value[filterKey];
	const active = Boolean( value.trim() ) || open;
	return <button
		type="button"
		data-manage-ais-filter-trigger={ filterKey }
		className={ cn(
			'inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent' ,
			active && 'text-primary',
		) }
		onClick={ ( event ) => {
			event.preventDefault();
			event.stopPropagation();
			reaxel_SettingsView().openManageAIsColumnFilter( filterKey );
		} }
	>
		<Search className="h-3.5 w-3.5" />
	</button>;
} );

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

const ManageAIsColumnFilterOverlay = reaxper( ( {
	filterKey ,
	placeholderKey ,
} : {
	filterKey : ManageAIsColumnFilterKey;
	placeholderKey : string;
} ) => {
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

import { i18n } from '#SettingsView/reaxels/exports';
import { reaxel_SettingsView } from '#SettingsView/reaxels/settings-view';
import {
	MANAGE_AIS_COLUMN_FILTER_KEYS ,
	type ManageAIsColumnFilterKey ,
} from '#shared/utils/manage-ais-table.utility';
import { cn } from '#Views/shared/ui/cn.utility';
import { Input } from '#Views/shared/ui/input';
import { Search , X } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { reaxper } from 'reaxes-react';
