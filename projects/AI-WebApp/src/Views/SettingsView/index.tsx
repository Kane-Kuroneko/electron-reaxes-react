const root = createRoot( document.getElementById( "react-app-root" ) );

const {Item} = Form;

const {store,setState,mutate} = createReaxable({
	userinputs : {
		proxy : '',
	}
});

@reaxper
class App extends Reaxlass {
	render() {
		
		const userInputsStore = store.userinputs;
		const setUserInputs = setState.userinputs;
		
		useEffect(() => {
			(async () => {
				const {proxy} = await IPC.invoke('get-settings');
				setUserInputs({
					proxy : proxy
				});
			})();
		},[]);
		
		return <div style={{
			display:'flex',
			flexFlow : 'row nowrap'
		}}>
			<Menu
				items={[
					{
						label:'proxy',
						key:'proxy',
					}
				]}
				onChange={
					(key) => {
						console.log(key);
					}
				}
			/>
			<div>
				<Item
					label="Proxy"
				>
					<Input
						value={userInputsStore.proxy}
						onChange={
							(e) => {
								setUserInputs({
									proxy : e.target.value
								});
							}
						}
						suffix={<Button>Save</Button>}
					/>
				</Item>
			</div>
		</div>;
	}
}
IPC.invoke('get-settings').then(() => {
	
})
root.render( <App /> );


import {Menu,Form,Input,Button} from 'antd'
import {createReaxable,obsReaction,} from 'reaxes';
import {reaxper,Reaxlass} from 'reaxes-react';
import { createRoot } from "react-dom/client";
import './index.module.less';


