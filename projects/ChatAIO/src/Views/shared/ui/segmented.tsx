export const Segmented = <T extends string>( props:{
	value: T;
	options: Array<{ label: React.ReactNode; value: T }>;
	onChange: ( value:T ) => void;
	className?: string;
} ) => {
	return <div className={ cn( 'inline-flex rounded-lg bg-muted p-0.5' , props.className ) }>
		{ props.options.map( option => {
			const active = option.value === props.value;
			return <button
				key={ option.value }
				type="button"
				className={ cn(
					'rounded-md px-3 py-1 text-xs font-medium transition-colors select-none' ,
					active
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground',
				) }
				onClick={ () => props.onChange( option.value ) }
			>
				{ option.label }
			</button>;
		} ) }
	</div>;
};

import { cn } from '#Views/shared/ui/cn.utility';
