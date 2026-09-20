export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = React.forwardRef<
	React.ElementRef<typeof PopoverPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>( ( { className , align = 'center' , sideOffset = 4 , ...props } , ref ) => (
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
		/>
	</PopoverPrimitive.Portal>
) );
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

import { cn } from '#Views/shared/ui/cn.utility';
import * as PopoverPrimitive from '@radix-ui/react-popover';
