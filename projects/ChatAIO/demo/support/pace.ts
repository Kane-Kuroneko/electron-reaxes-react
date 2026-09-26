/**
 * 出镜节奏。倍率 --pace / CHATAIO_DEMO_PACE。
 *
 * 对标 Screen Studio Rapid / ngram 这类成片：光标按距离滑、到了就点、
 * 只在「观众要读的结果」上停。禁止把 hover / 点击光点 / afterClick / 切页
 * 再叠成一段空镜。规律写在 docs/features/playwright-demo-record.md。
 */

export type DemoPace = {
	scale : number;
	/** 短距离移动下限（ms） */
	moveMinMs : number;
	/** 长距离移动上限（ms）；实际时长按像素另算 */
	moveMs : number;
	/** 每像素追加的移动时间 */
	movePxMs : number;
	/** 滑到目标后、按下前的瞄准（扫过走位） */
	hoverMs : number;
	/** 列表点名：光标出现在行上再点，给眼睛一帧对焦 */
	directSettleMs : number;
	/** 点击被 UI 吃掉所需的最小间隔，不是看结果 */
	afterClickMs : number;
	/** pulse 后立刻 down，让光点和按下叠在一起 */
	clickFlashMs : number;
	/** 新 AI 出画的预算（含 waitFor 已花掉的时间） */
	afterSwitchMs : number;
	/** 面板 / 表格刚出现，扫一眼 */
	afterPageMs : number;
	/** 第一次打开 Switch 列表，让六家被看清 */
	listHoldMs : number;
	/** 同一张列表再打开：观众已经认识，点名即可 */
	listHoldRepeatMs : number;
	pasteHoldMs : number;
	/** 片头静镜；默认 playlist 用 preroll，不再在 badge 上干等 */
	establishMs : number;
	/** Manual 代理表单、Edit 弹窗这种「多看一眼控件」 */
	formHoldMs : number;
	typeDelayMs : number;
	/** 空格 / 标点后多停，像人打字 */
	typePauseMs : number;
	longPressMs : number;
	prerollMs : number;
	boundaryMs : number;
};

export const sleep = ( ms:number ) => {
	return new Promise<void>( ( resolve ) => {
		setTimeout( resolve , ms );
	} );
};

export const createDemoPace = ( scale = 1 ):DemoPace => {
	const s = Number.isFinite( scale ) && scale > 0 ? scale : 1;
	return {
		scale : s ,
		moveMinMs : Math.round( 70 * s ) ,
		moveMs : Math.round( 340 * s ) ,
		movePxMs : 0.28 * s ,
		hoverMs : Math.round( 40 * s ) ,
		directSettleMs : Math.round( 70 * s ) ,
		afterClickMs : Math.round( 80 * s ) ,
		clickFlashMs : Math.round( 40 * s ) ,
		afterSwitchMs : Math.round( 560 * s ) ,
		afterPageMs : Math.round( 320 * s ) ,
		listHoldMs : Math.round( 820 * s ) ,
		listHoldRepeatMs : Math.round( 240 * s ) ,
		pasteHoldMs : Math.round( 820 * s ) ,
		establishMs : Math.round( 280 * s ) ,
		formHoldMs : Math.round( 420 * s ) ,
		typeDelayMs : Math.max( 16 , Math.round( 24 * s ) ) ,
		typePauseMs : Math.round( 70 * s ) ,
		longPressMs : Math.round( 1250 * s ) ,
		prerollMs : Math.round( 520 * s ) ,
		boundaryMs : Math.round( 480 * s ),
	};
};

export const beat = async( ms:number ) => {
	if( ms <= 0 ) {
		return;
	}
	await sleep( ms );
};

/**
 * 把「等 UI 完成」算进 dwell，不要等完再空等一段同名 hold。
 * 切页若已经花了 400ms，afterSwitch 预算只补剩下的。
 */
export const holdRemaining = async( budgetMs:number , startedAt:number ) => {
	await beat( budgetMs - ( Date.now() - startedAt ) );
};
