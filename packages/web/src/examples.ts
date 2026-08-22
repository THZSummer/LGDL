/**
 * LGDL example sources — THE single source of truth.
 * examples/*.lgdl, *.svg and *.png are generated artifacts:
 *   node scripts/gen-examples.mjs
 * Edit this file, then re-run the script to regenerate examples/.
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
    source: "title: Web 应用系统架构\ntype: arch\n\nnodes:\n  - id: user\n    label: 用户浏览器\n    kind: start\n  - id: cdn\n    label: CDN\n    kind: process\n  - id: nginx\n    label: Nginx 网关\n    kind: process\n  - id: app\n    label: 应用服务\n    kind: process\n  - id: redis\n    label: Redis 缓存\n    kind: entity\n  - id: mysql\n    label: MySQL 主库\n    kind: entity\n  - id: mq\n    label: 消息队列\n    kind: entity\n  - id: worker\n    label: 异步任务\n    kind: process\n  - id: oss\n    label: 对象存储\n    kind: entity\n  - id: note\n    label: 静态资源由 CDN 回源 OSS\n    kind: note            # 便签节点（note 类型）\n\nedges:\n  - from: user\n    to: cdn\n    label: HTTPS\n  - from: cdn\n    to: nginx\n  - from: nginx\n    to: app\n  - from: app\n    to: redis\n    label: 读缓存\n  - from: app\n    to: mysql\n    label: 读写库\n  - from: app\n    to: mq\n    label: 发消息\n  - from: mq\n    to: worker\n  - from: worker\n    to: oss\n    label: 上传\n  - from: front\n    to: core\n    label: 转发请求       # 聚合边：接入层 → 核心服务\n  - from: core\n    to: data\n    label: 数据存储       # 聚合边：核心服务 → 数据层\n  - from: user\n    to: core\n    label: 业务入口       # 混合聚合边：节点 → 组\n\ngroups:\n  - id: front\n    label: 接入层\n    contains: [cdn, nginx]\n  - id: core\n    label: 核心服务\n    contains: [app]\n  - id: data\n    label: 数据层\n    contains: [redis, mysql, mq, worker, oss]\n",
  },

  {
    id: "microservices",
    label: "电商微服务架构",
    source: "title: 电商微服务架构\ntype: arch\n\nnodes:\n  - id: client\n    label: 客户端 App\n    kind: start\n  - id: gateway\n    label: API 网关\n    kind: process\n  - id: auth\n    label: 认证服务\n    kind: process\n  - id: user\n    label: 用户服务\n    kind: process\n  - id: product\n    label: 商品服务\n    kind: process\n  - id: order\n    label: 订单服务\n    kind: process\n  - id: inventory\n    label: 库存服务\n    kind: process\n  - id: payment\n    label: 支付服务\n    kind: process\n  - id: notify\n    label: 通知服务\n    kind: process\n  - id: search\n    label: 搜索服务\n    kind: process\n  - id: redis\n    label: Redis 缓存\n    kind: entity\n  - id: mysql\n    label: MySQL 集群\n    kind: entity\n  - id: mq\n    label: 消息队列\n    kind: entity\n  - id: es\n    label: Elasticsearch\n    kind: entity\n  - id: oss\n    label: 对象存储\n    kind: entity\n  - id: monitor\n    label: 监控告警\n    kind: note\n\nedges:\n  - from: client\n    to: gateway\n    label: HTTPS\n  - from: gateway\n    to: auth\n    label: 鉴权\n  - from: gateway\n    to: user\n  - from: gateway\n    to: product\n  - from: gateway\n    to: order\n  - from: gateway\n    to: inventory\n  - from: gateway\n    to: payment\n  - from: gateway\n    to: search\n  - from: order\n    to: inventory\n    label: 锁库存\n  - from: order\n    to: payment\n    label: 发起支付\n  - from: payment\n    to: notify\n    label: 支付回调\n  - from: order\n    to: redis\n    label: 读写缓存\n  - from: order\n    to: mysql\n    label: 订单落库\n  - from: user\n    to: mysql\n  - from: inventory\n    to: mysql\n  - from: payment\n    to: mq\n    label: 发消息\n  - from: notify\n    to: mq\n  - from: product\n    to: es\n    label: 同步索引\n  - from: client\n    to: oss\n    label: 上传头像\n  - from: gateway-layer\n    to: service-layer\n    label: 路由转发\n  - from: service-layer\n    to: infra\n    label: 数据访问\n\ngroups:\n  - id: gateway-layer\n    label: 接入层\n    contains: [gateway]\n  - id: service-layer\n    label: 业务层\n    contains: [auth, user, product, order, inventory, payment, notify, search]\n  - id: infra\n    label: 基础设施\n    contains: [redis, mysql, mq, es, oss]\n  - id: observability\n    label: 可观测\n    contains: [monitor]\n",
  },
  {
    id: "datastream",
    label: "订单处理数据流",
    source: "title: 订单处理数据流\ntype: datastream\n\nnodes:\n  - id: web\n    label: 下单请求\n    kind: start\n  - id: order-svc\n    label: 订单服务\n    kind: process\n  - id: inv-svc\n    label: 库存服务\n    kind: process\n  - id: pay-svc\n    label: 支付服务\n    kind: process\n  - id: order-db\n    label: 订单库\n    kind: entity\n  - id: inv-db\n    label: 库存库\n    kind: entity\n  - id: pay-db\n    label: 支付流水\n    kind: entity\n\nedges:\n  - from: web\n    to: order-svc\n    label: 创建订单\n  - from: order-svc\n    to: order-db\n    label: 写入订单\n  - from: order-svc\n    to: inv-svc\n    label: 扣库存\n  - from: inv-svc\n    to: inv-db\n    label: 更新库存\n  - from: order-svc\n    to: pay-svc\n    label: 发起支付\n  - from: pay-svc\n    to: pay-db\n    label: 记录流水\n  - from: app\n    to: data\n    label: 整体落库     # 聚合边：应用层 → 数据层（泳道间流向）\n\ngroups:\n  - id: app\n    label: 应用层\n    contains: [web, order-svc, inv-svc, pay-svc]\n  - id: data\n    label: 数据层\n    contains: [order-db, inv-db, pay-db]\n",
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
    source: "title: 用户登录流程\ntype: flowchart\n\nnodes:\n  - id: start\n    label: 用户访问\n    kind: start\n  - id: login\n    label: 输入账号密码\n    kind: process\n  - id: verify\n    label: 验证凭据\n    kind: decision\n  - id: ok\n    label: 登录成功\n    kind: end\n  - id: fail\n    label: 登录失败\n    kind: end\n\nedges:\n  - from: start\n    to: login\n    label: 打开页面\n  - from: login\n    to: verify\n    label: 提交\n  - from: verify\n    to: ok\n    label: 通过\n  - from: verify\n    to: fail\n    label: 失败\n  - from: auth\n    to: backend\n    label: 整体调用\n\ngroups:\n  - id: auth\n    label: 认证模块\n    contains: [login]\n  - id: frontend\n    label: 前端层\n    contains: [start, auth]\n  - id: backend\n    label: 后端层\n    contains: [verify, ok, fail]\n",
  },

  {
    id: "ecommerce-flow",
    label: "电商下单全流程",
    source: "title: 电商下单全流程\ntype: flowchart\n\nnodes:\n  - id: browse\n    label: 浏览商品\n    kind: start\n  - id: cart\n    label: 加入购物车\n    kind: process\n  - id: submit\n    label: 提交订单\n    kind: process\n  - id: validate\n    label: 订单校验\n    kind: decision\n  - id: lock-stock\n    label: 锁定库存\n    kind: decision\n  - id: pay\n    label: 收银台支付\n    kind: decision\n  - id: risk\n    label: 风控审核\n    kind: decision\n  - id: pay-ok\n    label: 支付成功\n    kind: process\n  - id: deduct\n    label: 扣减库存\n    kind: process\n  - id: ship\n    label: 创建物流单\n    kind: process\n  - id: done\n    label: 订单完成\n    kind: end\n  - id: cancel\n    label: 订单取消\n    kind: end\n  - id: stock-fail\n    label: 库存不足\n    kind: end\n  - id: refund\n    label: 发起退款\n    kind: end\n\nedges:\n  - from: browse\n    to: cart\n    label: 选择商品\n  - from: cart\n    to: submit\n    label: 去结算\n  - from: submit\n    to: validate\n  - from: validate\n    to: lock-stock\n    label: 校验通过\n  - from: validate\n    to: cancel\n    label: 参数异常\n  - from: lock-stock\n    to: pay\n    label: 锁定成功\n  - from: lock-stock\n    to: stock-fail\n    label: 库存不足\n  - from: pay\n    to: risk\n    label: 发起支付\n  - from: pay\n    to: cancel\n    label: 用户放弃\n  - from: risk\n    to: pay-ok\n    label: 审核通过\n  - from: risk\n    to: cancel\n    label: 风险拦截\n  - from: pay-ok\n    to: deduct\n  - from: deduct\n    to: ship\n    label: 通知履约\n  - from: ship\n    to: done\n    label: 确认收货\n  - from: deduct\n    to: refund\n    label: 售后保障\n  - from: trade\n    to: fulfillment\n    label: 订单推送\n  - from: fulfillment\n    to: after-sale\n    label: 售后入口\n\ngroups:\n  - id: shopping\n    label: 购物域\n    contains: [browse, cart]\n  - id: trade\n    label: 交易域\n    contains: [submit, validate, lock-stock, pay, risk, pay-ok, deduct]\n  - id: fulfillment\n    label: 履约域\n    contains: [ship, done]\n  - id: after-sale\n    label: 售后域\n    contains: [refund]\n",
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
    source: "title: 订单状态机（完整版）\ntype: state\n\nnodes:\n  - id: created\n    label: 已创建\n    kind: state\n  - id: pending\n    label: 待支付\n    kind: state\n  - id: paying\n    label: 支付处理中\n    kind: state\n  - id: paid\n    label: 已支付\n    kind: state\n  - id: preparing\n    label: 备货中\n    kind: state\n  - id: shipped\n    label: 已发货\n    kind: state\n  - id: delivering\n    label: 配送中\n    kind: state\n  - id: received\n    label: 已签收\n    kind: state\n  - id: done\n    label: 已完成\n    kind: end\n  - id: closed\n    label: 超时关闭\n    kind: end\n  - id: cancelled\n    label: 已取消\n    kind: end\n  - id: refunding\n    label: 退款中\n    kind: state\n  - id: refunded\n    label: 已退款\n    kind: end\n\nedges:\n  - from: created\n    to: pending\n    label: 提交订单\n  - from: pending\n    to: paying\n    label: 发起支付\n  - from: paying\n    to: paid\n    label: 支付成功\n  - from: paying\n    to: pending\n    label: 支付失败\n  - from: pending\n    to: closed\n    label: 30 分钟未支付\n  - from: pending\n    to: cancelled\n    label: 用户取消\n  - from: paid\n    to: preparing\n    label: 支付回调\n  - from: preparing\n    to: shipped\n    label: 仓库出库\n  - from: preparing\n    to: cancelled\n    label: 缺货取消\n  - from: shipped\n    to: delivering\n    label: 物流揽收\n  - from: delivering\n    to: received\n    label: 用户签收\n  - from: received\n    to: done\n    label: 确认收货\n  - from: paid\n    to: refunding\n    label: 申请退款\n  - from: delivering\n    to: refunding\n    label: 拒收退款\n  - from: refunding\n    to: refunded\n    label: 退款成功\n\ngroups:\n  - id: payment-flow\n    label: 支付阶段\n    contains: [pending, paying, paid]\n  - id: fulfillment-flow\n    label: 履约阶段\n    contains: [preparing, shipped, delivering, received]\n  - id: after-sale\n    label: 售后阶段\n    contains: [refunding]\n",
  },
  {
    id: "uml-class",
    label: "订单系统类图",
    source: "title: 订单系统类图\ntype: uml-class\n\nnodes:\n  - id: user\n    label: \"User\\n- id: int\\n- name: string\\n+ login()\\n+ logout()\"\n    kind: entity\n  - id: order\n    label: \"Order\\n- id: int\\n- userId: int\\n- amount: float\\n+ create()\\n+ pay()\\n+ cancel()\"\n    kind: entity\n  - id: payment\n    label: \"Payment\\n- orderId: int\\n- method: string\\n+ process()\"\n    kind: entity\n  - id: cart\n    label: \"Cart\\n- items: list\\n+ addItem()\\n+ removeItem()\\n+ checkout()\"\n    kind: entity\n\nedges:\n  - from: user\n    to: order\n    label: 拥有 1..*\n  - from: order\n    to: payment\n    label: 发起 1..1\n  - from: user\n    to: cart\n    label: 关联 1..1\n\ngroups:\n  - id: domain\n    label: 领域层\n    contains: [user, order, cart]\n  - id: infra\n    label: 基础设施\n    contains: [payment]\n",
  },
];
