# E23跑起来 · API 接口说明

> Base URL：`{VITE_API_BASE_URL}`（如 `https://api.example.com`）
> 认证：除注册/登录/健康检查外，均需请求头 `Authorization: Bearer <token>`。
> 单位约定：距离=米(int)、时长=秒(int)、配速=秒/公里(int)、时间=ISO8601。
> 错误格式：`{ "error": "错误码", "message": "中文说明" }`。

## 一、认证与用户 `/api/auth`

| 方法 | 路径 | 说明 | 关键入参 |
|---|---|---|---|
| POST | `/register` | 邀请码注册，注册后状态 `pending` | phone / password(≥6) / nickname / inviteCode |
| POST | `/login` | 登录 | phone / password |
| GET | `/me` | 当前用户 | — |
| PATCH | `/me` | 改昵称/头像 | nickname? / avatarUrl? |

响应：`{ token, user }`；user.phone 已脱敏（`139****2222`）。
错误码：`PHONE_TAKEN` `INVITE_INVALID` `INVITE_EXPIRED` `INVITE_EXHAUSTED` `BAD_CREDENTIALS`。

## 二、活动 `/api/activities`

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/` | approved | 上传单条活动（幂等） |
| POST | `/sync` | approved | 批量回补离线队列，≤50 条 |
| GET | `/mine` | 登录 | 我的活动列表（含各状态） |
| GET | `/mine/stats` | 登录 | 我的统计（仅 valid 计入） |

### 上传活动入参

```json
{
  "clientId": "c-m3x8k2-a1b2c3d4",       // 客户端幂等键，必填，8-64位
  "source": "gps",                        // gps|manual|watch|joyrun
  "distanceM": 5000,
  "durationSec": 2000,
  "startedAt": "2026-07-15T06:00:00.000Z",
  "endedAt":   "2026-07-15T06:33:20.000Z",
  "trackPoints": [{"lat":22.53,"lon":113.95,"accuracyM":8,"timestamp":"..."}],
  "evidenceNote": "手动补录必填凭证说明"
}
```

### 服务端校验引擎裁决（三态）

- `valid`：通过全部规则，立即计入汇总；
- `pending`：可疑（手动补录一律 pending、**悦跑圈/手表来源无轨迹一律 pending**、配速过慢、轨迹跳变>5%、精度差、当日手动超 42.2km），待管理员审核；
- `rejected`：不可能数据（距离/时长越界、配速快于 2'30"/km、时间不一致），永不计入。

**悦跑圈（source=joyrun）专项规则**：带 ≥2 个轨迹点的导入按 GPS 轨迹规则裁决（配速/跳变/精度/时间一致性全部适用），合规即 valid；无轨迹的纯数值声明一律 pending 人工审核。前端两条导入链路见「我的 → 设备与数据来源 → 悦跑圈」。

规则阈值全部环境变量可配，见 `backend/src/config.ts` 的 `RULES`。

### 幂等

`@@unique(userId, clientId)`：重复上传同 clientId 返回 `200 { duplicated: true }`，不产生第二条记录，网络重试/双击/队列重放均安全。

## 三、班级 `/api/class`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/progress` | 环线汇总：routeVersion、totalM、memberCount、todayCount、**serverTime** |
| GET | `/leaderboard` | 排行榜（仅 approved 成员，按 valid 跑量降序） |

汇总数据源为 `route_progress` 表，任何变更（上传/审核/删除）后立即重算，是唯一事实源。

## 四、管理端 `/api/admin`（需 admin 角色）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/invites` | 生成邀请码（`E23-XXXXXXXX`） |
| GET | `/members?status=` | 成员列表（手机号脱敏） |
| POST | `/members/:id/review` | 审批成员 `{action:"approve"|"reject"}` |
| GET | `/activities?status=pending` | 待审核活动队列 |
| POST | `/activities/:id/review` | 审核活动，通过即计入并重算 |
| DELETE | `/activities/:id` | 删除活动并重算 |

## 五、第三方平台 `/api/providers/:provider`（官方 OAuth，通用五端点）

支持平台：`joyrun`（悦跑圈，OAuth2.0）、`huawei`（华为运动健康，OAuth2.0）、`garmin`（佳明，OAuth 1.0a 三段式签名）。未知平台返回 `404 PROVIDER_UNKNOWN`。凭据由班级/企业向各平台申请，经环境变量注入；**未配置时如实返回 `503 PROVIDER_NOT_ENABLED`，不伪装已接入**。

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/providers` | 登录 | 平台清单（key/name/enabled/connected/lastSyncAt） |
| GET | `/api/providers/:p/status` | 登录 | 单平台状态 |
| GET | `/api/providers/:p/authorize-url` | approved | 授权跳转地址；state 为 10 分钟短时效 JWT（绑定用户、防 CSRF）。佳明会先取 request token 并暂存 secret |
| GET | `/api/providers/:p/callback` | 免登（state 验签） | OAuth2 传 code；佳明传 oauth_token+oauth_verifier → 换令牌 upsert 连接 → 302 跳回 `FRONTEND_URL?oauth=provider:connected|failed` |
| POST | `/api/providers/:p/sync` | approved | 拉取 from~to 记录入库；幂等键 `{provider}-{runId}` |
| POST | `/api/providers/:p/disconnect` | 登录 | 删除授权连接 |

**可信通道**：官方 API 服务端对服务端拉取的记录调用 `createOne(..., { trusted: true })`——跳过「无轨迹强制人工审核」（数据不可被用户篡改），距离/时长/配速/时间一致性硬规则仍全量适用。客户端上传永不携带 trusted。

**安全要求（已实现）**：access/refresh token AES-256-GCM 加密存储；client_secret 仅服务端持有；OAuth state 一次性+10分钟短时效+绑定用户（重用返回 400）；回调地址白名单（CALLBACK_ALLOWED_HOSTS）；Webhook 一律验签、未接入平台返回 501 NOT_SUPPORTED；日志不打印令牌；审计只记脱敏 openId；断开连接执行平台撤销+本地凭据清除。

**真实状态目录**：`GET /api/v1/integrations/catalog`（登录）返回五平台 implementation_status（八级+特殊前置）/credential_status/sandbox_status/production_status/资质/隐私要求/商业风险/用户文案——前端按钮渲染唯一事实源。管理员凭真实事件经 `POST /api/admin/integrations/:provider/mark` 推进状态并留痕。

**来源标记**：悦跑圈/华为记录 source=joyrun；佳明 source=watch（均带「官方API同步 runId」凭证说明，审计留痕 PROVIDER_CONNECTED/SYNCED/DISCONNECTED）。佳明仅跑步记录计入，骑行等自动过滤。

字段映射：各平台返回结构差异收敛在 `backend/src/services/providers.ts` 的 `mapJoyrunRun/mapHuaweiRun/mapGarminRun` 单点函数；平台返回结构变化只改对应函数。

## 六、健康检查

`GET /api/health` → `{ ok, service, db: "up"|"down", serverTime }`，无需鉴权。

## 七、权限矩阵

| 角色\接口 | 上传活动 | 排行榜/进度 | 审批/审核 |
|---|---|---|---|
| 未登录 | ✗ (401) | ✗ (401) | ✗ |
| pending/rejected 成员 | ✗ (403 NOT_APPROVED) | ✓ 只读 | ✗ |
| approved 成员 | ✓ | ✓ | ✗ |
| admin | ✓ | ✓ | ✓ |
