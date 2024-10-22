export const AltInventory = reaxper(() => {
	
	
	return <div className={less['altkeyDiagram']}>
		<div className = "keys-area">
			<HotKey className = "LAlt-key">左Alt</HotKey>
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
		<span>对应物品栏，右Alt未改动</span>
	</div>
} )

console.log(less);
import { HotKey } from '../HotKey';
import * as less from './style.module.less';
