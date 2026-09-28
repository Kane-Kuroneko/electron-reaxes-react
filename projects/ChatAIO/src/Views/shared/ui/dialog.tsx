/**
 * Settings / Prompt / Guiding 共用 Dialog。遮罩 fade + 面板 pop 写在 globals.css，
 * 进 110ms / 出 80ms。不要 fill-mode（Presence 靠 animationend 卸节点）。
 * CSS 动画，不跟 Windows DWM；系统关动画时这里仍要动。
 *
 * 外壳 overflow-hidden + rounded：圆角和滚动条分属两层。Header / Footer 钉在外壳，
 * 只有中间是滚动层。不要把 overflow-y-auto 和 rounded 写在同一节点——Windows
 * 经典滚动条会把圆角画成直角；overlay-pop 的 transform 还会让贴边滚动条更难被裁住。
 *
 * 滚动层 clip 边是 padding box（CSS Overflow）。focus ring 是 ink overflow
 *（box-shadow），必须靠滚动层自己的 padding 留在 clip 里边。不要用负 margin
 * 把 clip 区撑出布局盒。
 *
 * 打开时焦点落到面板（focusOverlaySurface），不要第一颗 input / 按钮。
 * 见 docs/features/settings-ui-shadcn.md
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>( ( { className , ...props } , ref ) => (
	<DialogPrimitive.Overlay
		ref={ ref }
		className={ cn( 'overlay-fade fixed inset-0 z-50 bg-black/50' , className ) }
		{ ...props }
	/>
) );
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const dialogSlotOf = ( node:React.ReactNode ):'header' | 'footer' | null => {
	if( !React.isValidElement( node ) ) return null;
	const type = node.type as { displayName?:string };
	if( type.displayName === 'DialogHeader' ) return 'header';
	if( type.displayName === 'DialogFooter' ) return 'footer';
	return null;
};

export const DialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>( ( { className , children , onOpenAutoFocus , ...props } , ref ) => {
	const headers:React.ReactNode[] = [];
	const footers:React.ReactNode[] = [];
	const body:React.ReactNode[] = [];
	React.Children.forEach( children , ( node ) => {
		const slot = dialogSlotOf( node );
		if( slot === 'header' ) headers.push( node );
		else if( slot === 'footer' ) footers.push( node );
		else body.push( node );
	} );
	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				ref={ ref }
				className={ cn(
					'overlay-pop fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-5rem)] w-full max-w-lg flex-col gap-4 overflow-hidden rounded-lg border bg-background p-6 text-foreground shadow-lg' ,
					className,
				) }
				{ ...props }
				onOpenAutoFocus={ ( event ) => {
					onOpenAutoFocus?.( event );
					focusOverlaySurface( event );
				} }
			>
				{ headers }
				{ /* p-1：scrollport 的 padding 就是 clip 边外的 ink 区，ring-2 画在这里 */ }
				<div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain p-1">
					{ body }
				</div>
				{ footers }
				<DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none">
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</DialogPortal>
	);
} );
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ( { className , ...props }:React.HTMLAttributes<HTMLDivElement> ) => (
	<div
		className={ cn( 'flex shrink-0 flex-col space-y-1.5 text-center sm:text-left pr-8' , className ) }
		{ ...props }
	/>
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ( { className , ...props }:React.HTMLAttributes<HTMLDivElement> ) => (
	<div
		className={ cn( 'flex shrink-0 flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2' , className ) }
		{ ...props }
	/>
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>( ( { className , ...props } , ref ) => (
	<DialogPrimitive.Title
		ref={ ref }
		className={ cn( 'text-lg font-semibold leading-none tracking-tight' , className ) }
		{ ...props }
	/>
) );
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>( ( { className , ...props } , ref ) => (
	<DialogPrimitive.Description
		ref={ ref }
		className={ cn( 'text-sm text-muted-foreground' , className ) }
		{ ...props }
	/>
) );
DialogDescription.displayName = DialogPrimitive.Description.displayName;

import { cn } from '#Views/shared/ui/cn.utility';
import { focusOverlaySurface } from '#Views/shared/ui/focus-overlay-surface.utility';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
