import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const arg = (process.argv[2] || 'all').toLowerCase();

const TARGETS = {
	backend: path.join(ROOT, 'backend'),
	frontend: path.join(ROOT, 'frontend'),
};

const TEST_FILE_REGEX = /\.(test|spec)\.(js|jsx|ts|tsx)$/i;

function walk(dirPath, output = []) {
	if (!existsSync(dirPath)) {
		return output;
	}

	for (const name of readdirSync(dirPath)) {
		const fullPath = path.join(dirPath, name);
		const info = statSync(fullPath);

		if (info.isDirectory()) {
			if (['node_modules', 'dist', 'build', 'coverage', '.git'].includes(name)) {
				continue;
			}
			walk(fullPath, output);
			continue;
		}

		if (TEST_FILE_REGEX.test(name)) {
			output.push(fullPath);
		}
	}

	return output;
}

function runJest(testFiles) {
	const relativeFiles = testFiles.map((file) => path.relative(ROOT, file).split(path.sep).join('/'));
	const jestBin = path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js');

	if (!existsSync(jestBin)) {
		console.error('[test] Jest is not installed. Run: npm install');
		return 1;
	}

	const result = spawnSync(process.execPath, [jestBin, '--runInBand', ...relativeFiles], {
		cwd: ROOT,
		stdio: 'inherit',
		shell: false,
	});

	if (result.error) {
		console.error('[test] Failed to start Jest:', result.error.message);
		return 1;
	}

	return result.status ?? 1;
}

function collectTargetTests(targetName) {
	if (!(targetName in TARGETS)) {
		return [];
	}

	const baseDir = TARGETS[targetName];
	if (!existsSync(baseDir)) {
		return [];
	}

	return walk(baseDir, []);
}

let selectedTargets = [];
if (arg === 'all') {
	selectedTargets = ['backend', 'frontend'];
} else if (arg in TARGETS) {
	selectedTargets = [arg];
} else {
	console.error(`[test] Unknown target: ${arg}. Use one of: all | backend | frontend`);
	process.exit(1);
}

const discovered = selectedTargets.flatMap((target) => collectTargetTests(target));

if (discovered.length === 0) {
	console.log(`[test] No test files found for target: ${selectedTargets.join(', ')}`);
	process.exit(0);
}

console.log(`[test] Running ${discovered.length} test file(s) for: ${selectedTargets.join(', ')}`);
const exitCode = runJest(discovered);
process.exit(exitCode);
