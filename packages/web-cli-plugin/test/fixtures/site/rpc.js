/*
 * Fixture site page-world RPC listener (non-LGDL).
 *
 * Implements the web-cli postMessage contract:
 *   web-cli:probe    → web-cli:descriptor
 *   web-cli:invoke   → web-cli:result
 *
 * This is a minimal, dependency-free reference implementation of the site side
 * of the protocol (FR-016 / FR-043). It has zero LGDL private dependencies.
 */
(function () {
  'use strict';
  var CHANNEL = 'web-cli';
  var notes = ['welcome'];

  function descriptor() {
    return {
      protocolVersion: '1.0',
      siteName: 'Fixture Notes (non-LGDL)',
      tools: [
        {
          id: 'notes-list',
          summary: 'List all notes in the fixture site (read-only).',
          params: { limit: { type: 'number', desc: 'Max notes to return', required: false } },
          riskHint: 'read',
        },
        {
          id: 'notes-add',
          summary: 'Add a note to the fixture site (write).',
          params: { text: { type: 'string', desc: 'Note body', required: true } },
          riskHint: 'write',
        },
      ],
      transport: { kind: 'page-message', channel: CHANNEL },
    };
  }

  function execute(tool, subcommand, args) {
    if (tool === 'notes-list') {
      var limit = args && args.limit ? parseInt(args.limit, 10) : notes.length;
      return { ok: true, output: notes.slice(0, limit).join('\n') };
    }
    if (tool === 'notes-add') {
      var text = (args && args.text) || '';
      if (!text) return { ok: false, output: '✖ notes-add requires --text', error: 'missing text' };
      notes.push(text);
      return { ok: true, output: '✓ note added', changed: true };
    }
    return { ok: false, output: '✖ unknown tool ' + tool, error: 'unknown tool' };
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (!data || data.channel !== CHANNEL) return;
    if (data.type === 'web-cli:probe') {
      window.postMessage({ type: 'web-cli:descriptor', channel: CHANNEL, id: data.id, descriptor: descriptor() }, '*');
      return;
    }
    if (data.type === 'web-cli:invoke') {
      var result = execute(data.tool, data.subcommand, data.args || {});
      window.postMessage(
        {
          type: 'web-cli:result',
          channel: CHANNEL,
          id: data.id,
          ok: result.ok,
          output: result.output,
          changed: result.changed,
          error: result.error,
          trust: 'external',
        },
        '*',
      );
    }
  });
})();
