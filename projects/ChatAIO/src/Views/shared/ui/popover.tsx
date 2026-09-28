/**
 * 轻量浮层。打开时焦点落到面板，不要第一颗 trigger（会把内层 Tooltip 带出来）。
 * 见 docs/features/settings-ui-shadcn.md
 */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = React.forwardRef<
	React.ElementRef<typeof PopoverPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>( ( { className , align = 'center' , sideOffset = 4 , onOpenAutoFocus , ...props } , ref ) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Content
			ref={ ref }
			align={ align }
			sideOffset={ sideOffset }
			className={ cn(
				'overlay-float z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none' ,
				className,
			) }
			{ ...props }
			onOpenAutoFocus={ ( event ) => {
				onOpenAutoFocus?.( event );
				focusOverlaySurface( event );
			} }
		/>
	</PopoverPrimitive.Portal>
) );
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

import { cn } from '#Views/shared/ui/cn.utility';
import { focusOverlaySurface } from '#Views/shared/ui/focus-overlay-surface.utility';
import * as PopoverPrimitive from '@radix-ui/react-popover';
