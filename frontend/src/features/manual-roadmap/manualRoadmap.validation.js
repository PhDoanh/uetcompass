import { load } from 'js-yaml';

export function parseManualRoadmapYaml(yamlCode) {
    if (typeof yamlCode !== 'string') {
        throw new Error('YAML input must be a string.');
    }

    if (yamlCode.trim().length === 0) {
        throw new Error('Enter roadmap YAML to preview.');
    }

    if (yamlCode.length > 10240) {
        throw new Error('YAML content exceeds the 10KB limit.');
    }

    let parsed;
    try {
        parsed = load(yamlCode);
    } catch (err) {
        throw new Error(`YAML syntax error: ${err.message}`);
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Parsed YAML must be an object with title and nodes.');
    }

    const title = String(parsed.title || '').trim();
    if (!title) {
        throw new Error('Roadmap title is required.');
    }

    const description = String(parsed.description || '').trim();
    const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    if (rawNodes.length === 0) {
        throw new Error('At least one node is required.');
    }

    const nodes = rawNodes.map((node) => {
        if (!node || typeof node !== 'object') {
            throw new Error('Each roadmap node must be an object.');
        }

        const nodeId = String(node.nodeId || node.id || '').trim();
        if (!nodeId) {
            throw new Error('Each node must have an id or nodeId.');
        }

        return {
            nodeId,
            label: String(node.label || '').trim(),
            description: String(node.description || '').trim(),
            parent: node.parent ? String(node.parent).trim() : undefined,
            prerequisites: Array.isArray(node.prerequisites) ? node.prerequisites.map((id) => String(id || '').trim()).filter(Boolean) : [],
            status: ['locked', 'pending', 'in_progress', 'done'].includes(node.status)
                ? node.status
                : 'pending',
            skills: Array.isArray(node.skills) ? node.skills.map((skill) => String(skill || '').trim()).filter(Boolean) : [],
            resources: Array.isArray(node.resources) ? node.resources : [],
            metadata: typeof node.metadata === 'object' && node.metadata !== null ? node.metadata : {},
        };
    });

    return {
        title,
        description,
        nodes,
    };
}
