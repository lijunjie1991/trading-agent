# TradingAgent 付费功能设计方案

## 1. 背景与目标
- 在现有“任务分析”平台基础上，引入 Stripe 收费机制。
- 每位新注册用户默认享有可配置的免费任务额度（当前目标：5 次）。
- 免费额度耗尽后，用户在提交新任务时需基于 Research Depth 与 Select Analysts 计算费用并完成支付。
- 支付完成前任务保持 `pending`，不得进入 Python 引擎；支付成功后自动触发既有分析流程。
- 设计需兼顾稳定性、易扩展与未来可能的定价优化。

## 2. 关键前提与需确认信息
### 2.1 Stripe 相关
- Stripe Secret Key（后端使用，生产/测试环境区分）。
- Stripe Publishable Key（前端 Checkout/Elements 使用）。
- Stripe Webhook Signing Secret（用于校验 webhook）。
- Checkout 成功/失败跳转 URL（前端路由地址，例如 `/billing/success`、`/billing/cancel`）。
- 支付结算币种（默认 USD，可扩展）。
- 是否需要开具发票/收据（决定是否启用 Stripe Billing/Invoice 模块）。

### 2.2 系统配置
- 默认免费任务额度（存储在 `pricing_strategy` 中，可随策略一起调整）。
- 定价策略初始值（基础价、Research Depth 倍率、Select Analysts 倍率）。
- 任务价格取整及货币精度策略（建议保留两位小数，使用 `BigDecimal` 与 `stripe-java` 的最小货币单位）。
- 生产环境 webhook 地址（需可公网访问并具备 TLS）。

## 3. 现有系统概览（简）
- `trading-agent-ui`：React + Vite，负责任务提交流程与状态展示。
- `trading-agent-api`：Spring Boot，管理用户、任务、与 Python Engine 的交互。
- `trading-agent-engine`：FastAPI，执行实际分析逻辑。
- MySQL：持久化任务、用户、报告等信息，Liquibase 管理 schema。

## 4. 数据模型调整
### 4.1 新增表
1. `pricing_strategy`
   - `id` (PK, bigint)
   - `code` (varchar, 唯一，默认 `DEFAULT`)
   - `currency` (varchar，默认 `USD`)
   - `base_price` (decimal(10,2))
   - `research_depth_multiplier` (decimal(8,4)) —— 计算公式中的深度倍率系数
   - `analyst_multiplier` (decimal(8,4)) —— 每多选一位分析师的倍率系数
   - `free_tasks_per_user` (int) —— 当前策略下每位新用户的免费额度
   - `is_active` (tinyint/bool)
   - `created_at`, `updated_at`
   - 说明：保留单表即可，通过 `code` + `is_active` 控制策略生效，查询时取最新生效记录。

2. `task_payments`
   - `id` (PK, bigint)
   - `task_id` (FK → `tasks.id`, 唯一)
   - `user_id` (FK → `users.id`)
   - `stripe_session_id` (varchar)
   - `stripe_payment_intent_id` (varchar, 可空)
   - `amount` (decimal(10,2))
   - `currency` (varchar)
   - `status` (varchar，枚举：`AWAITING_PAYMENT`, `PAID`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, `REFUNDED`)
   - `pricing_snapshot` (json/text，记录计算明细)
   - `is_free` (tinyint) —— 标记是否走免费额度
   - `created_at`, `updated_at`, `paid_at`
   - 说明：与任务 1:1 映射，便于追踪支付生命周期。

### 4.2 修改既有表
1. `users`
   - 新增 `free_quota_total` (int, 默认取配置值)
   - 新增 `free_quota_used` (int, 默认 0)
   - 新增 `paid_task_count` (int, 默认 0) —— 便于快速统计付费任务数量
   - 可选 `free_quota_last_reset` (timestamp，可为空，后续若支持周期重置使用)
   - 在注册流程内初始化上述字段。
   - 若需对单个用户调整额度，可直接修改 `free_quota_total`，保持操作简单。

2. `tasks`
   - 新增 `payment_status` (varchar，枚举：`FREE`, `AWAITING_PAYMENT`, `PAID`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`)
   - 新增 `billing_amount` (decimal(10,2), 默认 0)
   - 新增 `billing_currency` (varchar, 默认 `USD`)
   - 新增 `is_free_task` (tinyint)
   - 新增 `pricing_snapshot` (json/text，保存提交时的 Research Depth、Analyst 数量、倍率)
   - 新增 `payment_id` (FK → `task_payments.id`, 可空)
   - 新增 `stripe_session_id` (varchar，用于前端轮询或 webhook 幂等)
   - 根据状态添加索引（如 `idx_tasks_user_payment_status`）。

### 4.3 Liquibase 迁移
- 新增 `db/changelog/changes/v1.2.0-billing-schema.xml`（示例命名），包含：
  - 创建 `pricing_strategy`、`task_payments`。
  - 修改 `users`、`tasks` 表。
  - 添加必需索引与约束。
- 在 `db/changelog/db.changelog-master.yaml` 追加该文件引用。
- 初始化数据：
  - 插入默认 `pricing_strategy` 一条记录，并设置 `free_tasks_per_user=5`、`is_active=1`。
  - 必要时为历史用户补齐 `free_quota_total/free_quota_used/paid_task_count` 默认值（使用 `UPDATE`）。

## 5. 后端（Java API）改造
### 5.1 依赖与配置
- 在 `pom.xml` 引入 `com.stripe:stripe-java`（建议固定版本）。
- `application.yml` 新增：
  ```yaml
  stripe:
    secret-key: ${STRIPE_SECRET_KEY:}
    webhook-secret: ${STRIPE_WEBHOOK_SECRET:}
    success-url: ${STRIPE_SUCCESS_URL:https://ui.example.com/billing/success}
    cancel-url: ${STRIPE_CANCEL_URL:https://ui.example.com/billing/cancel}
  billing:
    default-pricing-code: DEFAULT
  ```
- Docker/部署层在 `docker-compose.yml` 注入上述环境变量。
- 确认敏感配置接入现有配置管理（如 `SPRING_PROFILES_ACTIVE` 下的密钥注入）。

### 5.2 新增组件
1. `StripeClient`（封装 Stripe SDK 调用）
   - 创建 Checkout Session、查询 Session、处理金额单位转换。
   - 与 Stripe API 交互时关注请求超时与错误处理。

2. `PricingService`
   - 读取最新 `pricing_strategy`（按 `code` + `is_active` 过滤）、缓存策略。
   - 负责价格计算：`total = base_price * (1 + research_depth_multiplier * (depth - 1)) * (1 + analyst_multiplier * (analyst_count - 1))`。
   - 输出 `PricingQuote`（含金额、货币、使用的倍率 snapshot 与 `freeTasksPerUser` 数据）。

3. `TaskPaymentService`
   - 维护 `task_payments` 表。
   - 根据任务状态创建/更新支付记录。
   - 生成 Checkout Session 并返回前端所需信息。
   - Stripe webhook 处理逻辑：验证签名、更新支付状态、触发任务调度，并在支付完成后同步 `users.paid_task_count`。
   - 处理异常事件：`checkout.session.expired` → 标记 `PAYMENT_EXPIRED`；`payment_intent.payment_failed` → 标记 `PAYMENT_FAILED` 并允许前端重试。

4. `TaskBillingService`（可为 `TaskService` 内嵌模块，视代码组织决定）
   - 负责判断免费额度使用情况。
   - 在免费任务路径中递增 `free_quota_used` 并直接触发 Python。
   - 在收费路径中创建 `AWAITING_PAYMENT` 任务与 `task_payments` 记录。

### 5.3 现有服务调整
- `AuthService.register`：新建用户时通过 `PricingService` 获取 `freeTasksPerUser`，初始化 `free_quota_total` 与 `free_quota_used=0`。
- `TaskService.submitTask` 流程修改：
  1. 校验并生成 `taskId`。
  2. 调用 `TaskBillingService` 判断免费额度。
  3. 免费额度足够：
     - `TaskBillingService` 先递增 `free_quota_used` 并记录到用户实体。
     - 任务 `payment_status=FREE`、`is_free_task=true`、`billing_amount=0`。
     - 保存任务后调用 `pythonServiceClient.submitAnalysisTask`（保留现有逻辑）。
     - 捕获异常与当前一致。
  4. 免费额度不足：
     - 根据 Research Depth/Analyst 组合调用 `PricingService`。
     - 创建 `Task`，状态设为 `AWAITING_PAYMENT`，记录 `billing_amount`、`billing_currency`（取自当前策略）、`pricing_snapshot`。
     - 创建 `TaskPayment` 记录（状态 `AWAITING_PAYMENT`，绑定任务，写入金额、货币、pricing snapshot）。
     - 调用 `StripeClient.createCheckoutSession`，传入：
       - `client_reference_id = taskId`
       - `metadata` 保存 `userId`、`taskId`
       - `amount` 使用最小货币单位
     - 返回响应需包含：
       - 任务基础信息
       - `paymentRequired=true`
       - `checkoutSessionId`、`checkoutSessionUrl`
       - 金额与货币
  5. 更新 `TaskResponse` DTO，增加 `paymentStatus`, `billingAmount`, `billingCurrency`, `isFreeTask`, `checkoutUrl`（或前端另调 API 获取）。
- 建议新增 `TaskQuoteController`（或扩展现有）提供预估接口：`POST /api/v1/tasks/quote`，仅返回价格与免费额度剩余，便于前端实时展示。

### 5.4 新增/调整接口
> 说明：REST 接口沿用 `/payments` 前缀，与 Stripe 语义一致，底层持久化表名为 `task_payments`。

1. `POST /api/v1/tasks`
   - 响应结构调整（如上）。
   - 需要兼容旧前端，提前通知前端调整解析逻辑。
2. `GET /api/v1/billing/summary`
   - 返回用户剩余免费额度、当前策略摘要、货币等。
   - 供前端展示余额。
3. `POST /api/v1/payments/checkout`
   - 可选：用于在任务创建前获取 Checkout URL（如果不与任务绑定，可考虑先创建任务再传回 URL）。
4. `POST /api/v1/payments/webhook`
   - 接收 Stripe 发送的事件。
   - 仅允许来自 Stripe 的请求（校验签名）。
   - 处理事件：
    - `checkout.session.completed`：更新 `task_payments.status=PAID`，`tasks.payment_status=PAID`，保持任务业务状态为 `PENDING`（等待 Python 接管），随后调用 `pythonServiceClient.submitAnalysisTask`，并累计 `users.paid_task_count`。
    - `payment_intent.payment_failed`：标记 `PAYMENT_FAILED`，供前端提示并允许重发支付。
    - `checkout.session.expired`：标记 `PAYMENT_EXPIRED`，提示用户重新发起支付。
     - 其它事件可记录日志。
5. `POST /api/v1/payments/retry/{taskId}`
   - 可选：允许支付失败后重新生成 Checkout Session。

### 5.5 状态与并发控制
- 防止 webhook 重复触发：在 `TaskPaymentService` 内通过 `stripe_session_id` + 状态判断幂等。
- 处理 webhook 与用户主动查询 race condition：更新 `task_payments` 时使用事务，确保 `tasks` 与 `task_payments` 状态同步。
- 确保支付完成后再触发 Python：`TaskService` 中增加 `dispatchAnalysisTask(task)`，内部：
  - 检查 `task.payment_status` 是否已为 `PAID` 或 `FREE`。
  - 若任务已派发过（可新增 `dispatched_at` 字段或检查状态），避免重复调用。

### 5.6 错误处理与审计
- 所有 Stripe API 调用记录 requestId，便于排查。
- 对支付失败/退款等情况记录详细日志与用户可见信息。
- 将关键操作写入审计日志（可选），满足未来合规需求。

## 6. Python 引擎改造要点
- 当前 FastAPI 接口 `POST /api/v1/analysis/start` 已支持传入 `task_id`，无需大幅调整。
- 建议增加以下保护：
  - 当同一 `task_id` 重复请求时检测数据库状态，若任务已处理可直接返回成功（避免 webhook 重发导致重复分析）。可通过查询 `tasks.status` 或在 Python 侧维护一个 `processing_tasks` 集合。
  - 增加日志记录来源（如 metadata 中带上 `trigger=payment_webhook`）。
- 若未来希望由 Python 主动拉取待分析任务，可预留接口，但本次保持 API 主动推送模式即可。

## 7. 前端改造（`trading-agent-ui`）
### 7.1 状态与界面
- Store 中新增 `billing` slice，保存：
  - `freeQuotaRemaining`
  - `pricingStrategy`（基础价、倍率）
  - 用户支付中任务列表（待轮询）
- 在任务表单旁展示费用预估及免费额度剩余：
  - 表单值变更时调用 `/api/v1/tasks/quote` 或本地计算。
  - 免费额度剩余 > 0 时提示“本次免费”。
  - 免费额度耗尽时提示预计金额。

### 7.2 提交流程
- 提交任务后，根据响应：
  - 若 `paymentRequired=false`：沿用现有成功提示与状态刷新。
  - 若 `paymentRequired=true`：
    - 立即重定向到 Stripe Checkout（使用 `window.location = checkoutUrl`）。
    - 或使用 Stripe.js (`loadStripe` + `redirectToCheckout({ sessionId })`)。
    - 在返回页面（成功/取消）处理：
      - 成功页：提示“支付处理中，任务将自动启动”，并可轮询任务状态。
      - 取消页：允许用户重新触发支付（调用 `POST /api/v1/payments/retry`）。
- 对于 `AWAITING_PAYMENT` 任务，列表中需单独显示“等待支付”状态，并提供“继续支付”按钮。
- 对于 `PAYMENT_FAILED` 或 `PAYMENT_EXPIRED` 的任务，前端需要提示失败原因并提供重新拉起 Checkout 的入口。

### 7.3 额外改动
- 新增 `VITE_STRIPE_PUBLISHABLE_KEY` 环境变量。
- 在 `src/services/taskService.js` 追加调用新的 Billing API。
- 更新 `TaskCard`、`TaskForm` 等组件显示 `paymentStatus`、`billingAmount`。
- 在成功页可提示用户等待 webhook 处理，或通过轮询 `GET /api/v1/tasks/{taskId}` 查看状态变更（从 `AWAITING_PAYMENT` → `PENDING` → `RUNNING` 等）。

## 8. 任务/支付时序（文字描述）
1. 用户访问任务页面，前端加载 `/api/v1/billing/summary`，显示免费额度与定价。
2. 用户填写任务表单，前端实时显示价格预估。
3. 提交任务：
   - 后端判断免费额度。
   - 免费：
     1. 任务保存并立即调用 Python。
     2. 返回成功响应，前端提示“已开始分析”。
   - 付费：
     1. 任务保存为 `AWAITING_PAYMENT`，创建支付记录与 Stripe Checkout Session。
     2. 返回 Checkout URL 与任务信息。
     3. 前端跳转 Stripe 完成支付。
4. Stripe 支付成功 → 发送 `checkout.session.completed` webhook：
   - 后端验证签名，查找 `stripe_session_id` 对应任务。
   - 更新 `task_payments.status=PAID`、`tasks.payment_status=PAID`，再调用 Python。
   - 任务状态更新为 `PENDING` → 后续 Python 更新为 `RUNNING/COMPLETED`。
5. 前端在成功回调页轮询任务或等待推送，看到状态更新后展示分析进度。

## 9. 运维与部署
- `docker-compose.yml` 中 `api` 服务增加 Stripe 相关环境变量。
- 前端部署需注入 `VITE_STRIPE_PUBLISHABLE_KEY`。
- 配置 Stripe webhook（开发可用 `stripe cli` 转发，本地需内网穿透）。
- 确保日志与监控覆盖支付流程（推荐在 API 增加支付相关的 metric）。
- 数据备份策略需覆盖新增表。

## 10. 测试计划
- 单元测试：
  - `PricingService` 计算公式。
  - 免费额度判定逻辑。
  - Stripe 客户端异常处理。
- 集成测试：
  - `TaskService.submitTask` 免费/付费路径。
  - Webhook 处理成功/失败。
  - 任务状态流转。
- 前端端到端测试：
  - 免费额度展示。
  - Stripe Checkout 重定向流程（可使用 Cypress + Stripe 测试密钥环境）。
- 手工回归：
  - 任务创建→支付→Python 分析全链路。
  - 支付失败/取消后的重试。

## 11. 风险与后续事项
- Webhook 延迟或失败：需具备重试与告警，Stripe 默认重试，后端要确保幂等。
- 用户并发提交：需保护免费额度计算，建议在数据库层加乐观锁或使用事务。
- 货币换算：当前仅支持单一币种，后续扩展需调整 `pricing_strategy` 结构。
- 退款流程暂未设计，如需支持需扩展 `TaskPaymentService` 与状态机。
- 需确认是否允许手动标记支付成功（例如管理员补单）。
- 免费额度重置策略（按注册时间一次性 vs 定期重置）需与产品确认。

---

本方案在不引入额外复杂度的前提下，确保收费流程与现有任务调度稳定对接，后续可在此基础上扩展多套餐、多人协同等高级功能。
