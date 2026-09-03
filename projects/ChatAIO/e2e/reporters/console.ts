/**
 * ChatAIO E2E 终端报告：按 spec 短名分组，结尾大字 9/9 通过。
 * 替换内置 list（路径、project、标题挤一行）。对齐 Playwright custom reporter + Cypress 式收尾横幅。
 * 设计：docs/features/e2e-playwright.md
 */

export default class ChatAioE2EConsoleReporter implements Reporter {
	printsToStdio() {
		return true;
	}

	onBegin( config:FullConfig , suite:Suite ) {
		this.total = suite.allTests().length;
		this.startedAt = Date.now();
		const workers = config.workers ?? 1;
		write( paint( `  ChatAIO E2E  ·  ${ this.total } 项  ·  ${ workers } worker` , ANSI.bold ) );
		if( process.env.CHATAIO_E2E_WATCH === '1' ) {
			write( paint( `  observe  slowMo=${ process.env.CHATAIO_E2E_SLOWMO_MS || '600' }ms  hold=${ process.env.CHATAIO_E2E_HOLD_MS || '2000' }ms` , ANSI.dim ) );
		}
		write( '' );
	}

	onTestBegin( test:TestCase ) {
		const spec = specShortName( test );
		if( spec !== this.currentSpec ) {
			this.currentSpec = spec;
			write( paint( `  ${ spec }` , ANSI.bold ) );
		}
	}

	onStdOut( chunk:string | Buffer ) {
		writeIndentedLog( chunk , process.stdout );
	}

	onStdErr( chunk:string | Buffer ) {
		writeIndentedLog( chunk , process.stderr );
	}

	onTestEnd( test:TestCase , result:TestResult ) {
		if( result.status === 'failed' && result.retry < test.retries ) {
			write( paint( `    ↻  重试 ${ result.retry + 1 }/${ test.retries }  ${ formatDuration( result.duration ) }` , ANSI.yellow ) );
			return;
		}
		const outcome = test.outcome();
		if( outcome === 'expected' ) {
			this.passed += 1;
			write( paint( `    ✓  ` , ANSI.bold , ANSI.green ) + test.title + paint( `  ${ formatDuration( result.duration ) }` , ANSI.dim ) );
			return;
		}
		if( outcome === 'skipped' ) {
			this.skipped += 1;
			write( paint( `    –  跳过   ${ test.title }` , ANSI.yellow ) );
			return;
		}
		if( outcome === 'flaky' ) {
			this.passed += 1;
			this.flaky += 1;
			write( paint( `    ~  ` , ANSI.bold , ANSI.yellow ) + test.title + paint( `  ${ formatDuration( result.duration ) }  曾失败` , ANSI.dim ) );
			return;
		}
		this.failed += 1;
		write( paint( `    ✗  ` , ANSI.bold , ANSI.red ) + test.title + paint( `  ${ formatDuration( result.duration ) }` , ANSI.dim ) );
		const message = result.error?.message || result.error?.value || '';
		if( message ) {
			for( const line of String( message ).split( '\n' ) ) {
				write( paint( `       ${ line }` , ANSI.red ) );
			}
		}
	}

	onError( error:TestError ) {
		write( '' );
		write( paint( '  全局错误' , ANSI.bold , ANSI.red ) );
		write( paint( `  ${ error.message || error.value || 'unknown error' }` , ANSI.red ) );
	}

	onEnd( result:FullResult ) {
		const elapsed = formatDuration( Date.now() - this.startedAt );
		const allPassed = this.failed === 0 && result.status === 'passed';
		const headline = allPassed
			? `${ this.passed }/${ this.total }  通过`
			: `${ this.passed }/${ this.total }  失败`;
		write( '' );
		writeBanner( headline , allPassed , elapsed );
		const extras = [];
		if( this.failed ) {
			extras.push( `${ this.failed } 失败` );
		}
		if( this.skipped ) {
			extras.push( `${ this.skipped } 跳过` );
		}
		if( this.flaky ) {
			extras.push( `${ this.flaky } 不稳定` );
		}
		if( extras.length ) {
			write( paint( `  ${ extras.join( '  ·  ' ) }` , ANSI.red ) );
		}
	}

	private total = 0;
	private passed = 0;
	private failed = 0;
	private skipped = 0;
	private flaky = 0;
	private startedAt = 0;
	private currentSpec = '';
}

const ANSI = {
	reset : '\x1b[0m' ,
	bold : '\x1b[1m' ,
	dim : '\x1b[2m' ,
	green : '\x1b[32m' ,
	red : '\x1b[31m' ,
	yellow : '\x1b[33m',
};

const useColor = () => {
	/* 本 reporter 就是为终端观感写的。Cursor 会塞 NO_COLOR / FORCE_COLOR=0，不能跟。 */
	return process.env.CHATAIO_E2E_NO_COLOR !== '1';
};

const paint = ( text:string , ...codes:string[] ) => {
	if( useColor() === false ) {
		return text;
	}
	return `${ codes.join( '' ) }${ text }${ ANSI.reset }`;
};

const write = ( line:string ) => {
	process.stdout.write( `${ line }\n` );
};

const writeBanner = ( headline:string , allPassed:boolean , elapsed:string ) => {
	const tone = allPassed ? ANSI.green : ANSI.red;
	write( paint( `  ${ headline }    ${ elapsed }` , ANSI.bold , tone ) );
};

const specShortName = ( test:TestCase ) => {
	const file = test.location.file.replace( /\\/g , '/' );
	const base = file.split( '/' ).pop() || file;
	return base.replace( /\.spec\.ts$/ , '' );
};

const formatDuration = ( ms:number ) => {
	if( ms < 1000 ) {
		return `${ Math.max( 0 , Math.round( ms ) ) }ms`;
	}
	return `${ ( ms / 1000 ).toFixed( 1 ) }s`;
};

const NOISY_WORKER_LOG = /The 'NO_COLOR' env is ignored|node --trace-warnings|\[chataio-e2e\] observe/;

const writeIndentedLog = ( chunk:string | Buffer , stream:NodeJS.WriteStream ) => {
	const text = String( chunk );
	for( const line of text.split( /\r?\n/ ) ) {
		if( line === '' || NOISY_WORKER_LOG.test( line ) ) {
			continue;
		}
		stream.write( `${ paint( `      ${ line }` , ANSI.dim ) }\n` );
	}
};

import type {
	FullConfig ,
	FullResult ,
	Reporter ,
	Suite ,
	TestCase ,
	TestError ,
	TestResult,
} from '@playwright/test/reporter';
