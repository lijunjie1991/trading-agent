# 配置项说明手册

本文集中列出 TradingAgent 项目的所有关键配置文件、支持的环境变量及推荐的注入方式，方便部署与运维时快速查阅。所有示例均以默认仓库结构为准。

---

## 1. 根目录 `.env`

该文件主要服务于 `docker-compose`，也是线上部署时统一的环境变量入口。示例字段如下：

| 变量 | 说明 | 默认值/示例 |
| ---- | ---- | ----------- |
| `MYSQL_URL` | Java 服务使用的 JDBC 连接串 | `jdbc:mysql://.../tradingagent` |
| `MYSQL_HOST`/`MYSQL_PORT`/`MYSQL_DATABASE` | Python 引擎直连数据库所需信息 | `database-1...`, `3306`, `tradingagent` |
| `MYSQL_USER`/`MYSQL_PASSWORD` | 数据库账号密码 | `admin`, `***` |
| `ENGINE_PORT`/`API_PORT`/`UI_PORT` | 三个服务对外映射端口 | `8000` / `8080` / `80` |
| `SPRING_PROFILES_ACTIVE` | Spring Boot Profile，默认 `prod` | `prod` |
| `JWT_SECRET` | Java API 的 JWT 签名密钥（需自定义） | — |
| `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GOOGLE_API_KEY` 等 | LLM、行情接口密钥 | — |
| `STRIPE_SECRET_KEY` | Stripe 后端 Secret Key | — |
| `STRIPE_PUBLISHABLE_KEY` | Stripe 前端 Publishable Key（需与 UI 同步） | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 签名校验密钥 | — |
| `STRIPE_SUCCESS_URL`/`STRIPE_CANCEL_URL` | 付费成功或取消后的回调地址 | `https://sandbox.quantumhusky.ai/billing/...` |
| `BILLING_DEFAULT_PRICING_CODE` | 当前生效的定价策略代码 | `DEFAULT` |

> **建议**：生产环境请使用密钥管理服务（Vault/Parameter Store 等）托管上述敏感变量，再通过 CI/CD 注入容器。

---

## 2. Java API (`trading-agent-api`)

### 2.1 `src/main/resources/application.yml`

开发模式/默认 profile 的配置来源，所有敏感项都支持环境变量覆盖：

- `spring.datasource.url` -> `DB_URL`
- `spring.datasource.username`/`password` -> `DB_USERNAME`/`DB_PASSWORD`
- `jwt.secret` -> `JWT_SECRET`
- `python.service.url` -> `PYTHON_SERVICE_URL`
- `stripe.*` -> `STRIPE_SECRET_KEY`、`STRIPE_PUBLISHABLE_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_SUCCESS_URL`、`STRIPE_CANCEL_URL`、`BILLING_DEFAULT_PRICING_CODE`
- `server.port` -> `SERVER_PORT`

### 2.2 `src/main/resources/application-prod.yml`

生产 profile 的专用配置，与 `application.yml` 保持同名变量，发布时只需切换 `SPRING_PROFILES_ACTIVE=prod`。

### 2.3 `StripeProperties` & Webhook

`StripeProperties` 会自动装载上述 `stripe.*` 变量。若启用付费，需要确保：

1. `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` 已配置；
2. 在 Stripe Dashboard 注册 webhook → 指向 `https://<api-domain>/api/v1/payments/webhook`；
3. `/api/v1/payments/webhook` 已在 `SecurityConfig` 中放行（默认已处理，无需额外操作）。

---

## 3. Python 引擎 (`trading-agent-engine`)

### 3.1 `.env.example`

主要变量：

| 变量 | 说明 |
| ---- | ---- |
| `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD` | 连接数据库所需信息（与 Java API 共用） |
| `OPENAI_API_KEY`、`ALPHA_VANTAGE_API_KEY` 等 | 分析任务所需的外部 API 密钥 |

部署时可以复制 `.env.example` → `.env`，或在 Docker 环境中通过 `MYSQL_HOST` 等变量注入。

---

## 4. 前端 (`trading-agent-ui`)

### 4.1 `.env` / `.env.example`

| 变量 | 说明 | 默认值 |
| ---- | ---- | ------ |
| `VITE_API_BASE_URL` | API 基础地址（开发环境留空以使用 Vite 代理） | `""` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Publishable Key（配合后台同一个账户） | 无默认 |

> 生产构建时（Nginx 托管），`VITE_*` 变量需在 `docker build` 前写入环境或 `.env` 文件。

---

## 5. Docker Compose (`docker-compose.yml`)

`api` 服务会读取根 `.env` 中的数据库、JWT、Stripe 等配置，关键映射如下：

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `BILLING_DEFAULT_PRICING_CODE`

Python 引擎读取 `MYSQL_HOST`/`MYSQL_PORT` 等；前端容器无额外环境变量（打包时读取 `VITE_*`）。

---

## 6. 配置建议与校验清单

1. **本地开发**
   - Java：在 IDE 中设置 `DB_URL` 指向本地 MySQL，`STRIPE_*` 可留空或使用测试密钥。
   - Python：复制 `trading-agent-engine/.env.example` 并填写数据库/LLM 凭据。
   - 前端：在 `trading-agent-ui/.env` 写入 `VITE_STRIPE_PUBLISHABLE_KEY`（若需测试付费流程）。

2. **CI/CD / 生产部署**
   - 使用根 `.env` 管理跨服务变量；不要将真实密钥提交至版本库。
   - Stripe success/cancel URL 建议指向前端 `https://<your-ui>/billing/{success|cancel}`，以便给用户友好提示。
   - 配置 Stripe Webhook 并验证 `webhook secret`，否则支付完成后任务不会自动触发 Python 引擎。

3. **新增/修改定价策略**
   - 通过数据库更新 `pricing_strategy` 表，修改 `is_active` 或 `free_tasks_per_user` 即可，无需重启服务。
   - 若引入新的策略代码，记得同步更新 `BILLING_DEFAULT_PRICING_CODE`。

---

如需更多细节，可参考：
- `BILLING_DESIGN.md`：完整收费设计说明。
- `trading-agent-api/README.md`：后端部署及 Stripe 说明。
- `trading-agent-ui/README.md`：前端构建与环境变量配置。
