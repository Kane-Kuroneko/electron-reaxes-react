/**
 * 解决竞态请求:
 当发起多个相似请求时, 只保留最后一个结果, 之前的then里被preventDup包裹的回调将不会运行, 防止重复渲染或重复执行逻辑.
 */
export const reaxel_fact__prevent_dup_request = function
	<
		T extends (preventDup : (callback) => Promise<F>) => (..._args) => Promise<F> ,
		A extends any[],
		F = any
	>
(requester:T){
	const {
		store ,
		setState,
	} = orzMobx({
		pending : null as Promise<F> ,
	});
	return () => {
		
		return {
			grasp(...args : Parameters<ReturnType<T>>){
				/*当Promise resolve的时候*/
				const preventDup = (callback) => {
					if(promiseResult !== store.pending){
						return null;
					}
					setState({ pending : null });
					return callback();
				}
				const promiseResult = requester(preventDup)(...args);
				setState({ pending : promiseResult });
			},
			get pending(){
				return store.pending;
			},
		};
	};
};
/*↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓以下是使用示例*/

const reaxel_fetch = function(){
	const { store , setState } = orzMobx({
		text : null ,
	});
	const reax_req = reaxel_fact__prevent_dup_request((preventDup) => () => {
		return req({a:1,b:""}).then((text) => {
			return preventDup(() => {
				setState({ text });
			});
			return text;
		}).then((text) => {
			return preventDup(() => {
				console.log(text);
				console.log(text.slice(0 , 1));
			});
		});
	})();
	
	return () => {
		
		return {
			get text(){
				return store.text;
			},
			fetch(){
				reax_req.grasp();
			},
		} 
	}
}()

let count = 0;
export const PreventDupTest = reaxper(() => {
	
	const { fetch , text } = reaxel_fetch();
	/*@ts-ignore*/
	const { Button } = antd;
	return <>
		<Button
			onClick = { () => {
				fetch();
			} }
		>
			request
		</Button>
		
		<p>
			{ text }
		</p>
	</>;
});


const req = (args:{a:number,b:string}) => orzPromise((resolve) => {
	
	setTimeout(() => {
		resolve(`${ count ++ } success ! ~~`);
	} , 1500);
});
