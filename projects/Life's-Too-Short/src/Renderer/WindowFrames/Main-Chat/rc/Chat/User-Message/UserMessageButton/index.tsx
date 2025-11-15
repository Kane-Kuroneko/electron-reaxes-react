import { DeleteSvg } from "#Main-Chat/rc/Chat/User-Message/UserMessageButton/svg/delete.svg";

export const UserMessageButton = reaxper( ( props: UserMessageButtonProps ) => {
	
	const Svg = iconmap[props.operation];
	
	return <div
		className={ less.messageButton }
		onClick={ props.onClick }
	>
		<Svg/>
	</div>;
} );

export type UserMessageButtonProps = {
	title: string;
	onClick: () => void;
	/**
	 * 按钮的操作类型，用于区分不同的按钮行为和icon
	 * delete: 会删除当前turn(含)之后的所有turn
	 */
	operation?: 'copy' | 'delete' | 'edit' | 'share' ;
};

const iconmap = {
	'copy':CopySvg,
	'edit' : EditSvg,
	'delete':DeleteSvg,
}

import { EditSvg } from './svg/edit.svg';
import { CopySvg } from './svg/copy.svg';
import less from './style.module.less';
