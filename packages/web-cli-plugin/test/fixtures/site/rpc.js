/*
 * Fixture site page-world RPC listener (non-LGDL).
 *
 * Implements the web-cli postMessage contract:
 *   web-cli:probe    → web-cli:descriptor
 *   web-cli:invoke   → web-cli:result
 *   web-cli:event    → web-cli:event-result   (D3: full hub op set)
 *
 * This is a minimal, dependency-free reference implementation of the site side
 * of the protocol (FR-016 / FR-043). It has zero LGDL private dependencies.
 *
 * The event hub is a tiny stateful model (synthetic observation source ticking
 * while the channel is on) so the plugin's `events` runtime — including the D3
 * pause/resume/clear/budget/switch ops — can be proven end to end on a real
 * built `dist/`. It mirrors the base hub semantics the plugin proxies to.
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

  // ── D3: minimal stateful event hub (synthetic observation source) ───────────
  var eventHub = (function () {
    var subs = {};
    var counter = 0;
    var seq = 0;
    var enabled = false;
    var disabledDropped = 0;
    var timer = null;

    function ensureTimer() {
      if (timer) return;
      // Synthetic observation source: ~1 event / 100ms while the channel is on.
      timer = setInterval(function () {
        if (!enabled) return;
        Object.keys(subs).forEach(function (id) {
          var s = subs[id];
          if (s.paused || s.autoPaused) return;
          seq += 1;
          s.buffer.push({ seq: seq, ts: Date.now(), kind: s.kind, type: 'synthetic', target: '#notes', meta: { source: 'fixture' } });
          s.delivered += 1;
          while (s.buffer.length > s.bufferLimit) {
            s.buffer.shift();
            s.dropped += 1;
          }
          if (s.delivered >= s.autoPauseAt) s.autoPaused = true;
        });
      }, 100);
    }

    function summary(s) {
      return {
        subId: s.subId,
        kind: s.kind,
        filterLabel: '',
        sensitive: s.sensitive,
        label: s.label,
        paused: s.paused,
        autoPaused: s.autoPaused,
        bufferSize: s.buffer.length,
        bufferLimit: s.bufferLimit,
        dropped: s.dropped,
        delivered: s.delivered,
        lastId: s.lastId,
      };
    }

    function notFound(subId) {
      return { ok: false, error: '✖ 订阅不存在或已失效（' + subId + '）' };
    }

    function handle(op, params) {
      ensureTimer();
      var subId = typeof params.subId === 'string' ? params.subId : '';
      var reply;
      if (op === 'subscribe') {
        counter += 1;
        var id = 'sub-' + counter;
        subs[id] = {
          subId: id,
          kind: (params.kind && String(params.kind)) || 'dom',
          label: params.label,
          sensitive: params.sensitive === true,
          paused: false,
          autoPaused: false,
          buffer: [],
          dropped: 0,
          delivered: 0,
          lastId: 0,
          bufferLimit: (params.budget && params.budget.bufferLimit) || 200,
          autoPauseAt: (params.budget && params.budget.autoPauseAt) || 2000,
        };
        reply = { ok: true, data: { ok: true, subId: id } };
      } else if (op === 'unsubscribe') {
        var had = Object.prototype.hasOwnProperty.call(subs, subId);
        delete subs[subId];
        reply = had ? { ok: true, data: { ok: true } } : notFound(subId);
      } else if (op === 'pause' || op === 'resume' || op === 'clear') {
        var s1 = subs[subId];
        if (!s1) return { ok: false, error: notFound(subId).error };
        if (op === 'pause') s1.paused = true;
        else if (op === 'resume') {
          s1.paused = false;
          s1.autoPaused = false;
          s1.delivered = 0;
        } else s1.buffer.length = 0;
        reply = { ok: true, data: { ok: true } };
      } else if (op === 'budget') {
        var s2 = subs[subId];
        if (!s2) return { ok: false, error: notFound(subId).error };
        if (typeof params.bufferLimit === 'number') s2.bufferLimit = params.bufferLimit;
        if (typeof params.autoPauseAt === 'number') s2.autoPauseAt = params.autoPauseAt;
        reply = { ok: true, data: { ok: true } };
      } else if (op === 'switch') {
        enabled = params.on === true;
        reply = { ok: true, data: { ok: true } };
      } else if (op === 'pull') {
        var s3 = subs[subId];
        if (!s3) return { ok: false, error: notFound(subId).error };
        var matched = s3.buffer.filter(function (e) { return e.seq > s3.lastId; });
        var events = typeof params.max === 'number' ? matched.slice(0, params.max) : matched;
        if (events.length > 0) s3.lastId = events[events.length - 1].seq;
        reply = { ok: true, data: { ok: true, events: events, lastId: s3.lastId, dropped: s3.dropped, delivered: s3.delivered, bufferSize: s3.buffer.length, autoPaused: s3.autoPaused } };
      } else if (op === 'pull-sensitive') {
        // Honest: this fixture observation source produces no sensitive plaintext.
        return { ok: false, error: '✖ 事件 ' + String(params.seq) + ' 无保留明细（fixture 观察源不产生敏感明文）' };
      } else if (op === 'status') {
        var total = 0;
        var list = Object.keys(subs).map(function (id) { total += subs[id].buffer.length; return summary(subs[id]); });
        reply = {
          ok: true,
          data: {
            enabled: enabled,
            subscriptionCount: list.length,
            totalBuffered: total,
            disabledDropped: disabledDropped,
            rateDropped: 0,
            budgets: {
              bufferLimit: 200, bufferLimitMax: 1000, cumulativeBudget: 2000, maxSubscriptions: 8,
              ratePerSec: 200, mergeWindowMs: 800, summaryN: 10, payloadBudgetChars: 4096, sensitiveDetailLimit: 32,
            },
            subscriptions: list,
          },
        };
      } else {
        reply = { ok: false, error: '不支持的事件通道操作 "' + op + '"（可用：subscribe/pull/unsubscribe/status/pause/resume/clear/budget/switch/pull-sensitive）' };
      }
      return reply;
    }

    return { handle: handle, enabled: function () { return enabled; } };
  })();

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (!data || data.channel !== CHANNEL) return;
    if (data.type === 'web-cli:event') {
      var op = typeof data.op === 'string' ? data.op : '';
      var params = data.params && typeof data.params === 'object' ? data.params : {};
      var result = eventHub.handle(op, params);
      window.postMessage(
        { type: 'web-cli:event-result', channel: CHANNEL, id: data.id, ok: result.ok, data: result.data, error: result.error },
        '*',
      );
      return;
    }
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
