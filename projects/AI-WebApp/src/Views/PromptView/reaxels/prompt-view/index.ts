export const reaxel_PromptView = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		side : checkAs<PromptView.Side>( 'left' ) ,
		items : checkAs<PromptView.Item[]>( [] ) ,
		appearance : {
			theme : checkAs<'light' | 'dark'>( 'light' ) ,
			themeSource : checkAs<PromptView.Appearance['themeSource']>( 'light' ),
		} ,
		status : {
			loading : true ,
			saving : false ,
			error : '',
		},
	} );
	
	let saveTimer:ReturnType<typeof setTimeout> = null;
	
	const init = async() => {
		const side = getSideFromLocation();
		setState( { side } );
		setState.status( {
			loading : true ,
			error : '',
		} );
		try {
			const state = await api.getPromptViewState( side );
			setState( {
				side : state.side ,
				items : state.items ,
				appearance : state.appearance,
			} );
			applyAppearanceToDocument( state.appearance );
			setState.status( {
				loading : false ,
				error : '',
			} );
		} catch ( error ) {
			setState.status( {
				loading : false ,
				error : error instanceof Error ? error.message : String( error ),
			} );
		}
	};
	
	const queuePersist = () => {
		if( saveTimer ) {
			clearTimeout( saveTimer );
		}
		saveTimer = setTimeout( () => {
			saveTimer = null;
			void persistNow();
		} , 220 );
	};
	
	const persistNow = async(items = store.items) => {
		if( saveTimer ) {
			clearTimeout( saveTimer );
			saveTimer = null;
		}
		setState.status( { saving : true } );
		const result = await api.savePromptViewItems( store.side , cloneForIPC( items ) );
		if( result.success ) {
			setState.status( {
				saving : false ,
				error : '',
			} );
			return result;
		}
		setState.status( {
			saving : false ,
			error : result.error || 'Failed to save prompts',
		} );
		return result;
	};
	
	const setPromptText = (id:string , content:string) => {
		setState( {
			items : store.items.map( item => item.id === id
				? {
					...item ,
					content ,
					updatedAt : Date.now(),
				}
				: item ),
		} );
		queuePersist();
	};
	
	const addPrompt = () => {
		setState( {
			items : [
				...store.items ,
				createPromptItem(),
			],
		} );
		queuePersist();
	};
	
	const duplicatePrompt = (id:string) => {
		const index = store.items.findIndex( item => item.id === id );
		if( index === -1 ) {
			return;
		}
		const source = store.items[index];
		const nextItems = store.items.slice();
		nextItems.splice( index + 1 , 0 , createPromptItem( source.content ) );
		setState( { items : nextItems } );
		queuePersist();
	};
	
	const deletePrompt = (id:string) => {
		setState( {
			items : store.items.filter( item => item.id !== id ),
		} );
		queuePersist();
	};
	
	const reorderPrompts = (activeId:string , overId:string) => {
		const activeIndex = store.items.findIndex( item => item.id === activeId );
		const overIndex = store.items.findIndex( item => item.id === overId );
		if( activeIndex === -1 || overIndex === -1 || activeIndex === overIndex ) {
			return;
		}
		setState( {
			items : arrayMove( store.items.slice() , activeIndex , overIndex ),
		} );
		queuePersist();
	};
	
	const copyPrompt = async(id:string) => {
		const item = store.items.find( prompt => prompt.id === id );
		const result = await api.copyPromptViewText( item?.content || '' );
		if( result.success ) {
			message.success( 'Copied' );
		} else {
			message.error( result.error || 'Copy failed' );
		}
		return result;
	};
	
	const rtn = {
		init ,
		persistNow ,
		setPromptText ,
		addPrompt ,
		duplicatePrompt ,
		deletePrompt ,
		reorderPrompts ,
		copyPrompt,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const getSideFromLocation = ():PromptView.Side => {
	const side = new URLSearchParams( window.location.search ).get( 'side' );
	return side === 'right' ? 'right' : 'left';
};

const createPromptItem = (content = ''):PromptView.Item => {
	const now = Date.now();
	return {
		id : createPromptItemId() ,
		content ,
		createdAt : now ,
		updatedAt : now,
	};
};

const createPromptItemId = () => {
	return `prompt-${ globalThis.crypto?.randomUUID?.() || `${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 , 10 ) }` }`;
};

const applyAppearanceToDocument = (appearance:PromptView.Appearance) => {
	document.documentElement.dataset.aiWebappTheme = appearance.theme;
	document.documentElement.dataset.aiWebappThemeSource = appearance.themeSource;
};

import { cloneForIPC } from '#src/shared/utils/clone-for-ipc.utility';
import type { PromptView } from '#src/Types/PromptView';
import { arrayMove } from '@dnd-kit/sortable';
import { message } from 'antd';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
