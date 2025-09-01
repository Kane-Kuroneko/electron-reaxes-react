import {
	NavigateFunction ,
	useNavigate,
} from "react-router-dom";
import { useChat } from "#Main-Chat/rc/Chat/useChat";
import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import { useLayoutEffect } from "react";

const {store,setState,mutate} = createReaxable({
	fn: null as (navigate:NavigateFunction) => void ,
});

export const outsideNavigate = (fn:(navigate:NavigateFunction) => void) => {
	setState({fn});
}

export type OutsideNavigateParams = {
	chat_id? : string;
	home? : boolean,
}

export const OutsideNavigate = reaxper( () => {
	const { chat_id,chat } = useChat();
	const navigate = useNavigate();
	
	const { fn } = store;
	const {setCurrentChat} = reaxel_Chats();
	
	useLayoutEffect( () => {
		if(chat_id){
			setCurrentChat(chat_id);
		}
	} , [chat_id] );
	
	useLayoutEffect( () => {
		fn?.( navigate );
		
		console.log('已通过外部路由跳转');
	} , [ fn ] );
	
	return null;
} );

type HooksMap = Record<string, () => any>;

export const createHooksEverywhere = <T extends HooksMap>(hooks: T) => {
	
	const hooksKeyObj = (Object.keys(hooks) as (keyof T)[]).reduce((accu, key) => {
		accu[key] = null;
		return accu;
	}, {} as { [K in keyof T]: (value: ReturnType<T[K]>) => void });
	
	const {
		store,
		setState,
	} = createReaxable({
		...hooksKeyObj,
	});
	
	return {
		hookCalls: Object.keys(hooks).reduce((accu, key) => {
			(accu as any)[key] = (fn: (value: ReturnType<T[typeof key]>) => void) => {
				if (typeof fn !== "function") {
					throw new Error("fn参数必须是个函数!:>vscuasd");
				}
				setState({ [key]: fn } as any);
			};
			return accu;
		}, {} as { [K in keyof T]: (fn: (value: ReturnType<T[K]>) => void) => void }),
		
		HookComponent: reaxper(() => {
			Object.keys(hooks).forEach((key) => {
				const hookRtn = hooks[key as keyof T]();
				
				useLayoutEffect(() => {
					store[key as keyof T]?.(hookRtn);
				}, [store[key as keyof T]]);
			});
			
			return null;
		}),
	};
};

export const createHookInChildren = <ParamFn extends (...args:any[]) => any>() => {
	
	const {
		store:HIC_Store,
		setState:HIC_SetState,
	} = createReaxable({
		innerHookFn:null as ParamFn,
	})
	
	return {
		HookInChildrenComponent : reaxper(({children}:{children:(cb:(fn:ParamFn) => void) => void}) => {
			children((fn) => {
				HIC_SetState({
					innerHookFn : fn,
				})
			});
			return null;
		}),
		
		hookInChildrenCall : (...params:Parameters<ParamFn>) => {
			HIC_Store.innerHookFn(...params);
		}
		
	}
}

export const {
	HookInChildrenComponent,
	hookInChildrenCall,
} = createHookInChildren<(name:string,age:number) => any>();

//@ts-ignore
window.hic_call = () => {
	hookInChildrenCall(11,'sdsd');
}

export const {
	HookComponent ,
	hookCalls,
	
} = createHooksEverywhere({
	navigate(){
		return useNavigate();
	},
	chat(){
		return useChat();
	}
});

//@ts-ignore
window.h_chat = () => {
	hookCalls.chat((chat) => {
		console.log(chat.chat_id);
		hookCalls.navigate((nav) => {
			nav(`/chat/${chat.chat_id}`);
		})
	})
}
//@ts-ignore
window.h_nav = () => {
	hookCalls.navigate((nav) => {
		nav('/');
	})
}

import {} from 'reaxes-utils';
