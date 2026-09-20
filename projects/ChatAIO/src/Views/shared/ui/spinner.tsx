export const Spinner = ( { className , size = 16 }: { className?: string; size?: number } ) => {
	return <Loader2
		size={ size }
		className={ cn( 'animate-spin text-muted-foreground' , className ) }
	/>;
};

import { cn } from '#Views/shared/ui/cn.utility';
import { Loader2 } from 'lucide-react';
