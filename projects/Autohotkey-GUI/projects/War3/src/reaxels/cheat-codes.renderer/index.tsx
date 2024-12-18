export const reaxel_CheatCodes = reaxel( () => {
	
	const { store , setState , mutate } = orzMobx( {
		cheatCodesData : [ ...originalCheatCodesData ] as DataType[],
	} );
	
	Refaxel_BrowserPersist('|cheat-codes|')({store,setState});
	
	let ret = {
		cheatCodes_Store : store ,
		cheatCodes_SetState : setState ,
		cheatCodes_Mutate : mutate ,
		dragToSort(cheatCodesData) {
			setState( { cheatCodesData } );
		},
		resetCheatCodes(){
			setState( { cheatCodesData : originalCheatCodesData } );
		}
	};
	return () => {
		
		return ret;
	};
} );
interface DataType {
	key: string;
	code: string;
	description: string;
	children? : DataType[],
	// _zh_desc?:string,
}
import { Refaxel_BrowserPersist } from '#generic/reaxels/browser-persist';
import { originalCheatCodesData } from './cheat-data';
