export const CheckboxField = ( props:{
	checked?: boolean;
	onCheckedChange?: ( checked:boolean ) => void;
	disabled?: boolean;
	children: React.ReactNode;
	className?: string;
} ) => {
	return <label className={ cn( 'flex items-start gap-2.5 cursor-pointer select-none text-sm' , props.className ) }>
		<Checkbox
			checked={ props.checked }
			disabled={ props.disabled }
			className="mt-0.5"
			onCheckedChange={ ( value ) => props.onCheckedChange?.( value === true ) }
		/>
		<span>{ props.children }</span>
	</label>;
};

import { Checkbox } from '#Views/shared/ui/checkbox';
import { cn } from '#Views/shared/ui/cn.utility';
