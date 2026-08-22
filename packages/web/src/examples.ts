/**
 * Embedded example .lgdl sources for the web workbench.
 * Generated from examples/ — keep in sync with that directory.
 */

export interface Example {
  id: string;
  label: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "architecture",
    label: "Web 应用系统架构",
    source: "title: Web 应用系统架构\ntype: arch\n\nnodes:\n  - id: user\n    label: 用户浏览器\n    kind: start\n  - id: cdn\n    label: CDN\n    kind: process\n  - id: nginx\n    label: Nginx 网关\n    kind: process\n  - id: app\n    label: 应用服务\n    kind: process\n  - id: redis\n    label: Redis 缓存\n    kind: entity\n  - id: mysql\n    label: MySQL 主库\n    kind: entity\n  - id: mq\n    label: 消息队列\n    kind: entity\n  - id: worker\n    label: 异步任务\n    kind: process\n  - id: oss\n    label: 对象存储\n    kind: entity\n\nedges:\n  - from: user\n    to: cdn\n    label: HTTPS\n  - from: cdn\n    to: nginx\n  - from: nginx\n    to: app\n  - from: app\n    to: redis\n    label: 读缓存\n  - from: app\n    to: mysql\n    label: 读写库\n  - from: app\n    to: mq\n    label: 发消息\n  - from: mq\n    to: worker\n  - from: worker\n    to: oss\n    label: 上传\n\ngroups:\n  - id: front\n    label: 接入层\n    contains: [cdn, nginx]\n  - id: core\n    label: 核心服务\n    contains: [app]\n  - id: data\n    label: 数据层\n    contains: [redis, mysql, mq, worker, oss]\n",
  },
  {
    id: "datastream",
    label: "订单处理数据流",
    source: "title: 订单处理数据流\ntype: datastream\n\nnodes:\n  - id: web\n    label: 下单请求\n    kind: start\n  - id: order-svc\n    label: 订单服务\n    kind: process\n  - id: inv-svc\n    label: 库存服务\n    kind: process\n  - id: pay-svc\n    label: 支付服务\n    kind: process\n  - id: order-db\n    label: 订单库\n    kind: entity\n  - id: inv-db\n    label: 库存库\n    kind: entity\n  - id: pay-db\n    label: 支付流水\n    kind: entity\n\nedges:\n  - from: web\n    to: order-svc\n    label: 创建订单\n  - from: order-svc\n    to: order-db\n    label: 写入订单\n  - from: order-svc\n    to: inv-svc\n    label: 扣库存\n  - from: inv-svc\n    to: inv-db\n    label: 更新库存\n  - from: order-svc\n    to: pay-svc\n    label: 发起支付\n  - from: pay-svc\n    to: pay-db\n    label: 记录流水\n\ngroups:\n  - id: app\n    label: 应用层\n    contains: [web, order-svc, inv-svc, pay-svc]\n  - id: data\n    label: 数据层\n    contains: [order-db, inv-db, pay-db]\n",
  },
  {
    id: "er",
    label: "电商 ER 图",
    source: "title: 电商 ER 图\ntype: er\n\nnodes:\n  - id: user\n    label: \"用户\\n- id\\n- name\\n- email\"\n    kind: entity\n  - id: order\n    label: \"订单\\n- id\\n- userId\\n- amount\"\n    kind: entity\n  - id: product\n    label: \"商品\\n- id\\n- name\\n- price\"\n    kind: entity\n  - id: order-item\n    label: \"订单项\\n- id\\n- orderId\\n- productId\"\n    kind: entity\n\nedges:\n  - from: user\n    to: order\n    label: \"拥有 1..*\"\n    attrs:\n      cardinality: \"1..*\"\n  - from: order\n    to: order-item\n    label: \"包含 1..*\"\n    attrs:\n      cardinality: \"1..*\"\n  - from: product\n    to: order-item\n    label: \"关联 1..*\"\n    attrs:\n      cardinality: \"1..*\"\n",
  },
  {
    id: "gantt",
    label: "产品发布甘特图",
    source: "title: 产品发布甘特图\ntype: gantt\n\nnodes:\n  - id: research\n    label: 需求调研\n    kind: process\n    attrs:\n      start: 0\n      duration: 3\n  - id: design\n    label: 原型设计\n    kind: process\n    attrs:\n      start: 3\n      duration: 3\n  - id: develop\n    label: 开发实现\n    kind: process\n    attrs:\n      start: 6\n      duration: 8\n  - id: test\n    label: 测试验收\n    kind: process\n    attrs:\n      start: 14\n      duration: 4\n  - id: launch\n    label: 上线发布\n    kind: milestone\n    attrs:\n      start: 18\n      duration: 1\n\nedges:\n  - from: research\n    to: design\n  - from: design\n    to: develop\n  - from: develop\n    to: test\n  - from: test\n    to: launch\n",
  },
  {
    id: "login-flow",
    label: "用户登录流程",
    source: "title: 用户登录流程\ntype: flowchart\n\nnodes:\n  - id: start\n    label: 用户访问\n    kind: start\n  - id: login\n    label: 输入账号密码\n    kind: process\n  - id: verify\n    label: 验证凭据\n    kind: decision\n  - id: ok\n    label: 登录成功\n    kind: end\n  - id: fail\n    label: 登录失败\n    kind: end\n\nedges:\n  - from: start\n    to: login\n    label: 打开页面\n  - from: login\n    to: verify\n    label: 提交\n  - from: verify\n    to: ok\n    label: 通过\n  - from: verify\n    to: fail\n    label: 失败\n\ngroups:\n  - id: auth\n    label: 认证模块\n    contains: [login]\n  - id: frontend\n    label: 前端层\n    contains: [start, auth]\n  - id: backend\n    label: 后端层\n    contains: [verify, ok, fail]\n",
  },
  {
    id: "mindmap",
    label: "AI 项目技术选型",
    source: "title: AI 项目技术选型\ntype: mindmap\n\nnodes:\n  - id: root\n    label: AI 项目\n    kind: start\n  - id: models\n    label: 模型选择\n    kind: process\n  - id: framework\n    label: 开发框架\n    kind: process\n  - id: deploy\n    label: 部署方案\n    kind: process\n  - id: llm\n    label: 大语言模型\n  - id: vision\n    label: 视觉模型\n  - id: rag\n    label: RAG\n    kind: decision\n  - id: agent\n    label: Agent\n    kind: decision\n  - id: cloud\n    label: 云部署\n  - id: edge\n    label: 边缘部署\n\nedges:\n  - from: root\n    to: models\n  - from: root\n    to: framework\n  - from: root\n    to: deploy\n  - from: models\n    to: llm\n  - from: models\n    to: vision\n  - from: framework\n    to: rag\n  - from: framework\n    to: agent\n  - from: deploy\n    to: cloud\n  - from: deploy\n    to: edge\n",
  },
  {
    id: "sequence",
    label: "用户登录时序",
    source: "title: 用户登录时序\ntype: sequence\n\nnodes:\n  - id: user\n    label: 用户\n    kind: start\n  - id: browser\n    label: 浏览器\n    kind: process\n  - id: server\n    label: 后端服务\n    kind: process\n  - id: db\n    label: 数据库\n    kind: entity\n\nedges:\n  - from: user\n    to: browser\n    label: 输入账号密码\n  - from: browser\n    to: server\n    label: POST /login\n  - from: server\n    to: db\n    label: 查询用户\n  - from: db\n    to: server\n    label: 返回结果\n  - from: server\n    to: browser\n    label: 返回 Token\n  - from: browser\n    to: user\n    label: 显示登录成功\n",
  },
  {
    id: "state",
    label: "订单状态机",
    source: "title: 订单状态机\ntype: state\n\nnodes:\n  - id: created\n    label: 已创建\n    kind: state\n  - id: pending\n    label: 待支付\n    kind: state\n  - id: paid\n    label: 已支付\n    kind: state\n  - id: shipped\n    label: 已发货\n    kind: state\n  - id: done\n    label: 已完成\n    kind: end\n  - id: cancelled\n    label: 已取消\n    kind: end\n  - id: refunded\n    label: 已退款\n    kind: end\n\nedges:\n  - from: created\n    to: pending\n    label: 提交订单\n  - from: pending\n    to: paid\n    label: 支付成功\n  - from: pending\n    to: cancelled\n    label: 超时取消\n  - from: paid\n    to: shipped\n    label: 发货\n  - from: shipped\n    to: done\n    label: 确认收货\n  - from: paid\n    to: refunded\n    label: 申请退款\n",
  },
  {
    id: "uml-class",
    label: "订单系统类图",
    source: "title: 订单系统类图\ntype: uml-class\n\nnodes:\n  - id: user\n    label: \"User\\n- id: int\\n- name: string\\n+ login()\\n+ logout()\"\n    kind: entity\n  - id: order\n    label: \"Order\\n- id: int\\n- userId: int\\n- amount: float\\n+ create()\\n+ pay()\\n+ cancel()\"\n    kind: entity\n  - id: payment\n    label: \"Payment\\n- orderId: int\\n- method: string\\n+ process()\"\n    kind: entity\n  - id: cart\n    label: \"Cart\\n- items: list\\n+ addItem()\\n+ removeItem()\\n+ checkout()\"\n    kind: entity\n\nedges:\n  - from: user\n    to: order\n    label: 拥有 1..*\n  - from: order\n    to: payment\n    label: 发起 1..1\n  - from: user\n    to: cart\n    label: 关联 1..1\n",
  },
];
