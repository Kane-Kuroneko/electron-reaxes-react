/**
 * Settings → Manage AIs：手动检查供应商目录更新。
 * 业务在 reaxel_SettingsView（checkAiCatalog / applyAiCatalog）；这里只渲染。
 * 见 docs/features/ai-catalog-manual-update.md
 * 检查按钮不用 antd `loading`（会插入 icon 撑宽）。文案占位，spinner 叠在同一格。
 * checking 只转按钮，不锁侧栏/页脚；预览 Dialog 打开或 applying 才锁 chrome。
 */

export const CatalogUpdateControls = reaxper( () => {
	const {
		checkAiCatalog ,
		applyAiCatalog ,
		dismissCatalogUpdate ,
	} = reaxel_SettingsView();
	const catalogUpdate = reaxel_SettingsView.store.UIControls.manage_AIs.catalog_update;
	const preview = catalogUpdate.preview;
	// 仅给 Dialog 关动画留最后一帧内容，不是 in-flight 锁。竞态看 catalog_update store。
	const previewRef = useRef( preview );
	if( preview != null ) {
		previewRef.current = preview;
	}
	const shown = preview != null ? preview : previewRef.current;
	const [ restartOpen , setRestartOpen ] = useState( false );
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
				if( result.blocked === 'in-flight' ) {
					return;
				}
				toast.warning( i18n(
					reaxel_SettingsView().isAIsDirty()
						? 'Save or discard AI page changes before checking the AI catalog'
						: 'Save or discard Settings changes before checking the AI catalog',
				) );
				return;
			}
			if( result.status === 'error' ) {
				toast.error( catalogErrorMessage( result.errorCode ) );
				return;
			}
			if( result.status === 'up-to-date' ) {
				toast.success( i18n( 'AI catalog is up to date' ) );
			}
		} catch ( error ) {
			console.error( '[ManageAIs] check AI catalog failed:' , error );
			toast.error( i18n( 'Failed to check AI catalog' ) );
		}
	};

	const onApply = async() => {
		try {
			const result = await applyAiCatalog();
			if( 'blocked' in result ) {
				if( result.blocked === 'in-flight' ) {
					return;
				}
				toast.warning( i18n(
					reaxel_SettingsView().isAIsDirty()
						? 'Save or discard AI page changes before applying the AI catalog update'
						: 'Save or discard Settings changes before applying the AI catalog update',
				) );
				return;
			}
			if( !result.success ) {
				toast.error(
					result.errorCode
						? catalogErrorMessage( result.errorCode )
						: i18n( 'Failed to apply AI catalog' ),
				);
				return;
			}
			if( result.restartRequired ) {
				setRestartOpen( true );
				return;
			}
			toast.success( i18n( 'Update applied' ) );
		} catch ( error ) {
			console.error( '[ManageAIs] apply AI catalog failed:' , error );
			toast.error( i18n( 'Failed to apply AI catalog' ) );
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
			variant="outline"
			onClick={ () => {
				void onCheck();
			} }
			disabled={ catalogUpdate.checking || catalogUpdate.applying }
			aria-busy={ catalogUpdate.checking || undefined }
			style={ { marginBottom : 16 , marginLeft : 8 } }
		>
			<span
				className="catalog-update-check-label"
				data-busy={ catalogUpdate.checking || undefined }
			>
				<span className="catalog-update-check-label__text">
					<I18n>Check AI catalog</I18n>
				</span>
				{ catalogUpdate.checking ? (
					<span className="catalog-update-check-label__spinner" aria-hidden="true">
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					</span>
				) : null }
			</span>
		</Button>
		<Dialog
			open={ preview != null }
			onOpenChange={ ( open ) => {
				if( open === false && !catalogUpdate.applying ) {
					dismissCatalogUpdate();
				}
			} }
		>
			<DialogContent
				className="max-w-[560px]"
				onPointerDownOutside={ ( event ) => {
					if( catalogUpdate.applying ) event.preventDefault();
				} }
				onEscapeKeyDown={ ( event ) => {
					if( catalogUpdate.applying ) event.preventDefault();
				} }
			>
				<DialogHeader>
					<DialogTitle><I18n>There's an update to the AI list</I18n></DialogTitle>
				</DialogHeader>
			{ hasAnyDiff ? <>
				<p style={ { marginBottom : 12 } }>
					<I18n>Here's what changed:</I18n>
				</p>
				{ diff != null && diff.added.length > 0 ? <DiffSection title={ i18n( 'These AI pages will be added' ) }>
					{ diff.added.map( ai => (
						<li key={ ai.id }>
							<CatalogPreviewIdentity preview={ ai } />
							{ ai.url !== '' ? ` — ${ ai.url }` : '' }
						</li>
					) ) }
				</DiffSection> : null }
				{ diff != null && diff.updated.length > 0 ? <DiffSection title={ i18n( 'Name or website will change' ) }>
					{ diff.updated.map( row => (
						<li key={ row.id }>
							<CatalogPreviewIdentity preview={ row.after } />
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
							<div><CatalogPreviewIdentity preview={ { id : row.id , label : row.label , url : '' , AI_family : row.AI_family } } /></div>
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
						<li key={ row.id }>{ skippedRow( ais , row.id , row.reason ) }</li>
					) ) }
				</DiffSection> : null }
				{ diff != null && diff.catalogDropped.length > 0 ? <DiffSection title={ i18n( 'ChatAIO no longer maintains this listing. Existing local data will be kept.' ) }>
					{ diff.catalogDropped.map( row => (
						<li key={ row.id }>{ droppedRow( ais , row.id ) }</li>
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
				<DialogFooter>
					<Button
						variant="outline"
						disabled={ catalogUpdate.applying }
						onClick={ () => dismissCatalogUpdate() }
					><I18n>Cancel</I18n></Button>
					<Button
						loading={ catalogUpdate.applying }
						onClick={ () => onApply() }
					><I18n>Apply update</I18n></Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		<Dialog
			open={ restartOpen }
			onOpenChange={ setRestartOpen }
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle><I18n>Catalog saved. Restart required</I18n></DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					<I18n>The catalog was saved. The app must restart to apply it to AI pages.</I18n>
				</p>
				<DialogFooter>
					<Button onClick={ () => void relaunchApp() }><I18n>Restart now</I18n></Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</>;
} );

const DiffSection = ( { title , children }:{ title:string; children:React.ReactNode } ) => {
	return <div style={ { marginBottom : 12 } }>
		<div style={ { fontWeight : 600 , marginBottom : 6 } }>{ title }</div>
		<ul style={ { margin : 0 , paddingLeft : 18 } }>{ children }</ul>
	</div>;
};

/** 目录瘦预览 → logo + 名称。见 docs/features/ai-vendor-logo-identity.md */
const CatalogPreviewIdentity = ( { preview }:{ preview:AICatalog.CatalogPagePreview } ) => {
	return <AIIdentity
		ai={ {
			id : preview.id ,
			label : preview.label ,
			AI_family : preview.AI_family ,
			url : preview.url ,
			url_override : null,
		} }
		size={ 14 }
	/>;
};

const localIdentity = ( ais:AI.AIItem[] , id:string ) => {
	const ai = ais.find( item => item.id === id );
	if( ai ) {
		return <AIIdentity ai={ ai } size={ 14 } />;
	}
	return id;
};

const skippedRow = ( ais:AI.AIItem[] , id:string , reason:AICatalog.MergeSkipReason ) => {
	const reasonText = reason === 'url-override'
		? i18n( 'Your custom page settings will be kept.' )
		: reason === 'custom-id'
			? i18n( 'This page was created by the user.' )
			: i18n( 'Your changes will be kept.' );
	return <>
		{ localIdentity( ais , id ) }
		{ ` — ${ reasonText }` }
	</>;
};

const droppedRow = ( ais:AI.AIItem[] , id:string ) => localIdentity( ais , id );

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

import { AIIdentity } from '#SettingsView/components/AIIdentity';
import { reaxel_I18n } from "#SettingsView/reaxels/i18n";
import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
import { relaunchApp } from '#SettingsView/services/Settings';
import type { AICatalog } from "#src/Types/AICatalog";
import type { AI } from "#src/Types/SettingsTypes/AI";
import { Button } from '#Views/shared/ui/button';
import {
	Dialog ,
	DialogContent ,
	DialogFooter ,
	DialogHeader ,
	DialogTitle,
} from '#Views/shared/ui/dialog';
import { toast } from '#Views/shared/ui/toast';
import { Loader2 } from 'lucide-react';
import { reaxper } from 'reaxes-react';
