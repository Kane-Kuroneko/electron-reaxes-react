export const reaxel_Core = reaxel(() => {
	const { store , setState , mutate } = orzMobx({
		//实际渲染的窗口格子
		layout : null as Layouts ,
		dragOverPreview : {
			//用户光标是否拖拽并悬浮在预览容器上
			containerDragOver : false ,
			previewDragOver : false ,
			mapperDragOver : false ,
			//用户光标正停留在哪个网格里|预览窗口应该如何展示
			position : null as Position ,
			get dragOver(){
				return store.dragOverPreview.containerDragOver || store.dragOverPreview.previewDragOver || store.dragOverPreview.mapperDragOver;
			} ,
		} ,
		
	});
	//@ts-expect-error
	window.core_store = store;
	//debugger
	obsReaction(() => {
		console.log([ store.dragOverPreview.containerDragOver , store.dragOverPreview.previewDragOver , store.dragOverPreview.mapperDragOver , store.dragOverPreview.mapperDragOver ]);
	} , () => [ store.dragOverPreview.containerDragOver , store.dragOverPreview.previewDragOver ]);
	
	obsReaction(() => {
		console.log(`store.dragOverPreview.position:` , store.dragOverPreview.position);
	} , () => [ store.dragOverPreview.position ]);
	
	const setLayout = async() => {
		const { position } = store.dragOverPreview;
		IPC.invoke('set-spore-layout' , {
			position ,
			spore_id : null ,
			
		}).then(data => {
			console.log(data);
			data.spore_view_id;
			
		}).catch(e => {
			console.error(e , 'asdvzcsd');
		});
		
	};
	
	const onDragDropSpore = async ({
		spore_id ,
		url,
		
	}) => {
		//用户当前拖放的格子
		const { position } = store.dragOverPreview;
		//拖放前的布局状态
		const prevLayout = store.layout;
		const newLayout = layoutTransformer(
			store.layout ,
			position ,
			new View({
				spore_id ,
				url ,
			}),
		);
		setState({ layout : newLayout });
	}
	
	let rtn = {
		Core_Store : store ,
		Core_SetState : setState ,
		Core_Mutate : mutate ,
		onDragDropSpore,
	};
	return () => {
		
		return rtn;
	};
});


type Layouts = Single | SplitInHorizontal | SplitInVertical;


import { Single , SplitInHorizontal , SplitInVertical , Layout , View ,SplitedView  } from './spore-view-layouts';
import { Position } from '#project/src/types';
import { observable , action } from 'mobx';
import { toJS } from 'mobx';



const layouts = {
	'single' : ['center'],
	'horizontal' : [ 'top' , 'bottom' ],
	'vertical' : ['left','right'],
	'quad grid' : [ 'leftTop' , 'leftBottom' , 'rightTop' , 'rightBottom' ],
};
const layoutTransformer = (
	prevLayout:Layout,
	dropPosition:Position,
	dropView:View,
	
):Layouts => {
	switch( true ) {
		case layouts['single'].includes(dropPosition):{
			return toSingle();
		};
		case layouts['horizontal'].includes(dropPosition):{
			return toHorizontal();
		};
		case layouts['vertical'].includes(dropPosition):{
			return toVertical();
		};
		case layouts['quad grid'].includes(dropPosition):{
			return toDiags();
		}
		default:debugger;
	}
	function toSingle(){
		return new Single(dropView);
	}
	function toHorizontal(){
		//以下逻辑先假设用户将spore放置在上半边. 下半边的逻辑由useRevert劫持处理.
		const useRevert = dropPosition === 'bottom';
		const newLayout = new Proxy(new SplitInHorizontal() , {
			get( target , p: keyof SplitInHorizontal , receiver: any ): any{
				if( useRevert ) {
					if( p === 'setTopView' ) {
						return target.setBottomView;
					}
					if( p === 'setBottomView' ) {
						return target.setTopView;
					}
					return target[p];
				}else {
					return target[p];
				}
			} ,
		});
		newLayout.setTopView(dropView);
		switch( true ) {
			case prevLayout instanceof Single:{
				newLayout.setBottomView(prevLayout.view);
				break;
			};
			//原本的布局就是水平的,直接将另一边原本的还原
			case prevLayout instanceof SplitInHorizontal : {
				newLayout.setBottomView(prevLayout[useRevert ? 'topView' : 'bottomView']);
				break;
			};
			//原本的布局是垂直的
			case prevLayout instanceof SplitInVertical : {
				let leftSideSplited = prevLayout.leftView instanceof SplitedView,
					rightSideSplited = prevLayout.rightView instanceof SplitedView;
				//判断垂直窗口内是否有水平分割
				//两边都是被分割的,即类似于四宫格
				if(leftSideSplited && rightSideSplited){
					newLayout.setBottomView(new SplitedView({
						firstView:(prevLayout.leftView as SplitedView)[useRevert ? 'firstView' : 'secondView'],
						secondView : (prevLayout.rightView as SplitedView)[useRevert ? 'firstView' : 'secondView']
					}));
				}
				//只有左侧分割了
				else if(leftSideSplited){
					newLayout.setBottomView(new SplitedView({
						firstView:(prevLayout.leftView as SplitedView)[useRevert ? 'firstView' : 'secondView'],
						secondView : prevLayout.rightView as View
					}));
				}else if(rightSideSplited) {
					newLayout.setBottomView(new SplitedView({
						firstView : prevLayout.leftView as View,
						secondView:(prevLayout.rightView as SplitedView)[useRevert ? 'firstView' : 'secondView']
					}));
				}
				//左右都没分割
				else {
					newLayout.setBottomView(new SplitedView({
						firstView : prevLayout.leftView as View,
						secondView : prevLayout.rightView as View,
						
					}));
				}
			}
		}
		return newLayout;
	}
	function toVertical(){
		//以下逻辑先假设用户将spore放置在左半边. 右半边的逻辑由useRevert劫持处理.
		const useRevert = dropPosition === 'right';
		const newLayout = new Proxy(new SplitInVertical() , {
			get( target , p: keyof SplitInVertical , receiver: any ): any{
				if( useRevert ) {
					if( p === 'setLeftView' ) {
						return target.setRightView;
					}
					if( p === 'setRightView' ) {
						return target.setLeftView;
					}
					return target[p];
				}else {
					return target[p];
				}
			} ,
		});
		newLayout.setLeftView(dropView);
		switch( true ) {
			case prevLayout instanceof Single:{
				newLayout.setRightView(prevLayout.view);
				break;
			};
			//原本布局是水平的
			case prevLayout instanceof SplitInHorizontal : {
				let topSideSplited = prevLayout.topView instanceof SplitedView,
					bottomSideSplited = prevLayout.bottomView instanceof SplitedView;
				//判断水平窗口内是否有垂直分割
				//两边都是被分割的,即类似于四宫格
				if(topSideSplited && bottomSideSplited){
					newLayout.setRightView(new SplitedView({
						firstView:(prevLayout.topView as SplitedView)[useRevert ? 'firstView' : 'secondView'],
						secondView : (prevLayout.bottomView as SplitedView)[useRevert ? 'firstView' : 'secondView']
					}));
				}
				//只有上侧分割了
				else if(topSideSplited){
					newLayout.setRightView(new SplitedView({
						firstView:(prevLayout.topView as SplitedView)[useRevert ? 'firstView' : 'secondView'],
						secondView : prevLayout.bottomView as View
					}));
				}else if(bottomSideSplited) {
					newLayout.setRightView(new SplitedView({
						firstView : prevLayout.topView as View,
						secondView:(prevLayout.bottomView as SplitedView)[useRevert ? 'firstView' : 'secondView']
					}));
				}
				//上下都没分割
				else {
					newLayout.setRightView(new SplitedView({
						firstView : prevLayout.topView as View,
						secondView:(prevLayout.bottomView as View)
					}));
				}
				break;
			};
			//原本的布局是垂直的,直接把原来的rightView放在newLayout.rightView上
			case prevLayout instanceof SplitInVertical : {
				newLayout.setRightView(prevLayout[useRevert ? 'leftView' : 'rightView']);
			}
		}
		return newLayout;
	}
	function toDiags() {
		return null;
	}
}
