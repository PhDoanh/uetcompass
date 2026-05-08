'use strict';

/**
 * End-to-end lifecycle: Feature 009 (Roadmap Generation) → Feature 004 (Skill Tree).
 *
 * 1. Calls Gemini once to generate a roadmap (Feature 009).
 * 2. Transforms nodes into skill-tree format with prerequisites.
 * 3. Feeds them into Feature 004's DAG traversal and unlock evaluation.
 * 4. Simulates status transitions (pending → in_progress → done) and verifies
 *    downstream nodes unlock correctly.
 *
 * Skips automatically if GEMINI_API_KEY is not set.
 * Does NOT touch the database — uses in-memory status maps.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const HAS_KEY = !!process.env.GEMINI_API_KEY;
const describeIf = HAS_KEY ? describe : describe.skip;

const { _callGemini: callGemini } = require('../../src/modules/roadmap/generation.service');

// ── Shared fixtures (same DAG as gemini-output.test.js) ──

const MOCK_PROFILE = {
	major: 'Computer Science',
	completedCourses: [{ courseCode: 'INT1008' }],
	careerGoal: {
		role: 'Backend Engineer',
		companyType: 'Tech Startup',
		graduationTimeline: '2027',
	},
	personalAspirations: 'Build scalable distributed systems',
};

const MOCK_COURSE_UNITS = [
	{ code: 'INT1008', name: 'Nhập môn lập trình',        credits: 3, major: 'Computer Science', prerequisites: [],           type: 'required' },
	{ code: 'INT2204', name: 'Lập trình hướng đối tượng', credits: 4, major: 'Computer Science', prerequisites: ['INT1008'], type: 'required' },
	{ code: 'INT2210', name: 'CTDL & Giải thuật',         credits: 4, major: 'Computer Science', prerequisites: ['INT2204'], type: 'required' },
	{ code: 'INT2211', name: 'Cơ sở dữ liệu',            credits: 4, major: 'Computer Science', prerequisites: [],           type: 'required' },
	{ code: 'INT3306', name: 'Phát triển ứng dụng web',   credits: 3, major: 'Computer Science', prerequisites: ['INT2211'], type: 'elective' },
];

const COMPLETED = new Set(MOCK_PROFILE.completedCourses.map((c) => c.courseCode));
const PREREQ_MAP = new Map(MOCK_COURSE_UNITS.map((cu) => [cu.code, cu.prerequisites ?? []]));

// ── Feature 004 pure helpers (no DB) ──

function isUnlocked(node, statusMap) {
	if (!node.prerequisites || node.prerequisites.length === 0) return true;
	return node.prerequisites.every((prereqId) => {
		const s = statusMap[prereqId];
		return s && s.status === 'done';
	});
}

function evaluateUnlocks(nodes, statusMap) {
	return nodes.map((n) => ({
		...n,
		isUnlocked: isUnlocked(n, statusMap),
		status: statusMap[n.nodeId]?.status || 'pending',
	}));
}

function groupByStatus(nodes) {
	const grouped = { done: [], inProgress: [], pending: [] };
	for (const n of nodes) {
		if (n.status === 'done') grouped.done.push(n);
		else if (n.status === 'in_progress') grouped.inProgress.push(n);
		else grouped.pending.push(n);
	}
	return grouped;
}

// ── Skill Tree UI renderer ──

const STATUS_ICON = { done: '✅', in_progress: '🔄', pending: '⬜' };
const LOCK_ICON   = { true: '🔓', false: '🔒' };

function renderSkillTreeUI(nodes, title = 'Skill Tree') {
	const W = 62; // card width
	const hr = '─'.repeat(W);

	const lines = [];
	lines.push('');
	lines.push(`╔${'═'.repeat(W)}╗`);
	lines.push(`║  🌳  ${title.padEnd(W - 6)}║`);
	lines.push(`╠${'═'.repeat(W)}╣`);

	// Legend
	lines.push(`║  ✅ Done  🔄 In Progress  ⬜ Pending  🔓 Open  🔒 Locked ${' '.repeat(W - 58)}║`);
	lines.push(`╠${'═'.repeat(W)}╣`);

	for (let i = 0; i < nodes.length; i++) {
		const n = nodes[i];
		const icon = STATUS_ICON[n.status] || '⬜';
		const lock = LOCK_ICON[String(!!n.isUnlocked)];
		const prereqStr = n.prerequisites.length > 0
			? n.prerequisites.join(', ')
			: 'none';

		lines.push(`║  ${icon} ${lock}  ${n.courseCode} — ${truncate(n.courseName, W - 18)}${' '.repeat(Math.max(0, W - 18 - Math.min(n.courseName.length, W - 18)))}║`);
		lines.push(`║       Credits: ${n.credits}  │  Prerequisites: ${truncate(prereqStr, W - 38)}${' '.repeat(Math.max(0, W - 38 - Math.min(prereqStr.length, W - 38)))}║`);

		// Skills (compact)
		const gained = (n.skills || []).slice(0, 5).join(', ');
		lines.push(`║       Gained:  ${truncate(gained, W - 18)}${' '.repeat(Math.max(0, W - 18 - Math.min(gained.length, W - 18)))}║`);
		// Connection arrow to next node
		if (i < nodes.length - 1) {
			lines.push(`║  ${' '.repeat(4)}│${' '.repeat(W - 7)}║`);
			lines.push(`║  ${' '.repeat(4)}▼${' '.repeat(W - 7)}║`);
		}
	}

	// Summary bar
	const done = nodes.filter((n) => n.status === 'done').length;
	const inProg = nodes.filter((n) => n.status === 'in_progress').length;
	const pending = nodes.filter((n) => n.status === 'pending').length;
	const pct = nodes.length > 0 ? Math.round((done / nodes.length) * 100) : 0;
	const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));

	lines.push(`╠${'═'.repeat(W)}╣`);
	lines.push(`║  Progress: [${bar}] ${String(pct).padStart(3)}%${' '.repeat(W - 33)}║`);
	lines.push(`║  ✅ ${done} Done  🔄 ${inProg} In Progress  ⬜ ${pending} Pending${' '.repeat(Math.max(0, W - 43))}║`);
	lines.push(`╚${'═'.repeat(W)}╝`);

	console.log(lines.join('\n'));
}

function truncate(str, max) {
	if (str.length <= max) return str;
	return str.slice(0, max - 1) + '…';
}

// ── Tests ──

describeIf('Roadmap → Skill Tree lifecycle (1 live Gemini call)', () => {
	let roadmapNodes; // Gemini output, enriched with prerequisites
	let statusMap;    // In-memory { nodeId → { status } }

	beforeAll(async () => {
		// ── Phase 1: Feature 009 — generate roadmap via Gemini ──
		const raw = await callGemini(MOCK_PROFILE, MOCK_COURSE_UNITS);

		// Enrich with prerequisites + nodeId (Feature 004 convention)
		roadmapNodes = raw.map((n) => ({
			...n,
			nodeId: n.courseCode,
			prerequisites: PREREQ_MAP.get(n.courseCode) ?? [],
		}));

		// Include completed courses as "done" in status map (Feature 004 seeds these)
		statusMap = {};
		for (const code of COMPLETED) {
			statusMap[code] = { status: 'done' };
		}
		// All roadmap nodes start as "pending"
		for (const n of roadmapNodes) {
			statusMap[n.nodeId] = { status: 'pending' };
		}

		console.log('\n── Lifecycle: Gemini returned %d nodes ──', roadmapNodes.length);
		console.log('  Codes: %s', roadmapNodes.map((n) => n.courseCode).join(' → '));
	}, 30_000);

	test('Phase 2: initial skill tree has correct unlock states', () => {
		const tree = evaluateUnlocks(roadmapNodes, statusMap);

		for (const node of tree) {
			const prereqs = node.prerequisites;
			const allPrereqsDone = prereqs.every((p) => statusMap[p]?.status === 'done');

			if (prereqs.length === 0 || allPrereqsDone) {
				expect(node.isUnlocked).toBe(true);
			} else {
				expect(node.isUnlocked).toBe(false);
			}

			// All roadmap nodes start as pending
			expect(node.status).toBe('pending');
		}

		// Group check: all nodes should be in pending
		const groups = groupByStatus(tree);
		expect(groups.pending.length).toBe(roadmapNodes.length);
		expect(groups.done.length).toBe(0);
		expect(groups.inProgress.length).toBe(0);

		renderSkillTreeUI(tree, 'Phase 2: Initial Skill Tree');
	});

	test('Phase 3: completing a course unlocks its dependents', () => {
		// Find a node that is currently unlocked and has dependents
		const tree = evaluateUnlocks(roadmapNodes, statusMap);
		const unlockedNode = tree.find((n) => n.isUnlocked);
		expect(unlockedNode).toBeDefined();

		const code = unlockedNode.courseCode;

		// Transition: pending → in_progress → done
		statusMap[code] = { status: 'in_progress' };
		let snapshot = evaluateUnlocks(roadmapNodes, statusMap);
		let current = snapshot.find((n) => n.courseCode === code);
		expect(current.status).toBe('in_progress');

		statusMap[code] = { status: 'done' };
		snapshot = evaluateUnlocks(roadmapNodes, statusMap);
		current = snapshot.find((n) => n.courseCode === code);
		expect(current.status).toBe('done');

		// Nodes that directly depend on this course should now be unlocked
		// (if all their other prerequisites are also done)
		const dependents = roadmapNodes.filter(
			(n) => n.prerequisites.includes(code)
		);

		for (const dep of dependents) {
			const depSnapshot = snapshot.find((n) => n.courseCode === dep.courseCode);
			const allPrereqsDone = dep.prerequisites.every(
				(p) => statusMap[p]?.status === 'done'
			);
			expect(depSnapshot.isUnlocked).toBe(allPrereqsDone);
		}

		renderSkillTreeUI(snapshot, `Phase 3: After completing ${code}`);
	});

	test('Phase 4: completing all courses in order yields fully done tree', () => {
		// Reset status map
		for (const code of COMPLETED) {
			statusMap[code] = { status: 'done' };
		}
		for (const n of roadmapNodes) {
			statusMap[n.nodeId] = { status: 'pending' };
		}



		// Roadmap is already in topological order from Gemini
		for (const node of roadmapNodes) {
			// Before completing: node must be unlocked (all prereqs done)
			const before = evaluateUnlocks(roadmapNodes, statusMap);
			const current = before.find((n) => n.courseCode === node.courseCode);
			expect(current.isUnlocked).toBe(true);

			// Transition to done
			statusMap[node.nodeId] = { status: 'done' };
		}

		// All nodes should be done and unlocked
		const finalTree = evaluateUnlocks(roadmapNodes, statusMap);
		const groups = groupByStatus(finalTree);

		expect(groups.done.length).toBe(roadmapNodes.length);
		expect(groups.pending.length).toBe(0);
		expect(groups.inProgress.length).toBe(0);

		for (const n of finalTree) {
			expect(n.isUnlocked).toBe(true);
			expect(n.status).toBe('done');
		}

		renderSkillTreeUI(finalTree, 'Phase 4: All Courses Completed');
	});

	test('Phase 5: locked nodes cannot be transitioned', () => {
		// Reset to initial state
		for (const code of COMPLETED) {
			statusMap[code] = { status: 'done' };
		}
		for (const n of roadmapNodes) {
			statusMap[n.nodeId] = { status: 'pending' };
		}

		// Find a locked node (has unmet prerequisites)
		const tree = evaluateUnlocks(roadmapNodes, statusMap);
		const lockedNode = tree.find((n) => !n.isUnlocked);

		if (!lockedNode) {
			console.log('\n── Phase 5: Skipped — all nodes are unlocked (no unmet prereqs) ──');
			return;
		}



		// isUnlocked should be false
		expect(lockedNode.isUnlocked).toBe(false);

		// Feature 004's guard: locked nodes cannot transition
		expect(isUnlocked(lockedNode, statusMap)).toBe(false);

		// Verify the prerequisite that's blocking it
		const unmetPrereqs = lockedNode.prerequisites.filter(
			(p) => statusMap[p]?.status !== 'done'
		);
		expect(unmetPrereqs.length).toBeGreaterThan(0);

		const tree5 = evaluateUnlocks(roadmapNodes, statusMap);
		renderSkillTreeUI(tree5, `Phase 5: ${lockedNode.courseCode} is LOCKED by ${unmetPrereqs.join(', ')}`);
	});

	test('Phase 6: each node carries skills from Gemini output', () => {


		for (const node of roadmapNodes) {
			// Skills arrays exist and are non-empty
			expect(Array.isArray(node.skills)).toBe(true);
			expect(node.skills.length).toBeGreaterThan(0);
			// Career context fields present
			expect(typeof node.reason).toBe('string');
			expect(node.reason.length).toBeGreaterThan(0);


		}
	});
}, 35_000);
