declare global {
	interface Window {
		api : import( '#src/preload' ).API;
	}
}
export {};
