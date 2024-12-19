export const columns: TableColumnType<DataType>[] = [
	{
		key : 'description' ,
		dataIndex : 'description' ,
		title : 'Description' ,
		render( text , record , index ) {
			return <span style = { { display : "flex" , justifyContent : 'space-between' } }>
				<I18n>{ text }</I18n>
				{ record.example && <Tooltip
					title = { i18n( record.example ) }
					color= "green"
				>
					<InfoCircleTwoTone
						style = { {
							cursor : 'pointer' ,
						} }
					/>
				</Tooltip> }
			</span>;
		} ,
	} ,
	{
		key : 'code' ,
		dataIndex : 'code' ,
		className : 'selectable' ,
		title : 'Cheat Code' ,
		width : '25%' ,
		render( value , record , index ) {
			
			return <b style = { { wordBreak : 'keep-all' , whiteSpace : 'nowrap' } }>{ value }</b>;
		} ,
		
	} ,
	{
		key : 'operations' ,
		dataIndex : 'operations' ,
		title : 'Operations' ,
		width : 200 ,
		render( text , record , index ) {
			return <div>
				<Button type = "primary"><I18n>Copy</I18n></Button>
			</div>;
		} ,
	} ,
	{
		key : 'dnd' ,
		dataIndex : null ,
		title : 'Drag to Sort' ,
		width : 120 ,
		render( text , record , index ) {
			
			return <DragIcon k = { record.key } />;
		} ,
	} ,
];

import { DragIcon } from './DragIcon';
import { Button,Tooltip } from 'antd';
import { InfoCircleTwoTone } from '@ant-design/icons';
import type { DataType } from './types';
import type { TableColumnType } from 'antd';
