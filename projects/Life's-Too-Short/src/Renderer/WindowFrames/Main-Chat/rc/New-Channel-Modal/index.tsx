const newChannel_store = reaxel_Chats.store.newChannel;
const newChannel_setState = reaxel_Chats.setState.newChannel;
const newChannel_mutate = reaxel_Chats.mutate.newChannel;

type TransferItem = {
	key: string;
	title: string;
	description: string;
	disabled?: boolean;
}

const preset_quick_prompts = [
	{
		group_name : '理性/感性' ,
		group_id : 'rationality_emotion' ,
		radio_options : [
			{
				label : '理性' ,
				value : 'rational' ,
			} ,
			{
				label : '感性' ,
				value : 'emotional' ,
			} ,
		] ,
	} ,
	{
		group_name : '语气' ,
		group_id : 'tone' ,
		radio_options : [
			{
				label : '正式' ,
				value : 'formal' ,
			} ,
			{
				label : '幽默' ,
				value : 'humorous' ,
			} ,
			{
				label : '风趣' ,
				value : 'witty' ,
			} ,
			{
				label : '讽刺' ,
				value : 'sarcastic' ,
			} ,
			{
				label : '乐观' ,
				value : 'optimistic' ,
			} ,
			{
				label : '悲观' ,
				value : 'pessimistic' ,
			} ,
		] ,
	} ,
	{
		group_name : '详略' ,
		group_id : 'detail_level' ,
		radio_options : [
			{
				label : '简洁' ,
				value : 'concise' ,
			} ,
			{
				label : '深度' ,
				value : 'in-depth' ,
			} ,
			{
				label : '自动' ,
				value : 'auto' ,
			} ,
		] ,
	} ,
	{
		group_name : 'mbti' ,
		group_id : 'mbti' ,
		radio_options : [
			{
				label : 'INTJ' ,
				value : 'intj' ,
			} ,
			{
				label : 'INTP' ,
				value : 'intp' ,
			} ,
			{
				label : 'ENTJ' ,
				value : 'entj' ,
			} ,
			{
				label : 'ENTP' ,
				value : 'entp' ,
			} ,
			{
				label : 'INFJ' ,
				value : 'infj' ,
			} ,
			{
				label : 'INFP' ,
				value : 'infp' ,
			} ,
			{
				label : 'ENFJ' ,
				value : 'enfj' ,
			} ,
			{
				label : 'ENFP' ,
				value : 'enfp' ,
			} ,
			{
				label : 'ISTJ' ,
				value : 'istj' ,
			} ,
			{
				label : 'ISFJ' ,
				value : 'isfj' ,
			} ,
			{
				label : 'ESTJ' ,
				value : 'estj' ,
			} ,
			{
				label : 'ESFJ' ,
				value : 'esfj' ,
			} ,
			{
				label : 'ISTP' ,
				value : 'istp' ,
			} ,
			{
				label : 'ISFP' ,
				value : 'isfp' ,
			} ,
			{
				label : 'ESTP' ,
				value : 'estp' ,
			} ,
			{
				label : 'ESFP' ,
				value : 'esfp' ,
			} ,
		] ,
	} ,
];

const isGroupId = (id:string,groups:{
	group_name:string;
	group_id:string;
	radio_options:{
		label:string;
		value:string;
	}[];
}[]) => groups.some(it => it.group_id === id);

export const NewChannelModal = reaxper( () => {
	const { toggleNewChannelModal } = reaxel_Chats();
	const enabledGroupIds = new Set(
		newChannel_store.quick_prompts.filter(p => p.enabled).map(p => p.group_id)
	);
	const treeData: TreeDataNode[] = preset_quick_prompts.map(group => {
		const isGroupEnabled = enabledGroupIds.has(group.group_id);
		return {
			key: group.group_id,
			title: group.group_name,
			selectable: false,
			checkable: true,
			children: group.radio_options.map(option => ({
				key: `${group.group_id}_${option.value}`,
				title: option.label,
				selectable: true,
				checkable: true,
				isLeaf: true,
				// 关键：disabled 状态直接由派生出的 enabledGroupIds 决定
				disabled: !isGroupEnabled,
			})),
		};
	});
	const checkedKeys = [
		...Array.from(enabledGroupIds), // 启用的组
		...newChannel_store.quick_prompts
		.filter(p => p.enabled)
		.map(p => `${p.group_id}_${p.selected}`), // 启用的组中所选的选项
	];
	const handleCheck = ( { checked }: { checked: Key[]; halfChecked: Key[] }, info: CheckInfo<TreeDataNode>) => {
		const nodeKey = info.node.key as string;
		const isChecked = info.checked;
		
		// 直接判断点击的是否为 Group
		if (isGroupId(nodeKey, preset_quick_prompts)) {
			// Group checkbox clicked
			newChannel_mutate(s => {
				let group = s.quick_prompts.find(it => it.group_id === nodeKey);
				if (group) {
					group.enabled = isChecked;
				} else if (isChecked) {
					// 如果是首次启用，创建并添加到 store
					s.quick_prompts.push({
						group_id: nodeKey,
						selected: preset_quick_prompts.find(it => it.group_id === nodeKey)!.radio_options[0].value,
						enabled: true,
					});
				}
			});
		} else {
			// Option radio-like checkbox clicked
			// 只有在启用的组内点击选项才有效
			if (!info.node.disabled) {
				const checkedOptions = checked.filter( (id:string) => !isGroupId( id , preset_quick_prompts ) );
				//找到用户点击的节点在第几个组里
				const index = info.node.pos.split( '-' ).map( Number )[1];
				const clickedGroup = preset_quick_prompts[index];
				newChannel_mutate( s => {
					const group = s.quick_prompts.find( it => it.group_id === clickedGroup.group_id );
					
					group.selected = (info.node.key as string).replace( `${ clickedGroup.group_id }_` , '' );
				} );
			}
		}
	};

	return <Modal
		title="Create New Channel"
		open={ newChannel_store.open }
		footer={ <>
			<CreateButton />
			<CancelButton />
		</> }
		onCancel={ () => {
			toggleNewChannelModal();
		} }
		width="max(80%, 600px)"
	>
		<Form
			layout="vertical"
			spellCheck={ false }
			colon
			variant="filled"
		>
			<Form.Item
				label="Channel Name"
			>
				<Input
					
					value={ newChannel_store.title }
					onChange={ e => newChannel_setState( { title : e.target.value } ) }
				/>
			</Form.Item>
			<Form.Item
				label="Description"
			>
				<Input
					value={ newChannel_store.description }
					onChange={ e => newChannel_setState( { description : e.target.value } ) }
				/>
			</Form.Item>
			<Form.Item
				label="System prompt"
			>
				<Input.TextArea
					value={ newChannel_store.system_prompt }
					onChange={ e => newChannel_setState( { system_prompt : e.target.value } ) }
					style={ {
						width : '100%' ,
						height : '100px' ,
					} }
				/>
			</Form.Item>
			<Form.Item
				label="User prompt"
			>
				<Input.TextArea
					value={ newChannel_store.user_prompt }
					onChange={ e => newChannel_setState( { user_prompt : e.target.value } ) }
					style={ {
						width : '100%' ,
						height : '100px' ,
					} }
				/>
			</Form.Item>
			<Form.Item label="Quick Prompts">
				<div>
					<Tree<TreeDataNode>
						checkable
						checkStrictly
						className="draggable-tree"
						draggable={{
							nodeDraggable: (node) => isGroupId(node.key as string, preset_quick_prompts),
						}}
						onCheck={handleCheck}
						checkedKeys={checkedKeys}
						treeData={treeData}
					/>
				</div>
			</Form.Item>
		</Form>
	</Modal>;
} );

const CreateButton = reaxper( () => {
	
	return <Button>
		Confirm
	</Button>;
} );

const CancelButton = reaxper( () => {
	return <Button>Cancel</Button>;
} );

import {
	Button ,
	Form ,
	Modal ,
	Input ,
	Transfer ,
	Radio ,
	Tree ,
	type TransferProps ,
	type TreeDataNode ,
	type TreeProps ,
} from "antd";
import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import { type Key } from 'rc-tree/lib/interface';
import { type CheckInfo } from 'rc-tree/lib/Tree';
