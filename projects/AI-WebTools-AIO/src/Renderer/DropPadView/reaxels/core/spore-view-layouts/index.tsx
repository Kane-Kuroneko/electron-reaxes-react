export class View {
	spore_wcv_id: number;
	spore_id: null;
	mounted : boolean;
	url: string;
	title: string;
	description: string;
	placeholderText : string;
	
	constructor(arg:Partial<{
		spore_wcv_id:View['spore_wcv_id'],
		spore_id:View['spore_id'],
		mounted:View['mounted'],
		url:View['url'],
		title:View['title'],
		description:View['description'],
		placeholderText:View['placeholderText'],
	}>){
		_.assign(this , arg);
	}
}
export class SplitedView {
	firstView : View;
	secondView : View;
	setFirstView = (view:View) => {
		this.firstView = view;
	}
	setSecondView = (view : View) => {
		this.secondView = view;
	}
	constructor({firstView,secondView}:{
		firstView : SplitedView['firstView'];
		secondView : SplitedView['secondView'];
	}){
		this.setFirstView(firstView);
		this.setSecondView(secondView);
	}
}

export class Layout {
	type: 'single'|'horizontal'|'vertical';
}

interface SporeViewParam {
	spore_id : number;
	spore_wcv_id: number;
	url:string;
	placeholderText : string;
	
}

interface SingleParam extends SporeViewParam{
	
}
export class Single extends Layout {
	type = 'single' as const;
	view : View;
	
	constructor(view:View){
		super();
		this.view = view;
	}
}

interface SplitInHorizontalParam extends SporeViewParam {
	
}
export class SplitInHorizontal extends Layout {
	type = 'horizontal' as const;
	topView : SplitedView | View;
	bottomView : SplitedView | View;
	setTopView = (view:SplitInHorizontal['topView']) =>{
		this.topView = view;
	}
	setBottomView = (view:SplitInHorizontal['bottomView']) =>{
		this.bottomView = view;
	}
	constructor(param?:Partial<{
		topView:View|SplitedView;
		bottomView:View|SplitedView;
	}>){
		super();
		_.assign(this , param);
	}
	
}

export class SplitInVertical extends Layout{
	type = 'vertical' as const;
	mounted = false;
	leftView : SplitedView | View;
	rightView : SplitedView | View;
	setLeftView = (view:SplitInVertical["leftView"]) => {
		this.leftView = view;
	}
	setRightView = (view:SplitInVertical["rightView"]) => {
		this.rightView = view;
	}
	constructor(param?:Partial<{
		leftView : View|SplitedView;
		rightView : View|SplitedView;
	}>){
		super();
		_.assign(this , param);
	}
}
