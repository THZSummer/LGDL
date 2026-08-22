export function addNode(doc, opts) {
    const { id, label, kind, group, attrs } = opts;
    if (doc.nodes.some((n) => n.id === id)) {
        throw new Error(`Node id already exists: "${id}"`);
    }
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
        throw new Error(`Invalid node id: "${id}" (letters, digits, underscore, hyphen only)`);
    }
    const node = {
        id,
        label: label ?? id,
        kind: kind ?? 'process',
        ...(attrs !== undefined ? { attrs } : {}),
    };
    const document = {
        ...doc,
        nodes: [...doc.nodes, node],
    };
    let summary = `added node "${id}"${label ? ` (${label})` : ''}${kind ? ` :${kind}` : ''}`;
    if (group) {
        document.groups = doc.groups.map((g) => g.id === group ? { ...g, contains: [...g.contains, id] } : g);
        if (!document.groups.some((g) => g.id === group)) {
            throw new Error(`Group not found: "${group}"`);
        }
        summary += ` into group "${group}"`;
    }
    return { document, summary };
}
export function removeNode(doc, id) {
    if (!doc.nodes.some((n) => n.id === id)) {
        throw new Error(`Node not found: "${id}"`);
    }
    const document = {
        ...doc,
        // remove the node
        nodes: doc.nodes.filter((n) => n.id !== id),
        // auto-clean edges touching it
        edges: doc.edges.filter((e) => e.from !== id && e.to !== id),
        // remove it from groups
        groups: doc.groups.map((g) => ({ ...g, contains: g.contains.filter((c) => c !== id) })),
    };
    const removedEdges = doc.edges.filter((e) => e.from === id || e.to === id).length;
    return {
        document,
        summary: `removed node "${id}"${removedEdges > 0 ? ` and ${removedEdges} attached edge(s)` : ''}`,
    };
}
export function addEdge(doc, opts) {
    const { from, to, label, attrs } = opts;
    if (!doc.nodes.some((n) => n.id === from)) {
        throw new Error(`Source node not found: "${from}"`);
    }
    if (!doc.nodes.some((n) => n.id === to)) {
        throw new Error(`Target node not found: "${to}"`);
    }
    if (from === to) {
        throw new Error(`Self-loop edges are not supported (from === to === "${from}")`);
    }
    if (doc.edges.some((e) => e.from === from && e.to === to)) {
        throw new Error(`Edge already exists: ${from} -> ${to}`);
    }
    const edge = { from, to, label, ...(attrs !== undefined ? { attrs } : {}) };
    return {
        document: { ...doc, edges: [...doc.edges, edge] },
        summary: `added edge ${from} -> ${to}${label ? ` [${label}]` : ''}`,
    };
}
export function removeEdge(doc, from, to) {
    const before = doc.edges.length;
    const document = {
        ...doc,
        edges: doc.edges.filter((e) => !(e.from === from && e.to === to)),
    };
    if (document.edges.length === before) {
        throw new Error(`Edge not found: ${from} -> ${to}`);
    }
    return {
        document,
        summary: `removed edge ${from} -> ${to}`,
    };
}
export function updateNode(doc, opts) {
    const { id, label, kind, attrs } = opts;
    if (!doc.nodes.some((n) => n.id === id)) {
        throw new Error(`Node not found: "${id}"`);
    }
    const document = {
        ...doc,
        nodes: doc.nodes.map((n) => n.id === id
            ? {
                ...n,
                ...(label !== undefined ? { label } : {}),
                ...(kind !== undefined ? { kind } : {}),
                ...(attrs !== undefined ? { attrs: { ...n.attrs, ...attrs } } : {}),
            }
            : n),
    };
    const changes = [];
    if (label !== undefined)
        changes.push(`label="${label}"`);
    if (kind !== undefined)
        changes.push(`kind=${kind}`);
    if (attrs !== undefined)
        changes.push(`attrs={${Object.keys(attrs).join(',')}}`);
    return { document, summary: `updated node "${id}" (${changes.join(', ')})` };
}
export function updateEdge(doc, opts) {
    const { from, to, label, attrs } = opts;
    if (!doc.edges.some((e) => e.from === from && e.to === to)) {
        throw new Error(`Edge not found: ${from} -> ${to}`);
    }
    const document = {
        ...doc,
        edges: doc.edges.map((e) => e.from === from && e.to === to
            ? {
                ...e,
                ...(label !== undefined ? { label } : {}),
                ...(attrs !== undefined ? { attrs: { ...e.attrs, ...attrs } } : {}),
            }
            : e),
    };
    const changes = [];
    if (label !== undefined)
        changes.push(`label="${label}"`);
    if (attrs !== undefined)
        changes.push(`attrs={${Object.keys(attrs).join(',')}}`);
    return { document, summary: `updated edge ${from} -> ${to} (${changes.join(', ')})` };
}
export function addGroup(doc, opts) {
    const { id, label, contains } = opts;
    if (doc.groups.some((g) => g.id === id)) {
        throw new Error(`Group id already exists: "${id}"`);
    }
    if (contains) {
        for (const nodeId of contains) {
            if (!doc.nodes.some((n) => n.id === nodeId)) {
                throw new Error(`Group contains unknown node: "${nodeId}"`);
            }
        }
    }
    const group = { id, label, contains: contains ?? [] };
    return {
        document: { ...doc, groups: [...doc.groups, group] },
        summary: `added group "${id}"${label ? ` (${label})` : ''}${contains && contains.length > 0 ? ` with ${contains.length} member(s)` : ''}`,
    };
}
export function removeGroup(doc, id) {
    if (!doc.groups.some((g) => g.id === id)) {
        throw new Error(`Group not found: "${id}"`);
    }
    return {
        document: { ...doc, groups: doc.groups.filter((g) => g.id !== id) },
        summary: `removed group "${id}"`,
    };
}
