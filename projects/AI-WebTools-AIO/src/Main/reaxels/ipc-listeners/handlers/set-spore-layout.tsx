IpcMainHandle('set-spore-layout').handle(( e , data ) => {
	const { position } = data;
	const layout = function (){
		switch( true ) {
			case [ 'left' , 'right' ].includes(position):
				return 'vertical';
			case [ 'top' , 'bottom' ].includes(position):
				return 'horizontal';
			case [ 'leftTop' , 'leftBottom' , 'rightTop' , 'rightBottom' ].includes(position):
				return 'grid';
			case position === 'center' :
			default :
				return 'center';
		}
	}();
	switch( layout ) {
		case "horizontal": {
		}
	}
	return {
		spore_view_id : null ,
	};
});

import { reaxel_DropPadController } from '#main/reaxels/dropPadView-controller';
import { IpcMainHandle } from '#project/src/utils/main/useIPC';
