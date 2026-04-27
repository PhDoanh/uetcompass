import { load } from 'js-yaml';

function localizeYamlParserMessage(rawMessage) {
    const message = String(rawMessage || '').toLowerCase();

    if (message.includes('incomplete explicit mapping pair')) {
        return 'Loi cu phap YAML: thieu cap khoa-gia tri sau dau ":".';
    }

    if (message.includes('a key node is missed')) {
        return 'Loi cu phap YAML: thieu khoa (key) trong mapping.';
    }

    if (message.includes('colon is missed')) {
        return 'Loi cu phap YAML: thieu dau ":" sau khoa.';
    }

    if (message.includes('bad indentation')) {
        return 'Loi cu phap YAML: sai thut le (indentation).';
    }

    if (message.includes('can not read') || message.includes('cannot read')) {
        return 'Loi cu phap YAML: khong the doc noi dung, vui long kiem tra cau truc.';
    }

    return 'Loi cu phap YAML, vui long kiem tra lai dinh dang.';
}

/**
 * Parse YAML string → JavaScript Object
 * Hỗ trợ cấu trúc đồ thị: nodes + edges
 * @param {string} yamlCode - YAML input
 * @returns {Object} { title, description, nodes, edges }
 */
export function parseManualRoadmapYaml(yamlCode) {
    if (typeof yamlCode !== 'string') {
        throw new Error('Đầu vào YAML phai la chuoi ky tu.');
    }

    if (yamlCode.trim().length === 0) {
        throw new Error('Vui long nhap YAML roadmap de xem truoc.');
    }

    if (yamlCode.length > 10240) {
        throw new Error('Noi dung YAML vuot qua gioi han 10KB.');
    }

    let parsed;
    try {
        parsed = load(yamlCode);
    } catch (err) {
        const line = Number.isInteger(err?.mark?.line) ? err.mark.line + 1 : null;
        const column = Number.isInteger(err?.mark?.column) ? err.mark.column + 1 : null;
        const position = line ? ` (dong ${line}${column ? `, cot ${column}` : ''})` : '';
        throw new Error(`${localizeYamlParserMessage(err?.message)}${position}`);
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('YAML sau khi parse phai la object co title va nodes.');
    }

    const title = String(parsed.title || '').trim();
    if (!title) {
        throw new Error('Roadmap bat buoc phai co tieu de.');
    }

    const description = String(parsed.description || '').trim();
    const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    if (rawNodes.length === 0) {
        throw new Error('Roadmap bat buoc phai co it nhat mot node.');
    }

    // Parse nodes
    const nodes = rawNodes.map((node, idx) => {
        if (!node || typeof node !== 'object') {
            throw new Error(`Moi node roadmap phai la object (loi tai node ${idx}).`);
        }

        const nodeId = String(node.nodeId || node.id || '').trim();
        if (!nodeId) {
            throw new Error(`Node tai vi tri ${idx} phai co truong "nodeId" hoac "id".`);
        }

        const label = String(node.label || '').trim();
        if (!label) {
            throw new Error(`Node "${nodeId}" bat buoc phai co truong "label".`);
        }

        const legacySkills = Array.isArray(node.skills)
            ? node.skills.map(skill => String(skill || '').trim()).filter(Boolean)
            : [];

        const skillName = String(node.skillName || legacySkills[0] || '').trim();

        // Parse type (main_topic, sub_topic, group_container)
        const type = ['main_topic', 'sub_topic', 'group_container', 'choice_item'].includes(node.type)
            ? node.type
            : 'main_topic';

        // Parent relationship (explicit, not inferred from prerequisites)
        const parentNodeId = String(node.parentNodeId || node.parent || '').trim() || null;

        // Prerequisites (for semantic meaning, but not used for layout)
        const prerequisites = Array.isArray(node.prerequisites)
            ? node.prerequisites.map(id => String(id || '').trim()).filter(Boolean)
            : [];

        // ELK.js layout options
        const elkOptions = typeof node.elkOptions === 'object' && node.elkOptions !== null
            ? node.elkOptions
            : {};

        return {
            nodeId,
            type,
            label,
            description: String(node.description || node.reason || '').trim(),
            parentNodeId,
            prerequisites,
            skillName,
            skills: skillName ? [skillName] : [],
            elkOptions,
            resources: Array.isArray(node.resources) ? node.resources : [],
            metadata: typeof node.metadata === 'object' && node.metadata !== null ? node.metadata : {},
        };
    });

    // Parse edges (if explicitly provided in YAML) or return empty array
    // Backend will generate edges from parentNodeId relationships
    let edges = [];
    if (Array.isArray(parsed.edges)) {
        edges = parsed.edges.map((edge, idx) => {
            if (!edge.id || !edge.source || !edge.target) {
                throw new Error(`Edge tai vi tri ${idx} phai co day du "id", "source", va "target".`);
            }
            return {
                edgeId: String(edge.id).trim(),
                source: String(edge.source).trim(),
                target: String(edge.target).trim(),
                type: edge.type || 'default',
            };
        });
    }

    return {
        title,
        description,
        nodes,
        edges,
    };
}
