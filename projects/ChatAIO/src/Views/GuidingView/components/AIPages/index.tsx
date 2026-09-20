export const RCAIPagesPage = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		addCustomAI ,
		getCanDirectConnect ,
		removeCustomAI ,
		setCustomAIField ,
		setSelectedAIIds,
	} = reaxel_GuidingView();
	const defaults = store.Data.defaults;

	if( !defaults ) {
		return null;
	}

	const { domestic , international } = groupAIsByRegion( defaults.defaultAIs );
	const networkBlocked = getCanDirectConnect() === false;
	const hasDomestic = domestic.length > 0;
	const hasInternational = international.length > 0;
	const selected = store.UIControls.ai.selectedAIIds;

	const toggleAI = ( id:string , checked:boolean ) => {
		setSelectedAIIds( checked
			? [ ...selected , id ]
			: selected.filter( item => item !== id ) );
	};

	return <section className="guiding-page">
		<div className="section-heading">
			<h2><I18n>Choose enabled AI pages</I18n></h2>
			<p><I18n>Unchecked built-in pages stay in configuration but remain hidden until you enable them later.</I18n></p>
		</div>

		{ networkBlocked && hasDomestic && <div className="domestic-recommendation">
			<I18n>Your network may have trouble reaching services outside China. Consider enabling Domestic AI Providers first — they work without a proxy.</I18n>
		</div> }

		{ hasDomestic && <div className="ai-region-group">
			<h3 className="ai-region-heading"><I18n>Domestic AI Providers</I18n></h3>
			<div className="ai-grid">
				{ domestic.map( ai => <CheckboxField
					key={ ai.id }
					className="ai-option"
					checked={ selected.includes( ai.id ) }
					onCheckedChange={ checked => toggleAI( ai.id , checked ) }
				>
					<span className="ai-option__name"><AIVendorLogo family={ ai.AI_family } size={ 16 } fallbackText={ ai.label }/>{ ai.label }</span>
					<small>{ ai.url }</small>
				</CheckboxField> ) }
			</div>
		</div> }

		{ hasInternational && <div className="ai-region-group">
			<h3 className="ai-region-heading"><I18n>International AI Providers</I18n></h3>
			{ networkBlocked && <p className="ai-region-note"><I18n>Your network may have trouble reaching services outside China. Consider enabling Domestic AI Providers first — they work without a proxy.</I18n></p> }
			<div className="ai-grid">
				{ international.map( ai => <CheckboxField
					key={ ai.id }
					className="ai-option"
					checked={ selected.includes( ai.id ) }
					onCheckedChange={ checked => toggleAI( ai.id , checked ) }
				>
					<span className="ai-option__name"><AIVendorLogo family={ ai.AI_family } size={ 16 } fallbackText={ ai.label }/>{ ai.label }</span>
					<small>{ ai.url }</small>
				</CheckboxField> ) }
			</div>
		</div> }

		<div className="custom-ai">
			<Input
				placeholder={ i18n( 'Custom name' ) }
				value={ store.UIControls.ai.customAIFields.label }
				onChange={ event => setCustomAIField( 'label' , event.target.value ) }
			/>
			<Input
				placeholder="https://example.com"
				value={ store.UIControls.ai.customAIFields.url }
				onChange={ event => setCustomAIField( 'url' , event.target.value ) }
			/>
			<Button onClick={ addCustomAI }><I18n>Add custom AI</I18n></Button>
		</div>
		{ store.Data.customAIs.length > 0 && <div className="custom-ai-cards">
			{ store.Data.customAIs.map( ai => <div
				key={ ai.id }
				className="custom-ai-card"
			>
				<div className="custom-ai-card__body">
					{/* 向导阶段页面还没打开过，没有 favicon 缓存，直接用域名首字母占位 */}
					<span className="ai-option__name"><AIVendorLogo family="custom" size={ 16 } fallbackText={ ai.url || ai.label }/>{ ai.label }</span>
					<small>{ ai.url }</small>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={ () => removeCustomAI( ai.id ) }
				><I18n>Remove</I18n></Button>
			</div> ) }
		</div> }
	</section>;
} );

import { reaxel_GuidingView } from '#GuidingView/reaxels/guiding-view';
import { groupAIsByRegion } from '#shared/statics/ai-region';
import { AIVendorLogo } from '#shared/ai-vendor-logo';
import { I18n , i18n } from '#GuidingView/reaxels/exports';
import { Button } from '#Views/shared/ui/button';
import { CheckboxField } from '#Views/shared/ui/checkbox-field';
import { Input } from '#Views/shared/ui/input';
import { reaxper } from 'reaxes-react';
