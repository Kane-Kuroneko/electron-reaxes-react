/**
 * Tooltip。Radix 默认 focus 即开；程序化 focus（进页 / Dialog autofocus / 关菜单还焦点）
 * 没有 :focus-visible，这里拦住。键盘 Tab 仍开。radix-ui/primitives#2248
 * 见 docs/features/settings-ui-shadcn.md
 */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;

export const TooltipTrigger = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>( ( { onFocus , ...props } , ref ) => (
	<TooltipPrimitive.Trigger
		ref={ ref }
		{ ...props }
		onFocus={ ( event ) => {
			onFocus?.( event );
			if( event.defaultPrevented ) return;
			/* 程序化 focus 没有 :focus-visible（Dialog/页面切入/关下拉还焦点），不要弹出。
			 * Tab 仍有 :focus-visible。radix-ui/primitives#2248 */
			if( event.currentTarget.matches( ':focus-visible' ) === false ) {
				event.preventDefault();
			}
		} }
	/>
) );
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

export const TooltipContent = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>( ( { className , sideOffset = 4 , ...props } , ref ) => (
	<TooltipPrimitive.Portal>
		<TooltipPrimitive.Content
			ref={ ref }
			sideOffset={ sideOffset }
			className={ cn(
				'overlay-fade z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md' ,
				className,
			) }
			{ ...props }
		/>
	</TooltipPrimitive.Portal>
) );
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export const SimpleTooltip = ( props:{
	content: React.ReactNode;
	children: React.ReactNode;
} ) => {
	return <Tooltip>
		<TooltipTrigger asChild>{ props.children }</TooltipTrigger>
		<TooltipContent>{ props.content }</TooltipContent>
	</Tooltip>;
};

import { cn } from '#Views/shared/ui/cn.utility';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
