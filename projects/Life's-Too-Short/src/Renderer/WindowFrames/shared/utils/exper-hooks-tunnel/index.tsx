import { NavigateFunction  } from "react-router-dom";

export const createHooksTunnel = <T extends (...args:any[]) => any>() => {
	
	const {store,setState} = createReaxable({
		internal : null as T,
	})
	
	return {
		stealthCall(fn:T){
			setState({internal : fn});
		},
		StealthHookComponent : reaxper((props:{children:(fn:T) => void}) => {
			const rtn = props.children(store.internal);
			return null;
		})
	}
}

export const {
	StealthHookComponent ,
	stealthCall,
} = createHooksTunnel<(navigate:NavigateFunction,chat_id:string) => void>();

//@ts-ignore
window.sc = () => {
	stealthCall((navigate,chat_id) => {
		navigate('/chat');
	})
}
