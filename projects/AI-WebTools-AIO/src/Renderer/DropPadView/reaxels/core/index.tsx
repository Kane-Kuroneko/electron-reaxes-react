export const reaxel_Core = reaxel(() => {
	const { store , setState , mutate } = orzMobx({
		//实际渲染的窗口格子
		layout : {
			type : "single",
		} as Layout,
		dragOverPreview : {
			//用户光标是否拖拽并悬浮在预览容器上
			containerDragOver : false,
			previewDragOver : false,
			//用户光标正停留在哪个网格里|预览窗口应该如何展示
			position : null as Position,
			get dragOver(){
				return store.dragOverPreview.containerDragOver || this.previewDragOver
			}
		}
	});
	
	obsReaction(() => {
		console.log(`store.dragOverPreview.position:`,store.dragOverPreview.position);
	} , () => [store.dragOverPreview.position] );
	
	const setLayout = async () => {
		const { position } = store.dragOverPreview;
		IPC.invoke('set-spore-layout',{
			position ,
			spore_id:null,
			
		}).then(data => {
			console.log(data);
			data.spore_view_id;
			
		}).catch(e => {
			console.error(e,'asdvzcsd');
		})
		
	}
	
	let rtn = {
		Core_Store : store ,
		Core_SetState : setState ,
		Core_Mutate : mutate ,
		
	};
	return () => {
		
		return rtn;
	};
});

type LatticeView = {
	spore_wcv : null;
};
type SingleType = {
	type : 'single';
	view : LatticeView;
}
type SplitHorizontalType = {
	type: 'split-horizontal';
	views: Record<"top" | "bottom" , LatticeView>;
}
type SplitVerticalType = {
	type: 'split-vertical';
	views: Record<"left" | "right" , LatticeView>;
}
type QuadType = {
	type: 'quad';
	views : Record<"leftTop"|"leftBottom"|"rightTop"|"rightBottom", LatticeView>;
}
type Layout = SingleType|SplitHorizontalType|SplitVerticalType|QuadType;

@observable
class Single {
	type = 'single' as const;
	view = {
		spore_wcv : null,
	};
	create(options:{}){
		
	}
}

import { Position } from '#project/src/types';
import { observable , action } from 'mobx';
