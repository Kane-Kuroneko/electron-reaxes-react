/*为不同时区提供响应式渲染*/
export const reaxel_Fact__timezone = function({
	defaultTzDatabaseName = "Asia/Shanghai",
} = {}){
	const {
		store , setState ,
	} = orzMobx({
		timezone : defaultTzDatabaseName ,
	});
	
	const processer = (timestamp,options:options) => {
		let date ;
		const {unix = false,format,tz} = options;
		if(unix){
			date = utils.dayjs.unix(timestamp);
		}
		/*如果显式设置时区,就用设置的*/
		if(tz){
			date = utils.dayjs.tz(date,tz);
		}else {
			date = utils.dayjs.tz(date,store.timezone);
		}
		
		if( format === true ) {
			return date.format("YYYY-MM-DD HH:mm:ss");
		}else if(typeof format === 'string'){
			return date.format(format);
		}else {
			return date.valueOf();
		}
	}
	
	return () => {
		
		return {
			get tz(){
				return store.timezone;
			},
			setTz(timezone:string){
				setState({ timezone });
			},
			timezone:(timestamp = Date.now(),options:options = {}) => {
				/*不是组件却在收集依赖,收集的是调用其组件的依赖*/
				Reaxes.collectDeps(store);
				return processer(timestamp , options);
			},
			Timezone : reaxper((props : React.PropsWithChildren<options>) => {
				Reaxes.collectDeps(store);
				const { children : timestamp = Date.now() as any  } = props;
				return processer(timestamp,_.omit(props,"children"));
			}) ,
		};
		
	};
	type options = {
		/*是否将时间格式化?调用的是dayjs.format('YYYY-MM-DD...')*/
		format? : string|boolean,
		/*是否使用unix秒作为时间戳,默认[false:毫秒]*/
		unix? : boolean,
		/*强制使用某时区,不受state影响*/
		tz? : string;
	};
};
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
