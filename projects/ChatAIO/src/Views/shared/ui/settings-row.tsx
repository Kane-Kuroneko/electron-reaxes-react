export const SettingsSection = ( props:{
	title: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
} ) => {
	return <section className={ cn( 'mb-6' , props.className ) }>
		<div className="mb-3 px-1">
			<h2 className="text-[15px] font-semibold tracking-tight text-foreground">{ props.title }</h2>
			{ props.description ? <p className="mt-1 text-sm text-muted-foreground">{ props.description }</p> : null }
		</div>
		<div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
			{ props.children }
		</div>
	</section>;
};

export const SettingsRow = ( props:{
	title: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
} ) => {
	return <div className={ cn( 'flex items-center justify-between gap-6 px-4 py-3.5' , props.className ) }>
		<div className="min-w-0">
			<div className="text-sm font-medium text-foreground">{ props.title }</div>
			{ props.description ? <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ props.description }</div> : null }
		</div>
		<div className="shrink-0">{ props.children }</div>
	</div>;
};

export const SettingsStack = ( props:{
	title: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
} ) => {
	return <div className={ cn( 'px-4 py-3.5' , props.className ) }>
		<div className="mb-3">
			<div className="text-sm font-medium text-foreground">{ props.title }</div>
			{ props.description ? <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ props.description }</div> : null }
		</div>
		{ props.children }
	</div>;
};

import { cn } from '#Views/shared/ui/cn.utility';
