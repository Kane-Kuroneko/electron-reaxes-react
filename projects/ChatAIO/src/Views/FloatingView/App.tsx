export const App = reaxper( () => {
	const { handleCommand } = reaxel_FloatingView();

	/* 注册 perf flush handler：渲染进程事件通过 IPC 发送到主进程落盘 */
	useEffect( () => {
		perf.onFlush( events => {
			api.sendPerfEvent( events );
		} );

		/* 定期 flush 未满缓冲区的残留事件 */
		const interval = setInterval( () => {
			const pending = perf.drain();
			if( pending.length > 0 ) {
				api.sendPerfEvent( pending );
			}
		} , 5000 );

		return () => clearInterval( interval );
	} , [] );

	useEffect( () => {
		const disposable = api.onFloatingViewCommand( command => {
			handleCommand( command );
		} );

		return () => {
			disposable.dispose();
		};
	} , [] );

	return <main className="floating-view-root">
		<SwitchAiBar />
	</main>;
} );

import { SwitchAiBar } from '#FloatingView/components/SwitchAiBar';
import { reaxel_FloatingView } from '#FloatingView/reaxels/floating-view';
import { reaxper } from 'reaxes-react';
import { perf } from '#src/shared/utils/switch-perf-recorder.utility';
import './index.less';
