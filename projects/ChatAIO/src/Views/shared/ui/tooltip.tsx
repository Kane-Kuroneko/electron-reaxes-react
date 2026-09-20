export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>( ( { className , sideOffset = 4 , ...props } , ref ) => (
	<TooltipPrimitive.Portal>
		<TooltipPrimitive.Content
			ref={ ref }
			sideOffset={ sideOffset }
			className={ cn(
				'z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md' ,
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
