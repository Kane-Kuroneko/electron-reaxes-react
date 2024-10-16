import { createRoot } from "react-dom/client";
import { Reaxlass ,reaxper} from 'reaxes-react';
import { reaxel , Reaxes ,orzMobx,} from 'reaxes';

const root = createRoot(document.getElementById("react-app-root"));

// const ipcRenderer = _Danger_Native_IpcRenderer_;

// console.log(_Danger_Native_IpcRenderer_);

// console.log(ipcAPI.ipcRenderer());
const reaxCounter = reaxel( () => {
	const { mutate,store , setState } = orzMobx( {
		count : 0 ,
	} );
	return () => {
		
		return {
			get count() {
				return store.count;
			} ,
			add(){
				mutate( s => s.count++ );
			} ,
			minus() {
				mutate( s => s.count-- );
			},
			
		};
	};
} );

@reaxper
class App extends Reaxlass {
	render(){
		const { add , minus , count } = reaxCounter();
		return <div>
			<div>
				<button onClick = { () => add() }>add</button>
				<span onClick={() => {
					ipcAPI.ipcRenderer();
				}}>current:{ count }</span>
				<button onClick = { () => minus() }>minus</button>
			</div>
			
			<p>恭喜!你已成功运行react powered by reaxes</p>
			
			
		</div>
	}
}

root.render(<App />);
