export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement , InputProps>( (
	{ className , type , ...props } ,
	ref,
) => {
	return <input
		type={ type }
		className={ cn(
			// appearance-none：Windows 原生控件在 overlay-pop 的 transform 里会把 1px 边框收成发丝、圆角失效。
			'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50' ,
			className,
		) }
		ref={ ref }
		{ ...props }
	/>;
} );
Input.displayName = 'Input';

import { cn } from '#Views/shared/ui/cn.utility';
