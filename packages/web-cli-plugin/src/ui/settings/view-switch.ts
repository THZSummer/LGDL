/**
 * Chat ⇄ settings view switch (TASK-033) — pure, DOM-free and node-testable.
 *
 * The side panel must never navigate away to `options.html`; it toggles the
 * visibility of two sibling views **in the same document**. The whole chat
 * subtree (`#panel-top` / `#panel-main` / `#panel-bottom`, including the
 * rendered messages, the scroll position and the composer draft) is left
 * untouched — only hidden — so switching back restores it exactly.
 *
 * This helper owns the "capture → toggle → restore" contract. The caller
 * supplies the real DOM side effects (`open`/`close`/scroll/draft accessors),
 * which keeps the preservation logic unit-testable without a browser.
 */
export interface ViewSwitchTargets {
  /** Reveal the settings view + hide the chat zones (same document). */
  open: () => void;
  /** Reveal the chat zones + hide the settings view. */
  close: () => void;
  getScrollTop: () => number;
  setScrollTop: (value: number) => void;
  getDraft: () => string;
  setDraft: (value: string) => void;
}

export interface ViewSwitch {
  readonly settingsOpen: boolean;
  showSettings: () => void;
  showChat: () => void;
}

export function createViewSwitch(targets: ViewSwitchTargets): ViewSwitch {
  let settingsOpen = false;
  // Captured on the chat → settings transition; restored on settings → chat.
  let savedScrollTop = 0;
  let savedDraft = '';

  return {
    get settingsOpen() {
      return settingsOpen;
    },
    showSettings() {
      if (settingsOpen) return;
      savedScrollTop = targets.getScrollTop();
      savedDraft = targets.getDraft();
      settingsOpen = true;
      targets.open();
    },
    showChat() {
      if (!settingsOpen) return;
      settingsOpen = false;
      targets.close();
      // Explicit restore: hiding the scroller can reset `scrollTop` in some
      // engines, and the draft must survive any future re-render.
      targets.setDraft(savedDraft);
      targets.setScrollTop(savedScrollTop);
    },
  };
}
