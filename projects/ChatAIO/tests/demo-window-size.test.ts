import assert from 'node:assert/strict';
import test from 'node:test';
import { pickDemoWindowSize } from '../demo/support/window-size';

test( 'demo window size picks the largest 16:9 preset that fits workArea' , () => {
	assert.deepEqual( pickDemoWindowSize( {
		width : 2560 ,
		height : 1440,
	} ) , {
		width : 1920 ,
		height : 1080,
	} );
	assert.deepEqual( pickDemoWindowSize( {
		width : 1920 ,
		height : 1040,
	} ) , {
		width : 1600 ,
		height : 900,
	} );
	assert.deepEqual( pickDemoWindowSize( {
		width : 1366 ,
		height : 768,
	} ) , {
		width : 1280 ,
		height : 720,
	} );
	assert.deepEqual( pickDemoWindowSize( {
		width : 1024 ,
		height : 600,
	} ) , {
		width : 1280 ,
		height : 720,
	} );
} );
