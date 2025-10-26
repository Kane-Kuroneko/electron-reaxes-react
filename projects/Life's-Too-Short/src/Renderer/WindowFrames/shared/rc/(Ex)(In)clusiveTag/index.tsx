const Tag = reaxper((props:TagProps) => {
	
	
	return <div className={less.tag}>
		<span>{props.children}</span>
		<span className={less.icon}>
			{{
				'inclusive' : <InclusiveSVG/>,
				'exclusive' : <ExclusiveSVG/>,
			}[props.tag]}
		</span>
	</div>
})
export default Tag;

export type TagProps = React.PropsWithChildren<{
	tag : "exclusive" | "inclusive"
	
}>

import { InclusiveSVG } from "../SVG.Component/Inclusive.svg";
import { ExclusiveSVG } from "../SVG.Component/ExclusiveSVG";
import less from './index.module.less';
