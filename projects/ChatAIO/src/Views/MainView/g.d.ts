declare global {
	export const api : import( '#src/preload' ).API;

	interface Window {
		api : import( '#src/preload' ).API;
	}
}
export {};
