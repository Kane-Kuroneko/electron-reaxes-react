

const conf:WebpackConf = {
	devServer : {
		port : 3111
	}
};
export default conf;
type WebpackConf = import('webpack/types').Configuration & {devServer?:DevServerConf};
type DevServerConf = import('webpack-dev-server').Configuration;
