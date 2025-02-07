const matters:Matter[] = [
	{
		name : "删除grok关闭弹窗",
		condition : (mutation:MutationRecord) => queryCloseBtn(),
		action(resolve,mutation:MutationRecord){
			const el = queryCloseBtn();
			console.log( '检测到关闭按钮,已移除' );
			el.parentElement.remove();
			resolve();
		}
	},
];


createMutationObserver( matters ).observer.observe(document, { subtree : true , childList : true } );

const queryCloseBtn = () => {
	return document.querySelector( `button[aria-label="Exit Focus Mode"][role="button"]` );
}


import { createMutationObserver ,Matter} from '../../../../ExcutebleScripts/utils/create-mutation-observer.tsx';
