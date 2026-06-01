const readArgument = (name:string) => {
	const prefix = `${ name }=`;
	const target = process.argv.find( item => item.startsWith( prefix ) );
	return target ? target.slice( prefix.length ) : '';
};

const language = readArgument( '--ai-webapp-language' );
const theme = readArgument( '--ai-webapp-theme' );
const themeSource = readArgument( '--ai-webapp-theme-source' );

const defineNavigatorGetter = (key:'language' | 'languages' , getter:() => unknown) => {
	try {
		Object.defineProperty( Navigator.prototype , key , {
			get : getter ,
			configurable : true,
		} );
	} catch ( error ) {
		console.warn( '[AIPagePreload] Failed to override navigator.' + key , error );
	}
};

if( language ) {
	defineNavigatorGetter( 'language' , () => language );
	defineNavigatorGetter( 'languages' , () => {
		const base = language.split( '-' )[0];
		return language === base ? [ language ] : [ language , base , 'en-US' , 'en' ];
	} );
}

const applyThemeToDocument = () => {
	if( !theme ) return;
	document.documentElement.dataset.aiWebappTheme = theme;
	document.documentElement.dataset.aiWebappThemeSource = themeSource || theme;
	document.documentElement.style.colorScheme = theme;
};

if( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded' , applyThemeToDocument , { once : true } );
} else {
	applyThemeToDocument();
}
