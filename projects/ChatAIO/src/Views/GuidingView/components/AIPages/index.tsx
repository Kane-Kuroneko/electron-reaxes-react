export const RCAIPagesPage = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		addCustomAI ,
		removeCustomAI ,
		setCustomAIField ,
		setSelectedAIIds,
	} = reaxel_GuidingView();
	const defaults = store.Data.defaults;
	
	if( !defaults ) {
		return null;
	}
	
	return <section className="guiding-page">
		<div className="section-heading">
			<h2><I18n>Choose enabled AI pages</I18n></h2>
			<p><I18n>Unchecked built-in pages stay in configuration but remain hidden until you enable them later.</I18n></p>
		</div>
		<Checkbox.Group
			value={ store.UIControls.ai.selectedAIIds }
			onChange={ values => setSelectedAIIds( values as string[] ) }
			className="ai-grid"
		>
			{ defaults.defaultAIs.map( ai => <Checkbox
				key={ ai.id }
				value={ ai.id }
				className="ai-option"
			>
				<span>{ ai.label }</span>
				<small>{ ai.url }</small>
			</Checkbox> ) }
		</Checkbox.Group>
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
					<span>{ ai.label }</span>
					<small>{ ai.url }</small>
				</div>
				<Button
					size="small"
					onClick={ () => removeCustomAI( ai.id ) }
				><I18n>Remove</I18n></Button>
			</div> ) }
		</div> }
	</section>;
} );

import { reaxel_GuidingView } from '#src/Views/GuidingView/reaxels/guiding-view';
import { I18n , i18n } from '#src/Views/GuidingView/reaxels/exports';
import {
	Button ,
	Checkbox ,
	Input,
} from 'antd';
import { reaxper } from 'reaxes-react';
