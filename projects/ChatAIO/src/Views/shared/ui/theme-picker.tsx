export const ThemePicker = ( props:{
	value: Appearance.Theme;
	systemTheme: 'light' | 'dark';
	onChange: ( value:Appearance.Theme ) => void;
	labels?: {
		light: React.ReactNode;
		dark: React.ReactNode;
		followSystem: React.ReactNode;
	};
} ) => {
	const labels = props.labels || {
		light : <I18n>Light</I18n> ,
		dark : <I18n>Dark</I18n> ,
		followSystem : <I18n>Follow System</I18n>,
	};
	const options = [
		{ value : 'light' as const , icon : Sun , label : labels.light } ,
		{ value : 'dark' as const , icon : Moon , label : labels.dark } ,
		{ value : 'system' as const , icon : Monitor , label : labels.followSystem } ,
	];
	return <div
		className="inline-flex rounded-lg bg-muted p-0.5"
		role="radiogroup"
		aria-label="Theme"
	>
		{ options.map( option => {
			const Icon = option.icon;
			const active = props.value === option.value;
			return <button
				key={ option.value }
				type="button"
				role="radio"
				aria-checked={ active }
				aria-label={ option.value === 'system' ? 'Follow System' : option.value === 'dark' ? 'Dark' : 'Light' }
				className={ cn(
					'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors select-none' ,
					active
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground',
				) }
				onClick={ () => props.onChange( option.value ) }
			>
				<Icon className="h-3.5 w-3.5" />
				{ option.label }
				{ option.value === 'system' ? <span className="text-[10px] text-muted-foreground">
					({ props.systemTheme === 'dark' ? 'Dark' : 'Light' })
				</span> : null }
			</button>;
		} ) }
	</div>;
};

import { cn } from '#Views/shared/ui/cn.utility';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import { Monitor , Moon , Sun } from 'lucide-react';
