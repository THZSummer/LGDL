import { registerConverter } from './converters.js';
function pumlLabel(s, fallback = '') {
    return (s ?? fallback).replace(/"/g, '\\"').replace(/\n/g, ' ');
}
/** Flowchart-like output (also used for state / generic graphs). */
function toPlantUml(doc) {
    const lines = ['@startuml', 'title ' + pumlLabel(doc.title, doc.type), ''];
    // rank via BFS for grouping into if/else where possible is complex;
    // keep it simple: nodes as activities, edges as arrows, decisions as if.
    const nodeById = new Map(doc.nodes.map((n) => [n.id, n]));
    // helper: render a node reference (start/end use start/stop markers)
    const ref = (id) => {
        const n = nodeById.get(id);
        const kind = n?.kind;
        if (kind === 'start')
            return `start`;
        if (kind === 'end')
            return `stop`;
        return pumlLabel(n?.label, id);
    };
    // collect outgoing edges
    const outEdges = new Map();
    for (const e of doc.edges) {
        if (!outEdges.has(e.from))
            outEdges.set(e.from, []);
        outEdges.get(e.from).push(e);
    }
    // emit a node and its successors (avoid infinite loops on cycles)
    const emitted = new Set();
    const emit = (id) => {
        if (emitted.has(id))
            return;
        emitted.add(id);
        const n = nodeById.get(id);
        const kind = n?.kind;
        const edges = outEdges.get(id) ?? [];
        if (kind === 'start') {
            lines.push('start');
            for (const e of edges)
                emitEdge(e);
            return;
        }
        if (kind === 'end') {
            lines.push('stop');
            return;
        }
        // decision node -> if/else
        if (kind === 'decision' && edges.length >= 2) {
            lines.push(`if (${pumlLabel(n?.label, id)}) then (${pumlLabel(edges[0].label, 'yes')})`);
            emit(edges[0].to);
            for (const e of edges.slice(1)) {
                lines.push(`else (${pumlLabel(e.label, 'no')})`);
                emit(e.to);
            }
            lines.push('endif');
            return;
        }
        // plain node
        lines.push(`:${pumlLabel(n?.label, id)};`);
        for (const e of edges)
            emitEdge(e);
    };
    const emitEdge = (e) => {
        // emit target; the arrow is implied by sequential statements for
        // simple chains. For clarity, emit the target node directly.
        emit(e.to);
    };
    // start from roots (nodes with no incoming edges)
    const hasIncoming = new Set(doc.edges.map((e) => e.to));
    const roots = doc.nodes.filter((n) => !hasIncoming.has(n.id));
    for (const r of roots)
        emit(r.id);
    // any leftover nodes (isolated) — emit them too
    for (const n of doc.nodes) {
        if (!emitted.has(n.id))
            emit(n.id);
    }
    lines.push('@enduml');
    return lines.join('\n');
}
// register side-effect
registerConverter('plantuml', toPlantUml);
