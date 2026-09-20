export const RadioGroup = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>( ( { className , ...props } , ref ) => {
	return <RadioGroupPrimitive.Root
		className={ cn( 'grid gap-2' , className ) }
		{ ...props }
		ref={ ref }
	/>;
} );
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export const RadioGroupItem = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>( ( { className , ...props } , ref ) => {
	return <RadioGroupPrimitive.Item
		ref={ ref }
		className={ cn(
			'aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50' ,
			className,
		) }
		{ ...props }
	>
		<RadioGroupPrimitive.Indicator className="flex items-center justify-center">
			<Circle className="h-2.5 w-2.5 fill-current text-current" />
		</RadioGroupPrimitive.Indicator>
	</RadioGroupPrimitive.Item>;
} );
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export const RadioRow = ( props:{
	value: string;
	children: React.ReactNode;
	className?: string;
} ) => {
	return <label className={ cn( 'flex items-start gap-2.5 cursor-pointer select-none text-sm' , props.className ) }>
		<RadioGroupItem
			value={ props.value }
			className="mt-0.5"
		/>
		<span>{ props.children }</span>
	</label>;
};

import { cn } from '#Views/shared/ui/cn.utility';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
