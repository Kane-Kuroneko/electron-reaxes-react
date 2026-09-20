const badgeVariants = cva(
	'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring' ,
	{
		variants : {
			variant : {
				default : 'border-transparent bg-primary text-primary-foreground shadow' ,
				secondary : 'border-transparent bg-secondary text-secondary-foreground' ,
				destructive : 'border-transparent bg-destructive text-destructive-foreground shadow' ,
				outline : 'text-foreground' ,
				success : 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' ,
				warning : 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' ,
			} ,
		} ,
		defaultVariants : {
			variant : 'default' ,
		} ,
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

export const Badge = ( { className , variant , ...props }:BadgeProps ) => {
	return <div
		className={ cn( badgeVariants( { variant } ) , className ) }
		{ ...props }
	/>;
};

import { cn } from '#Views/shared/ui/cn.utility';
import { cva , type VariantProps } from 'class-variance-authority';
