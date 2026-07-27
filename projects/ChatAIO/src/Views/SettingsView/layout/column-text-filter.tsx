/**
 * antd Table 列的 Input 文本筛选套件（Search / Reset）。
 * 与官方「自定义筛选面板」同一模式，可复用到任意列。
 */
export const createColumnTextFilter = <RecordType ,>(
	getValue : ( record : RecordType ) => string ,
	options : {
		/** i18n 源文案 key；在下拉打开时再解析，避免语言切换后占位符过期 */
		placeholderKey? : string;
	} = {} ,
) : Pick<
	ColumnType<RecordType> ,
	'filterDropdown' | 'filterIcon' | 'onFilter'
> => {
	const placeholderKey = options.placeholderKey ?? 'Search';

	return {
		filterDropdown : ( {
			setSelectedKeys ,
			selectedKeys ,
			confirm ,
			clearFilters ,
		} ) => (
			<div
				className="settings-column-text-filter"
				onKeyDown={ e => e.stopPropagation() }
			>
				<Input
					allowClear
					placeholder={ i18n( placeholderKey ) }
					value={ selectedKeys[0] as string | undefined }
					onChange={ e => {
						setSelectedKeys( e.target.value ? [ e.target.value ] : [] );
					} }
					onPressEnter={ () => {
						confirm();
					} }
					style={ { marginBottom : 8 , display : 'block' } }
				/>
				<Space size={ 8 }>
					<Button
						type="primary"
						size="small"
						icon={ <SearchOutlined /> }
						onClick={ () => {
							confirm();
						} }
					>
						{ i18n( 'Search' ) }
					</Button>
					<Button
						size="small"
						onClick={ () => {
							clearFilters?.();
							confirm();
						} }
					>
						{ i18n( 'Reset' ) }
					</Button>
				</Space>
			</div>
		) ,
		filterIcon : filtered => (
			<SearchOutlined style={ { color : filtered ? '#1677ff' : undefined } } />
		) ,
		onFilter : ( value , record ) => {
			const text = ( getValue( record ) || '' ).toLowerCase();
			return text.includes( String( value ).toLowerCase() );
		} ,
	};
};

import { i18n } from '#SettingsView/reaxels/exports';
import { SearchOutlined } from '@ant-design/icons';
import {
	Button ,
	Input ,
	Space ,
	type TableColumnType as ColumnType ,
} from 'antd';
