export const SporeSplitAdjuster = reaxper(() => {
	const { Core_Store } = reaxel_Core();
	const { type } = Core_Store.layout;
	const component = {
		'single' : <SingleView /> ,
		'horizontal' : <SplitInTwo /> ,
		'vertical' : <SplitInTwo /> ,
	}[type];
	console.log(type , 'fffffffffff');
	
	return <div className = { less['spore-split-adjuster'] }>
		{ component }
	</div>;
});


const SporeViewPlaceholder = reaxper(( props ) => {
	
	return <div className = "spore-placeholder">
	
	</div>;
});

const SingleView = reaxper(() => {
	const { Core_Store } = reaxel_Core();
	if( !Core_Store.layout ) {
		console.warn('Core_Store.layout为空!');
	}
	const { view } = Core_Store.layout as Single;
	return <div
		style = { {
			width : '100%' ,
			height : '100%' ,
		} }
	>
		<p>spore_id:{ view.spore_id }</p>
		<p>url:{ view.url }</p>
		<p></p>
	</div>;
});

const SplitInTwo = reaxper(() => {
	const { Core_Store } = reaxel_Core();
	const { type } = Core_Store.layout as SplitInVertical | SplitInHorizontal;
	return <SplitGrid
		render = { ( {
			getGridProps ,
			getGutterProps ,
		} ) => {
			const horizontalElement = <>
				<div className = "spore-view">
					<SporeView
						view = { ( Core_Store.layout as SplitInHorizontal ).topView }
					/>
				</div>
				<div
					className = "gutter-row gutter-row-1"
					{ ...getGutterProps('row' , 1) }
				/>
				<div className = "spore-view">
					<SporeView
						view = { ( Core_Store.layout as SplitInHorizontal ).bottomView }
					/>
				</div>
			</>;
			const verticalElement = <>
				<div className = "spore-view">
					<SporeView
						view = { ( Core_Store.layout as SplitInVertical ).leftView }
					/>
				</div>
				<div
					className = "gutter-col gutter-col-1"
					{ ...getGutterProps('column' , 1) }
				/>
				<div className = "spore-view">
					<SporeView
						view = { (Core_Store.layout as SplitInVertical).rightView }
					/>
				</div>
			</>;
			return <div
				className = { `grid${ {
					'horizontal' : ' hor' ,
					'vertical' : ' vert' ,
				}[type] }` }
				{ ...getGridProps() }
			>
				{ { 'horizontal' : horizontalElement , 'vertical' : verticalElement }[type] }
			</div>;
		} }
	/>;
});

const SporeView = reaxper((
	{
		view ,
	}: {
		view: View | SplitedView
	} ,
) => {
	if(!view) {
		return <div>NULL</div>;
		
	}
	const { type } = reaxel_Core().Core_Store.layout;
	const viewType = function (){
		if( view instanceof View ) {
			return 'single-view';
		} else if( view instanceof SplitedView ) {
			return 'splited-view';
		} else {
			debugger;
		}
	}();
	
	if( viewType === 'single-view' ) {
		return <Info view={view}/>;
	} else if( viewType === 'splited-view' ) {
		return <SplitGrid
			render = { ( {
				getGridProps ,
				getGutterProps ,
			} ) => (
				<div
					className = { `grid${ {
						'horizontal' : ' vert' ,
						'vertical' : ' hor' ,
					}[type] }` }
					{ ...getGridProps() }>
					<SporeView view = { ( view as SplitedView ).firstView } />
					<div
						className = { {
							'horizontal' : "gutter-col gutter-col-1" ,
							'vertical' : "gutter-row gutter-row-1" ,
						}[type] }
						{ ...getGutterProps({
							'horizontal' : 'column' as const ,
							'vertical' : 'row' as const ,
						}[type] , 1) } />
					<SporeView view={(view as SplitedView).secondView}/>
				</div>
			) }
		/>;
	}
});

const Info = reaxper(( { view }: { view: View | SplitedView } ) => {
	const { layout } = reaxel_Core().Core_Store;
	
	let contents = <></>;
	if( view instanceof SplitedView ) {
		contents = <div
			style = { {
				display : 'flex' ,
				flexFlow : `${ {
					//水平分割布局中的SplitedView是row
					'horizontal' : 'row' ,
					//垂直分割布局中的SplitedView是column
					'vertical' : 'column' ,
				}[layout.type] } nowrap` ,
				justifyContent : 'space-between' ,
				
			} }
		>
			<Info view = { view.firstView } />
			<Info view = { view.secondView } />
		</div>;
	} else if( view instanceof View ) {
		contents = <>
			<p>spore_id:{ view.spore_id }</p>
			<p>url:{ view.url }</p>
			<p></p>
		</>;
	}
	return <div
		style = { {
			width : '100%' ,
			height : '100%' ,
		} }
	>
		{ contents }
	</div>;
});

import { Single , SplitInVertical , SplitInHorizontal , View , SplitedView } from '../../reaxels/core/spore-view-layouts';
import SplitGrid from 'react-split-grid';
import { reaxel_Core } from '#renderer/DropPadView/reaxels/core';
import * as less from './index.module.less';
import Split from 'react-split'
