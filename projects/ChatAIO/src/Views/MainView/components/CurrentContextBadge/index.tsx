export const CurrentContextBadge = reaxper( ( {
	label ,
} : {
	label : string;
} ) => {
	return (
		<div
			className="main-view-context-badge"
			title={ label }
			role="status"
			aria-label={ label }
		>
			<span className="main-view-context-badge__label">{ label }</span>
		</div>
	);
} );


import { reaxper } from 'reaxes-react';
