export const RCAIPagesPage = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		addCustomAI ,
		getCopy ,
		removeCustomAI ,
		setCustomAIField ,
		setSelectedAIIds,
	} = reaxel_GuidingView();
	const copy = getCopy();
	const defaults = store.Data.defaults;
	
	if( !defaults ) {
		return null;
	}
	
	return <section className="guiding-page">
		<div className="section-heading">
			<h2>{ copy.aiTitle }</h2>
			<p>{ copy.aiBody }</p>
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
				placeholder={ copy.customLabel }
				value={ store.UIControls.ai.customAIFields.label }
				onChange={ event => setCustomAIField( 'label' , event.target.value ) }
			/>
			<Input
				placeholder="https://example.com"
				value={ store.UIControls.ai.customAIFields.url }
				onChange={ event => setCustomAIField( 'url' , event.target.value ) }
			/>
			<Button onClick={ addCustomAI }>{ copy.addCustom }</Button>
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
				>{ copy.remove }</Button>
			</div> ) }
		</div> }
	</section>;
} );

import { reaxel_GuidingView } from '#src/Views/GuidingView/reaxels/guiding-view';
import {
	Button ,
	Checkbox ,
	Input,
} from 'antd';
import { reaxper } from 'reaxes-react';
