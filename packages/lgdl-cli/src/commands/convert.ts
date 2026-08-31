import { writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { Command, Option } from 'commander';
import type { LgdlCommand } from '../registry.js';
import { loadDocument } from '../shared.js';
import { convert, deriveGroups, listFormats } from '@lgdl/lgdl-core';

export const convertCommand: LgdlCommand = {
  name: 'convert',
  description: 'convert a diagram to another format (mermaid, ...)',
  examples: ['convert --file flow.lgdl --as mermaid', 'convert --file flow.lgdl --as json -o flow.json'],
  register(program: Command) {
    const formats = listFormats();
    program
      .command('convert')
      .description(`convert a diagram to another format (available: ${formats.join(', ')})`)
      .requiredOption('--file <file>', 'path to .lgdl file')
      .addOption(new Option('--as <format>', 'output format').choices(formats).makeOptionMandatory())
      .option('-o, --output <file>', 'output file (default: stdout)')
      .action((opts: { file: string; as: string; output?: string }) => {
        const doc = loadDocument(opts.file);
        const groups = deriveGroups(doc);
        const out = convert(doc, opts.as);
        // warn about lossy fallbacks instead of silently degrading semantics
        if (opts.as === 'mermaid' && ['arch', 'datastream'].includes(doc.type)) {
          console.error(`⚠ ${doc.type} -> mermaid falls back to flowchart — members/cardinality are not represented`);
        }
        if (opts.as === 'mermaid' && groups.some((g) => (g.contains ?? []).some((m) => groups.some((x) => x.id === m)))) {
          console.error(`⚠ nested groups are flattened in mermaid output — nesting is lost on round-trip`);
        }
        if (opts.as === 'mermaid' && !['er', 'uml-class', 'gantt'].includes(doc.type)) {
          const nAttrs = doc.nodes.some((n) => n.attrs && Object.keys(n.attrs).length > 0);
          const eAttrs = doc.edges.some((e) => e.attrs && Object.keys(e.attrs).length > 0);
          if (nAttrs || eAttrs) {
            console.error(`⚠ node/edge attrs are not representable in mermaid for ${doc.type} — lost on round-trip`);
          }
        }
        if (opts.as === 'mermaid' && doc.type === 'sequence') {
          for (const n of doc.nodes) {
            if (n.kind && n.kind !== 'process') {
              console.error(`⚠ sequence participant "${n.id}" kind "${n.kind}" is not representable in mermaid — lost on round-trip`);
            }
          }
        }
        if (opts.as === 'mermaid' && doc.type === 'gantt') {
          for (const e of doc.edges) {
            if (e.label) {
              console.error(`⚠ gantt edge ${e.from} -> ${e.to} has a label which mermaid gantt cannot express — it is lost on round-trip`);
            }
          }
          for (const n of doc.nodes) {
            if (n.kind === 'group') continue; // group boxes are sections, not tasks
            if (typeof n.attrs?.start !== 'number' || typeof n.attrs?.duration !== 'number') {
              console.error(`⚠ gantt node "${n.id}" lacks start/duration — a placeholder 0/1d is emitted, round-trip will fabricate these attrs`);
            }
          }
          const sectionOf = new Map<string, string>();
          for (const g of groups) {
            for (const m of g.contains ?? []) sectionOf.set(m, g.id);
          }
          const groupOrder = new Map<string, number>();
          groups.forEach((g, i) => groupOrder.set(g.id, i));
          // multiple-predecessor tasks: warn once per task
          const multiPred = new Set<string>();
          for (const e of doc.edges) {
            const preds = doc.edges.filter((x) => x.to === e.to);
            if (preds.length > 1) multiPred.add(e.to);
          }
          for (const t of multiPred) {
            console.error(`⚠ gantt task ${t} has multiple predecessors — mermaid can express only one, extra dependency edges are lost on round-trip`);
          }
          for (const e of doc.edges) {
            const a = doc.nodes.find((n) => n.id === e.from);
            const b = doc.nodes.find((n) => n.id === e.to);
            // an end lacking start/duration cannot use the after form —
            // the edge would silently vanish
            const aOk = a && typeof a.attrs?.start === 'number' && typeof a.attrs?.duration === 'number';
            const bOk = b && typeof b.attrs?.start === 'number';
            if (!aOk || !bOk) {
              console.error(`⚠ gantt dependency ${e.from} -> ${e.to} — one end lacks start/duration attrs, the edge is lost on round-trip`);
              continue;
            }
            const aEnd = aOk ? (a.attrs!.start as number) + (a.attrs!.duration as number) : undefined;
            const bStart = bOk ? b.attrs!.start as number : undefined;
            if (aEnd !== undefined && bStart !== undefined && bStart !== aEnd) {
              const gap = bStart - aEnd;
              if (gap < 0) {
                console.error(`⚠ gantt dependency ${e.from} -> ${e.to} overlaps its dependency by ${-gap} day(s) — mermaid cannot express it, the edge is lost on round-trip`);
              }
            }
            // cross-section dependencies: only lost when the dependency's
            // section is emitted AFTER the dependent's (ungrouped tasks come
            // first, so a dependency from an ungrouped task is always fine)
            if (sectionOf.get(e.from) !== sectionOf.get(e.to) && !multiPred.has(e.to)) {
              const depIdx = sectionOf.get(e.from) !== undefined ? groupOrder.get(sectionOf.get(e.from)!) : -1;
              const ownIdx = sectionOf.get(e.to) !== undefined ? groupOrder.get(sectionOf.get(e.to)!) : -1;
              const depFirst = (depIdx ?? 0) < (ownIdx ?? 0);
              if (!depFirst) {
                console.error(`⚠ gantt dependency ${e.from} -> ${e.to} crosses sections and the dependency is not emitted first — the edge is lost on round-trip`);
              }
            }
          }
        }
        if (opts.as === 'mermaid' && doc.type === 'mindmap') {
          const inDegree = new Map<string, number>();
          for (const n of doc.nodes) inDegree.set(n.id, 0);
          for (const e of doc.edges) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
          const shared = [...inDegree.entries()].filter(([, d]) => d > 1).map(([id]) => id);
          if (shared.length > 0) {
            console.error(`⚠ mindmap node(s) ${shared.join(', ')} have multiple parents — mermaid mindmap is a tree, some edges are lost on round-trip`);
          }
        }
        if (opts.as === 'mermaid' && doc.type !== 'er' && doc.type !== 'uml-class') {
          for (const e of doc.edges) {
            if (e.cardinalityFrom !== undefined || e.cardinalityTo !== undefined) {
              console.error(`⚠ edge ${e.from} -> ${e.to} has cardinality which is not representable in mermaid for ${doc.type} — lost on export`);
            }
          }
        }
        if (opts.as === 'mermaid' && doc.type === 'er') {
          for (const e of doc.edges) {
            for (const f of ['cardinalityFrom', 'cardinalityTo'] as const) {
              if (e[f] === '*') {
                console.error(`⚠ ER edge ${e.from} -> ${e.to} ${f}="*" is exported as "o{" and becomes "0..*" on round-trip (mermaid cannot distinguish * from 0..*)`);
                break;
              }
            }
          }
        }
        if (opts.as === 'mermaid' && doc.type === 'state') {
          const ends = doc.nodes.filter((n) => n.kind === 'end');
          if (ends.length > 1) {
            console.error(`⚠ state has ${ends.length} terminal states — mermaid's single [*] terminal cannot represent them, they collapse into one __end__ on round-trip`);
          }
        }
        if (opts.as === 'plantuml' && doc.type !== 'flowchart') {
          console.error(`✖ plantuml export is not supported for ${doc.type} — refusing to emit a misleading activity diagram (supported: flowchart)`);
          process.exit(1);
        }
        if (opts.as === 'plantuml' && doc.type === 'flowchart') {
          // an activity diagram can only express linear chains + decision
          // branches — anything else would emit a misleading graph
          const outCount = new Map<string, number>();
          for (const e of doc.edges) outCount.set(e.from, (outCount.get(e.from) ?? 0) + 1);
          const inCount = new Map<string, number>();
          for (const e of doc.edges) inCount.set(e.to, (inCount.get(e.to) ?? 0) + 1);
          const roots = doc.nodes.filter((n) => (inCount.get(n.id) ?? 0) === 0);
          const fanOut = doc.nodes.find(
            (n) => n.kind !== 'decision' && (outCount.get(n.id) ?? 0) > 1,
          );
          if (roots.length > 1 || fanOut) {
            console.error(`✖ plantuml export needs a single linear flow — ${roots.length > 1 ? `${roots.length} entry points` : `node "${fanOut!.id}" has multiple outgoing edges`}, refusing to emit a misleading activity diagram`);
            process.exit(1);
          }
        }
        if (opts.as === 'plantuml') {
          console.error(`⚠ plantuml export is activity-only — edges, labels, members and cardinality are not represented`);
        }
        if (opts.output) {
          const outDir = dirname(opts.output);
          if (outDir && !existsSync(outDir)) {
            console.error(`✖ output directory not found: ${outDir}`);
            process.exit(1);
          }
          if (existsSync(opts.output)) {
            console.error(`⚠ overwriting existing file: ${opts.output}`);
          }
        }
        if (opts.output) {
          writeFileSync(opts.output, out + '\n', 'utf8');
          console.log(`✓ converted ${opts.file} -> ${opts.output} (${opts.as})`);
        } else {
          console.log(out);
        }
      });
  },
};
