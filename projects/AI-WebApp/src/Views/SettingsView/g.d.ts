declare global{
	export const api:API;
}

export {}


import {ipcRenderer,} from 'electron';
import {type API} from '../../preload';
