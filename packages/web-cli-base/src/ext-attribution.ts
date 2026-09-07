/**
 * ext-attribution.ts —— EXT「不支持 + 归属」统一转译面 + 契约预留（TASK-010，FR-025/026/027 + ADR-012）。
 *
 * 纯文档/契约面（零扩展工程零依赖）：`ATTRIBUTION_MAP` 覆盖 spec §2.5 🔴 列全部需扩展/系统级
 * 能力（多标签/窗口、下载管理、整页截图、HttpOnly/跨域 cookie 与域级管理、DevTools 全局面网络、
 * 跨导航持久订阅、closed shadow、跨域 iframe、浏览器原生对话框、真受信触控/输入、权限真模拟、
 * file 真路径注入、C-05 DataTransfer 注入面）→ 归属（F-14 v1.1 扩展宿主/CDP 生态位）+ 扩展
 * API/CDP 域 + **契约预留建议**（FR-026：目标工具/子命令建议名 + 入参 + 返回 + 门禁/敏感挂点 +
 * 与页内对应能力切面关系）——类型占位注释 + 常量映射形态，**不注册工具、不进 schema**。
 * `unsupportedAttribution(capability)` helper 产出统一文案（与 v3 chrome-tools 整页截图先例同构）。
 *
 * 纪律（FR-027/ADR-012）：不触碰 F-14 门禁；零扩展依赖（@types/chrome 等 devDep 不增）；
 * grep 零扩展工程痕迹（chrome.runtime/tabs/downloads/webRequest/manifest 零命中 —— 本文件只含
 * 字符串常量与注释，不含实现代码）；契约预留仅供 F-14 立项继承/修订（非承诺）。
 *
 * 本文件零 LGDL/react/DOM import（NFR-001/002），纯常量 + helper node 可测。
 */

/** 单能力归属条目（FR-025/026）。 */
export interface AttributionEntry {
  /** 能力面标识（稳定 key；入参/help 引用）。 */
  capability: string;
  /** 能力描述。 */
  desc: string;
  /** 页内不可达原因/边界。 */
  reason: string;
  /** 归属宿主（F-14 v1.1 扩展宿主 / CDP 生态位 / OS 生态位 / 测试基建）。 */
  home: string;
  /** 扩展 API / CDP 域。 */
  extensionSurface: string;
  /** 契约预留建议（FR-026：目标工具/子命令 + 入参语义 + 返回形态 + 门禁/敏感挂点 + 页内对应能力切面关系）。 */
  contract: string;
}

/**
 * ATTRIBUTION_MAP —— 全部需扩展/系统级能力 → 归属 + 扩展面 + 契约预留建议（spec §2.5 🔴 列全量）。
 * 以常量映射 + 类型占位注释形态落地；不注册工具、不进 schema（schema 体积零变化断言）。
 */
export const ATTRIBUTION_MAP: Readonly<Record<string, AttributionEntry>> = {
  'multi-tab-window': {
    capability: 'multi-tab-window',
    desc: '多标签/窗口（枚举/激活/新建/关闭）',
    reason: 'chrome.tabs/windows 浏览器扩展专属，网页内不可达（NG-003）',
    home: 'F-14 v1.1 扩展宿主',
    extensionSurface: 'chrome.tabs / chrome.windows',
    contract: '预留工具 "tabs"/"windows"：list/activate/new/close；入参 tabId/windowId；返回 tab/window 清单；门禁 write；页内对应：无（会话内单页）。',
  },
  downloads: {
    capability: 'downloads',
    desc: '下载管理（枚举/进度/取消/历史）',
    reason: 'v3 save/download 触发链保持；真下载管理需扩展（NG-003）',
    home: 'F-14 v1.1 扩展宿主',
    extensionSurface: 'chrome.downloads',
    contract: '预留工具 "downloads"：list/cancel/history；入参 downloadId/query；返回下载条目；门禁 read/write；页内对应：clipboard/export 落盘链（触发面）。',
  },
  'fullpage-screenshot': {
    capability: 'fullpage-screenshot',
    desc: '整页截图',
    reason: 'captureVisibleTab/CDP 整页级页内不可达（NG-005，v3 FR-028 out 延续）',
    home: 'F-14 扩展宿主 / OS 生态位',
    extensionSurface: 'chrome.tabs.captureVisibleTab / CDP Page.captureScreenshot',
    contract: '预留 chrome screenshot --mode fullpage 扩展接线；入参 format/quality；返回 dataURL；门禁 write + 落盘；页内对应：viewport/element 近似截图（v3 已实现）。',
  },
  'cookie-httpOnly-crossDomain': {
    capability: 'cookie-httpOnly-crossDomain',
    desc: 'HttpOnly/跨域 cookie 与域级批量管理',
    reason: 'document.cookie 只达同源非 HttpOnly（EC-007/009）；域级批量页内不可达',
    home: 'F-14 v1.1 扩展宿主',
    extensionSurface: 'chrome.cookies',
    contract: '预留 cookie 工具扩展子命令：domain-list/domain-clear；入参 domain/name；返回全量 cookie（含 HttpOnly）；门禁 write + 敏感明细 trusted+ask；页内对应：cookie read/write/delete（同源非 HttpOnly，已实现）。',
  },
  'network-global': {
    capability: 'network-global',
    desc: 'DevTools 全局面网络（非 JS 子资源/跨 realm/先网络栈/响应伪造）',
    reason: '页内只覆盖宿主自身 fetch/XHR（NG-010）；img/script/导航/跨 realm/先网络栈不可达',
    home: 'F-14 扩展宿主 / CDP 生态位',
    extensionSurface: 'chrome.webRequest（MV2）/ declarativeNetRequest（MV3）/ CDP Network',
    contract: '预留 "net" 工具全局面：observe-all/intercept；入参 urlPattern/realm；返回全局请求流；门禁 evaluate 档 + 审计；页内对应：network 观察（FR-012）/拦截（FR-018，P2）。',
  },
  'persistent-subscription': {
    capability: 'persistent-subscription',
    desc: '跨导航/会话级事件订阅持久续接',
    reason: '订阅随文档销毁（NG-009，ADR-002）；无自动续接',
    home: 'F-14 v1.1 扩展宿主（background/service worker）',
    extensionSurface: 'background 脚本 / chrome.webNavigation',
    contract: '预留 events subscribe --persistent true；入参 kind/filter；返回跨导航事件流；门禁 read/state；页内对应：events subscribe（文档级，导航后需重订阅）。',
  },
  'closed-shadow': {
    capability: 'closed-shadow',
    desc: 'closed shadow DOM 穿透',
    reason: 'shadowRoot 为 null（closed 模式）页内不可达（EC-009/NG-012）',
    home: 'F-14 扩展宿主 / CDP 生态位',
    extensionSurface: 'content script(all_frames) + CDP DOM',
    contract: '预留定位语法 closed-shadow 面：入参 selector；返回元素；门禁 read；页内对应：open shadow 穿透（FR-023 已实现）。',
  },
  'cross-origin-iframe': {
    capability: 'cross-origin-iframe',
    desc: '跨域 iframe 文档内定位',
    reason: 'contentDocument 跨域抛 SecurityError（SOP，EC-009）',
    home: 'F-14 扩展宿主',
    extensionSurface: 'content script(all_frames) / CDP DOM',
    contract: '预留定位语法 iframe=<origin> 面：入参 selector+frameOrigin；返回元素 + via:cross-origin-iframe；门禁 read；页内对应：同源 iframe 穿透（FR-023 已实现）。',
  },
  'native-dialog': {
    capability: 'native-dialog',
    desc: '浏览器原生对话框 hook（HTTP auth/权限 prompt/原生确认）',
    reason: '浏览器级对话框页内不可 hook（NG-011/EC-010）',
    home: 'CDP 生态位 / F-14 扩展宿主',
    extensionSurface: 'CDP Page.javascriptDialogOpening / webRequest onAuthRequired',
    contract: '预留 dialog 工具原生面：auto-respond；入参 type/credential；返回事件 + 应答；门禁 write + 敏感面；页内对应：dialog override（页面 JS 模态框，FR-016 已实现）。',
  },
  'trusted-input': {
    capability: 'trusted-input',
    desc: '真受信触控/输入（isTrusted=true）',
    reason: '合成事件 isTrusted=false（NG-007/FR-015）；真受信需 CDP Input 域',
    home: 'CDP 生态位',
    extensionSurface: 'CDP Input.dispatchMouseEvent / dispatchTouchEvent / dispatchKeyEvent',
    contract: '预留 dom 扩展 trusted 面：入参 selector/type/coords；返回 isTrusted=true 事件；门禁 evaluate 档；页内对应：dom click/type/tap 合成派发（isTrusted=false）。',
  },
  'permission-sim': {
    capability: 'permission-sim',
    desc: '权限真模拟（geolocation/camera/mic/通知）',
    reason: '页内假 API 注入 = 欺骗注入不允许（裁决 4 out）；真模拟需 CDP/测试基建',
    home: 'CDP 生态位 / 测试基建',
    extensionSurface: 'CDP Browser.setPermission / Emulation.setGeolocationOverride',
    contract: '预留 permission 工具 simulate 面：入参 name/state；返回模拟生效确认；门禁 evaluate 档；页内对应：权限真模拟不在页内实现（保持 out）。',
  },
  'file-real-path': {
    capability: 'file-real-path',
    desc: 'file input 真路径注入 / 上传（含 DataTransfer 内存注入面）',
    reason: 'NG-004 保持 out（作者 O-006 显式裁：DataTransfer 页内面亦不解冻）；真路径注入需 CDP',
    home: 'CDP 生态位',
    extensionSurface: 'CDP DOM.setFileInputFiles',
    contract: '预留 dom fill 扩展 file 面：入参 selector/paths；返回注入确认；门禁 evaluate 档；页内对应：v3 fill file input 显式不可用行为保持（NG-004）。',
  },
};

/** 归属统一文案（v3 chrome 整页截图先例同构：不支持 → 归属宿主 + 帮助面指引；不静默、不假装生效）。 */
export function unsupportedAttribution(capability: string): { output: string; error: string } {
  const e = ATTRIBUTION_MAP[capability];
  if (!e) {
    return {
      output: `✖ 不支持：能力 "${capability}" 不在归属表（F-14 契约预留未覆盖，勿静默降级）`,
      error: `unknown attribution capability ${capability}`,
    };
  }
  return {
    output:
      `✖ 不支持：${e.desc}（${e.reason}）—— 本能力归属 ${e.home}（${e.extensionSurface}），详见帮助面归属表（FR-025）。` +
      `契约预留（FR-026）：${e.contract}`,
    error: `${capability} unsupported (attributed: ${e.home})`,
  };
}

/** 帮助面归属表（各工具 help 接线引用；与 §2.5/NG 表一致）。 */
export function attributionHelpLines(): string[] {
  const caps = Object.values(ATTRIBUTION_MAP);
  const lines = ['归属表（FR-025/ADR-012：本工具可承载能力之外，以下需扩展/系统级能力统一「不支持 + 归属」转译）：'];
  for (const e of caps) {
    lines.push(`  ${e.capability}：${e.desc} → ${e.home}（${e.extensionSurface}）`);
  }
  lines.push('纪律：不实现浏览器扩展工程（无 manifest/桥/调试链路/新依赖，FR-027）；契约预留仅供 F-14 立项继承/修订（非承诺）');
  return lines;
}

/** EXT 纪律说明（帮助/文档复用）。 */
export const EXT_DISCIPLINE_NOTE =
  'v4 扩展线 = 纯文档面契约预留（FR-025~027/ADR-012）：不实现任何浏览器扩展工程、不引入扩展依赖（@types/chrome 等 devDep 不增）；不支持能力一律显式转译 + 归属，不静默降级、不假装生效。';
