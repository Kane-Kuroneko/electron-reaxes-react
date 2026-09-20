const path = require('path');

/* ChatAIO renderer only. webpack 通过 postcss-loader 指向本文件，不要放到仓库根。 */
module.exports = {
	plugins : {
		tailwindcss : {
			config : path.join(__dirname, 'tailwind.config.cjs'),
		} ,
		autoprefixer : {} ,
	} ,
};
