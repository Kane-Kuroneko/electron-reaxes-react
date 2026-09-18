
declare module '*.module.less'
declare module '*.module.css'
/* 走 @svgr/webpack（engine/webpack/base.conf.ts），import 即 React 组件 */
declare module '*.component.svg' {
	const SvgComponent: React.FC<React.SVGProps<SVGSVGElement>>;
	export default SvgComponent;
}
declare module '*.json' {
	const value: any;
	export default value;
}


