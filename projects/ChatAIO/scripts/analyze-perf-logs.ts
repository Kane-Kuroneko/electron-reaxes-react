/**
 * Performance Log 分析入口脚本
 *
 * 用法：
 *   开发分析：npx tsx projects/ChatAIO/scripts/analyze-perf-logs.ts
 *   仅最新：  npx tsx projects/ChatAIO/scripts/analyze-perf-logs.ts --latest
 *   CI 回归： npx tsx projects/ChatAIO/scripts/analyze-perf-logs.ts --ci
 *
 *   --ci       启用 CI 模式：超过阈值时返回非零退出码
 *   --dir      指定日志目录（默认：../performance-logs）
 *   --latest   只分析最新一条非 fixture 的 perf-*.jsonl
 *
 * 输出：projects/ChatAIO/performance-logs/analysis-reports/analysis-<timestamp>.md
 */

import {
	runAnalysis ,
	checkCIThresholds ,
	analyzeAllSessions ,
	listPerfLogFiles ,
	CI_THRESHOLDS ,
} from '../src/shared/utils/perf-log-analyzer.utility';
import * as path from 'node:path';

const args = process.argv.slice( 2 );
const ciMode = args.includes( '--ci' );
const latestOnly = args.includes( '--latest' );
const dirIdx = args.indexOf( '--dir' );
const logDir = dirIdx >= 0 && args[dirIdx + 1]
	? path.resolve( args[dirIdx + 1] )
	: path.resolve( __dirname , '..' , 'performance-logs' );
const outputDir = path.resolve( logDir , 'analysis-reports' );
const analyzeOpts = { latestOnly , skipFixtures : true };

const included = listPerfLogFiles( logDir , analyzeOpts );
console.log( `[PerfAnalyzer] Scanning: ${ logDir }` );
console.log( `[PerfAnalyzer] Files (${ included.length }):` );
for( const f of included ) {
	console.log( `  - ${ path.basename( f ) }` );
}
if( latestOnly ) {
	console.log( `[PerfAnalyzer] --latest: only newest non-fixture log` );
}
if( ciMode ) {
	console.log( `[PerfAnalyzer] CI mode enabled — will fail on threshold violations` );
}

const { mdPath , jsonPath } = runAnalysis( logDir , outputDir , analyzeOpts );

console.log( `\nDone.` );
console.log( `  Markdown: ${ mdPath }` );
console.log( `  JSON:     ${ jsonPath }` );

/* ── CI 回归检测 ── */
if( ciMode ) {
	const report = analyzeAllSessions( logDir , analyzeOpts );
	const violations = checkCIThresholds( report );

	if( violations.length > 0 ) {
		console.error( `\n[PerfAnalyzer] CI FAILED — ${ violations.length } threshold violation(s):` );
		for( const v of violations ) {
			console.error( `  [${ v.metric }] ${ v.detail } (threshold: ${ v.threshold }, actual: ${ v.actual })` );
		}
		console.error( `\nCI thresholds defined in: src/shared/utils/perf-log-analyzer.utility.ts → CI_THRESHOLDS` );
		process.exit( 1 );
	}

	console.log( `\n[PerfAnalyzer] CI PASSED — all metrics within thresholds.` );
	console.log( `  Thresholds:` );
	console.log( `    maxAvgMainOverhead:    ${ CI_THRESHOLDS.maxAvgMainOverhead }ms` );
	console.log( `    maxSingleMainOverhead: ${ CI_THRESHOLDS.maxSingleMainOverhead }ms` );
	console.log( `    maxCloseOverhead:      ${ CI_THRESHOLDS.maxCloseOverhead }ms` );
	console.log( `    maxCloseExitDuration:  ${ CI_THRESHOLDS.maxCloseExitDuration }ms` );
	console.log( `    maxP1Anomalies:        ${ CI_THRESHOLDS.maxP1Anomalies }` );
}
