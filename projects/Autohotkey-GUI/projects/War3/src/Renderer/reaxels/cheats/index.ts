export const reaxel_CheatCodes = reaxel( () => {
	
	const { store , setState , mutate } = createReaxable( {
		cheatCodesData : [ ...originalCheatCodesData ] as DataType[],
	} );
	
	rehance_BrowserPersist('|cheat-codes|')({store,setState});
	
	let rtn = {
		dragToSort(cheatCodesData) {
			setState( { cheatCodesData } );
		},
		resetCheatCodes(){
			setState( { cheatCodesData : originalCheatCodesData } );
		}
	};
	return Object.assign(() => {
		return rtn;
	},{
		store ,
		setState ,
		mutate ,
	} );
} );
export interface DataType {
	key: string;
	code: string;
	description: string;
	example? : string;
	children? : DataType[],
	// _zh_desc?:string,
}
import { rehance_BrowserPersist } from '#generic/rehancers/browser-persist';
import { originalCheatCodesData } from './cheat-data';
