export const AltInventory = reaxper(() => {
	
	return <div className={less['altkeyDiagram']}>
		<div className = "keys-area">
			<HotKey className = "LAlt-key">
				<I18n>Left Alt</I18n>
			</HotKey>
			<div className = "add-icon">+</div>
			<table>
				<tbody>
					<tr>
						<td>
							<HotKey>Q</HotKey>
						</td>
						<td><HotKey>W</HotKey></td>
					</tr>
					<tr>
						<td><HotKey>A</HotKey></td>
						<td><HotKey>S</HotKey></td>
					</tr>
					<tr>
						<td><HotKey>Z</HotKey></td>
						<td><HotKey>X</HotKey></td>
					</tr>
				</tbody>
			
			
			</table>
		</div>
		<span>
			<I18n>Mapping to inventory , Right Alt not modified</I18n>
		</span>
	</div>
} )

import { reaxel_I18n } from '../../reaxels/i18n';
import { HotKey } from '../HotKey';
import less from './style.module.less';
