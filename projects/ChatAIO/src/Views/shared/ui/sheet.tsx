/**
 * 右侧/边缘抽屉。位移幅度只 12–16px + fade，不从屏外滑入。
 * 动画 class 见 globals.css `overlay-sheet-*`。docs/features/settings-ui-shadcn.md
 */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetPortal = SheetPrimitive.Portal;

export const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>( ( { className , ...props } , ref ) => (
	<SheetPrimitive.Overlay
		className={ cn( 'overlay-fade fixed inset-0 z-50 bg-black/50' , className ) }
		{ ...props }
		ref={ ref }
	/>
) );
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
	'fixed z-50 gap-4 bg-background p-6 shadow-lg' ,
	{
		variants : {
			side : {
				top : 'overlay-sheet-top inset-x-0 top-0 border-b' ,
				bottom : 'overlay-sheet-bottom inset-x-0 bottom-0 border-t' ,
				left : 'overlay-sheet-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm' ,
				right : 'overlay-sheet-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg' ,
			} ,
		} ,
		defaultVariants : {
			side : 'right' ,
		} ,
	},
);

interface SheetContentProps
	extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
		VariantProps<typeof sheetVariants> {}

export const SheetContent = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Content>,
	SheetContentProps
>( ( { side = 'right' , className , children , onOpenAutoFocus , ...props } , ref ) => (
	<SheetPortal>
		<SheetOverlay />
		<SheetPrimitive.Content
			ref={ ref }
			className={ cn( sheetVariants( { side } ) , className ) }
			{ ...props }
			onOpenAutoFocus={ ( event ) => {
				onOpenAutoFocus?.( event );
				if( event.defaultPrevented ) return;
				// 默认会聚焦第一颗按钮。复制版本号包了 Tooltip，一打开侧栏提示就常驻。
				// 焦点落到面板本身；键盘仍可 Tab 到控件。见 docs/features/settings-ui-shadcn.md
				event.preventDefault();
				( event.currentTarget as HTMLElement | null )?.focus( { preventScroll : true } );
			} }
		>
			{ children }
			<SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
				<X className="h-4 w-4" />
				<span className="sr-only">Close</span>
			</SheetPrimitive.Close>
		</SheetPrimitive.Content>
	</SheetPortal>
) );
SheetContent.displayName = SheetPrimitive.Content.displayName;

export const SheetHeader = ( { className , ...props }:React.HTMLAttributes<HTMLDivElement> ) => (
	<div
		className={ cn( 'flex flex-col space-y-2 text-center sm:text-left' , className ) }
		{ ...props }
	/>
);

export const SheetFooter = ( { className , ...props }:React.HTMLAttributes<HTMLDivElement> ) => (
	<div
		className={ cn( 'mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end' , className ) }
		{ ...props }
	/>
);

export const SheetTitle = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>( ( { className , ...props } , ref ) => (
	<SheetPrimitive.Title
		ref={ ref }
		className={ cn( 'text-lg font-semibold text-foreground' , className ) }
		{ ...props }
	/>
) );
SheetTitle.displayName = SheetPrimitive.Title.displayName;

import { cn } from '#Views/shared/ui/cn.utility';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva , type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
