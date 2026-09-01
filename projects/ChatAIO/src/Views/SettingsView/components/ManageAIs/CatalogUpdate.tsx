/**
 * Settings → Manage AIs：手动检查供应商目录更新。
 * 业务在 reaxel_SettingsView（checkAiCatalog / applyAiCatalog）；这里只渲染。
 * 见 docs/features/ai-catalog-manual-update.md
 */

export const CatalogUpdateControls = reaxper( () => {
	const {
		checkAiCatalog ,
		applyAiCatalog ,
		dismissCatalogUpdate ,
	} = reaxel_SettingsView();
	const catalogUpdate = reaxel_SettingsView.store.UIControls.manage_AIs.catalog_update;
	const preview = catalogUpdate.preview;
	const previewRef = useRef( preview );
	if( preview != null ) {
		previewRef.current = preview;
	}
	const shown = preview != null ? preview : previewRef.current;
	const ais = reaxel_SettingsView.store.Data.AIs;
	const language = reaxel_I18n.store.language;

	const catalogErrorMessage = ( errorCode?:AICatalog.CatalogUpdateErrorCode ) => {
		switch( errorCode ) {
			case 'schema-too-new':
				return i18n( 'Please update the app to use this catalog' );
			case 'verify-failed':
				return i18n( 'Catalog signature is invalid' );
			case 'forbidden-url':
			case 'network':
				return i18n( 'Could not reach the catalog server' );
			case 'invalid-catalog':
				return i18n( 'This catalog is not valid' );
			case 'no-pending':
				return i18n( 'Catalog check expired; check again' );
			default:
				return i18n( 'Failed to check AI catalog' );
		}
	};

	const onCheck = async() => {
		try {
			const result = await checkAiCatalog();
			if( 'blocked' in result ) {
				message.warning( i18n( 'Save or discard Settings changes before checking the AI catalog' ) );
				return;
			}
			if( result.status === 'error' ) {
				message.error( catalogErrorMessage( result.errorCode ) );
				return;
			}
			if( result.status === 'up-to-date' ) {
				message.success( i18n( 'AI catalog is up to date' ) );
			}
		} catch ( error ) {
			console.error( '[ManageAIs] check AI catalog failed:' , error );
			message.error( i18n( 'Failed to check AI catalog' ) );
		}
	};

	const onApply = async() => {
		try {
			const result = await applyAiCatalog();
			if( 'blocked' in result ) {
				message.warning( i18n( 'Save or discard Settings changes before checking the AI catalog' ) );
				return;
			}
			if( !result.success ) {
				message.error(
					result.errorCode
						? catalogErrorMessage( result.errorCode )
						: i18n( 'Failed to apply AI catalog' ),
				);
				return;
			}
			message.success( i18n( 'Update applied' ) );
		} catch ( error ) {
			console.error( '[ManageAIs] apply AI catalog failed:' , error );
			message.error( i18n( 'Failed to apply AI catalog' ) );
		}
	};

	const diff = shown?.diff;
	const availability = diff != null ? diff.availability : [];
	const hasPageDiff = diff != null && (
		diff.added.length > 0
		|| diff.updated.length > 0
		|| diff.skipped.length > 0
		|| diff.catalogDropped.length > 0
	);
	const hasAvailabilityDiff = availability.length > 0;
	const hasAnyDiff = hasPageDiff || hasAvailabilityDiff;

	return <>
		<Button
			onClick={ () => {
				void onCheck();
			} }
			loading={ catalogUpdate.checking }
			disabled={ catalogUpdate.applying }
			style={ { marginBottom : 16 , marginLeft : 8 } }
		><I18n>Check AI catalog</I18n></Button>
		<Modal
			open={ preview != null }
			title={ <I18n>There's an update to the AI list</I18n> }
			onCancel={ catalogUpdate.applying ? undefined : dismissCatalogUpdate }
			afterClose={ () => {
				previewRef.current = null;
			} }
			onOk={ () => {
				void onApply();
			} }
			okText={ i18n( 'Apply update' ) }
			confirmLoading={ catalogUpdate.applying }
			maskClosable={ !catalogUpdate.applying }
			keyboard={ !catalogUpdate.applying }
			cancelButtonProps={ { disabled : catalogUpdate.applying } }
			width={ 560 }
		>
			{ hasAnyDiff ? <>
				<p style={ { marginBottom : 12 } }>
					<I18n>Here's what changed:</I18n>
				</p>
				{ diff != null && diff.added.length > 0 ? <DiffSection title={ i18n( 'These AI pages will be added' ) }>
					{ diff.added.map( ai => (
						<li key={ ai.id }>{ ai.label }{ ai.url !== '' ? ` — ${ ai.url }` : '' }</li>
					) ) }
				</DiffSection> : null }
				{ diff != null && diff.updated.length > 0 ? <DiffSection title={ i18n( 'Name or website will change' ) }>
					{ diff.updated.map( row => (
						<li key={ row.before.id }>
							{ row.after.label }
							{ row.fields.includes( 'url' ) ? ` · ${ row.before.url } → ${ row.after.url }` : '' }
							{ row.fields.includes( 'label' ) && row.before.label !== row.after.label
								? ` · ${ row.before.label } → ${ row.after.label }`
								: '' }
						</li>
					) ) }
				</DiffSection> : null }
				{ hasAvailabilityDiff ? <DiffSection title={ i18n( 'Where you can use these AIs has changed' ) }>
					{ availability.map( row => (
						<li key={ row.id }>
							<div>{ row.label }</div>
							{ row.forbiddenAdded.length > 0 ? <div>
								{ i18n( 'Won\'t work in:' ) } { formatCountryList( row.forbiddenAdded , language ) }
							</div> : null }
							{ row.forbiddenRemoved.length > 0 ? <div>
								{ i18n( 'Can be used again in:' ) } { formatCountryList( row.forbiddenRemoved , language ) }
							</div> : null }
							{ row.availableChanged && row.availableAfter.length > 0 ? <div>
								{ i18n( 'Now only available in:' ) } { formatCountryList( row.availableAfter , language ) }
							</div> : null }
							{ row.availableChanged && row.availableAfter.length === 0 ? <div>
								{ i18n( 'No longer limited to certain countries' ) }
							</div> : null }
						</li>
					) ) }
				</DiffSection> : null }
				{ diff != null && diff.skipped.length > 0 ? <DiffSection title={ i18n( 'These pages will keep your current settings' ) }>
					{ diff.skipped.map( row => (
						<li key={ row.id }>{ skippedLabel( ais , row.id , row.reason ) }</li>
					) ) }
				</DiffSection> : null }
				{ diff != null && diff.catalogDropped.length > 0 ? <DiffSection title={ i18n( 'ChatAIO no longer maintains this listing. Existing local data will be kept.' ) }>
					{ diff.catalogDropped.map( row => (
						<li key={ row.id }>{ droppedLabel( ais , row.id ) }</li>
					) ) }
				</DiffSection> : null }
				{ !hasPageDiff && hasAvailabilityDiff ? <p>
					<I18n>Existing AI page settings will not be changed.</I18n>
				</p> : null }
			</> : <>
				<p style={ { marginBottom : 8 } }>
					<I18n>Comparison complete. No AI pages were added or changed.</I18n>
				</p>
				<p>
					<I18n>Applying this update will only add new AI providers. Existing settings will not be changed.</I18n>
				</p>
			</> }
		</Modal>
	</>;
} );

const DiffSection = ( { title , children }:{ title:string; children:React.ReactNode } ) => {
	return <div style={ { marginBottom : 12 } }>
		<div style={ { fontWeight : 600 , marginBottom : 6 } }>{ title }</div>
		<ul style={ { margin : 0 , paddingLeft : 18 } }>{ children }</ul>
	</div>;
};

const skippedLabel = ( ais:AI.AIItem[] , id:string , reason:AICatalog.MergeSkipReason ) => {
	const ai = ais.find( item => item.id === id );
	const name = ai?.label || id;
	if( reason === 'url-override' ) {
		return `${ name } — ${ i18n( 'Your custom page settings will be kept.' ) }`;
	}
	if( reason === 'custom-id' ) {
		return `${ name } — ${ i18n( 'This page was created by the user.' ) }`;
	}
	return `${ name } — ${ i18n( 'Your changes will be kept.' ) }`;
};

const droppedLabel = ( ais:AI.AIItem[] , id:string ) => {
	const ai = ais.find( item => item.id === id );
	return ai?.label || id;
};

const formatCountryName = ( code:string , locale:string ):string => {
	try {
		return new Intl.DisplayNames( [ locale ] , { type : 'region' } ).of( code ) || code;
	} catch {
		return code;
	}
};

const formatCountryList = ( codes:string[] , locale:string ):string => {
	const joiner = locale.startsWith( 'zh' ) || locale === 'ja-JP' ? '、' : ', ';
	return codes.map( code => formatCountryName( code , locale ) ).join( joiner );
};

import { reaxel_I18n } from "#SettingsView/reaxels/i18n";
import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
import type { AICatalog } from "#src/Types/AICatalog";
import type { AI } from "#src/Types/SettingsTypes/AI";
import { reaxper } from 'reaxes-react';
import {
	Button ,
	message ,
	Modal,
} from 'antd';
