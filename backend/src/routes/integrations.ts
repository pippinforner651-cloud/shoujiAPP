// 真实接入状态目录 + 微信小程序数据提交预留接口
// GET /api/v1/integrations/catalog —— 前端按钮渲染的唯一事实源（服务端状态驱动，不看配置文件存在与否）
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getProvider } from '../services/providers.js';
import { createOne } from './activities.js';

// 8 级接入状态 + 两个特殊前置状态（微信/Apple）
export type IntegrationStage =
  | 'adapter_not_started' | 'adapter_implemented' | 'mock_verified'
  | 'sandbox_connected' | 'production_credentials_ready' | 'production_connected'
  | 'pilot_verified' | 'generally_available'
  | 'requires_wechat_mini_program' | 'requires_native_ios_healthkit';

interface CatalogMeta {
  provider: string;
  display_name: string;
  connection_type: string;
  default_stage: IntegrationStage;
  supported_activity_types: string[];
  required_qualifications: string[];
  privacy_requirements: string[];
  commercial_risk: string;
  user_visible_message: string;
  product_facts?: Record<string, string>;
}

const CATALOG_META: CatalogMeta[] = [
  {
    provider: 'joyrun',
    display_name: '悦跑圈',
    connection_type: 'oauth2_pull',
    default_stage: 'mock_verified',
    supported_activity_types: ['running'],
    required_qualifications: ['企业/组织主体资质', '悦跑圈开放平台（open.thejoyrun.com）应用创建与审核', 'Client ID / Client Secret', '回调地址白名单登记', '真实接口文档获取（字段核对）'],
    privacy_requirements: ['用户明示授权', '隐私政策覆盖第三方运动数据用途', '令牌加密存储', '用户可随时断开并清除凭据'],
    commercial_risk: '开放平台合作条款与审核周期未知；接口字段与限流策略需以申请后官方文档为准',
    user_visible_message: '尚未开放：班级正在申请悦跑圈官方接入凭据',
  },
  {
    provider: 'huawei',
    display_name: '华为运动健康',
    connection_type: 'oauth2_pull',
    default_stage: 'mock_verified',
    supported_activity_types: ['running'],
    required_qualifications: ['企业开发者实名认证（华为开发者联盟）', 'AppGallery Connect 创建应用', '申请 Health Kit 服务与数据权限（运动记录读取）', '配置包名与签名证书指纹', '华为侧应用审核通过'],
    privacy_requirements: ['用户明示授权（华为账号体系）', '隐私政策覆盖健康运动数据用途', '令牌加密存储', '用户可随时断开并清除凭据'],
    commercial_risk: 'Health Kit 权限审核标准较严，个人/非医疗用途可能被限制；审核周期不确定',
    user_visible_message: '尚未开放：班级正在申请华为 Health Kit 接入权限',
  },
  {
    provider: 'garmin',
    display_name: '佳明 Garmin',
    connection_type: 'oauth1a_pull',
    default_stage: 'mock_verified',
    supported_activity_types: ['running'],
    required_qualifications: ['Garmin Connect Developer Program 商业授权申请', 'Consumer Key / Consumer Secret', '评估环境（Evaluation）开通', '生产环境开通审核'],
    privacy_requirements: ['用户明示授权', 'Garmin 开发者协议中的数据使用限制', '令牌与 token secret 加密存储', '用户断开后本地凭据清除'],
    commercial_risk: 'Garmin Health API 为商业授权产品，可能涉及许可费用与最低用量承诺；评估环境→生产环境有独立审核；未获评估环境前无法验证真实接口',
    user_visible_message: '尚未开放：班级正在评估 Garmin 商业授权',
    product_facts: {
      product: 'Garmin Health API（Garmin Connect Developer Program）',
      authorization: 'OAuth 1.0a 三段式：request_token / oauthConfirm / access_token（connectapi.garmin.com / connect.garmin.com）',
      data_access: 'Pull 模式：wellness-api/rest/activities（按上传时间窗拉取）',
      webhook: 'Push（Webhook）模式未接入：需 Garmin 商业授权开通推送权限',
      doc_version: '以申请评估环境后获得的官方文档为准（当前未能核对版本）',
    },
  },
  {
    provider: 'wechat',
    display_name: '微信运动',
    connection_type: 'mini_program_only',
    default_stage: 'requires_wechat_mini_program',
    supported_activity_types: ['steps', 'running'],
    required_qualifications: ['注册微信小程序（班级/企业主体）', '小程序内 wx.getWeRunData 授权', '小程序服务端会话（code2session）', '与本 App 账号绑定流程'],
    privacy_requirements: ['小程序隐私协议', '步数数据用途明示', '数据经小程序服务端中转加密提交'],
    commercial_risk: '无直接费用；需投入小程序开发与审核（约 1-2 周）',
    user_visible_message: '需要配套微信小程序：微信运动数据只能在小程序内授权获取，外部 App 无官方接口',
  },
  {
    provider: 'apple',
    display_name: 'Apple Health',
    connection_type: 'native_healthkit_only',
    default_stage: 'requires_native_ios_healthkit',
    supported_activity_types: ['running', 'walking'],
    required_qualifications: ['Mac 电脑 + Xcode', 'Apple Developer Program 付费账号（$99/年）', '原生 iOS 工程（Capacitor iOS 目标）', 'HealthKit entitlement 配置', 'iPhone 真机测试'],
    privacy_requirements: ['HealthKit 数据使用声明（App Store 审核硬性要求）', '数据仅设备端读取、不上传原始健康数据', '用户系统级授权'],
    commercial_risk: 'Apple 开发者年费 $99；HealthKit 审核要求严格；PWA 与 Android 永远无法使用此通道',
    user_visible_message: '需要 iOS 原生版本：Apple Health 只能在 iPhone 真机系统授权，网页与安卓无法直接授权',
  },
];

function stageMessage(stage: IntegrationStage, fallback: string): string {
  switch (stage) {
    case 'sandbox_connected': return '测试环境已连通：可进行测试连接';
    case 'production_connected': return '已开放：可授权连接';
    case 'production_credentials_ready': return '凭据已就绪，待联调验证后开放';
    case 'pilot_verified': return '试点验证通过，即将全员开放';
    case 'generally_available': return '已全员开放';
    default: return fallback;
  }
}

export async function integrationRoutes(app: FastifyInstance) {
  // 接入状态目录（前端按钮渲染唯一事实源）
  app.get('/v1/integrations/catalog', { preHandler: [app.authenticate] }, async () => {
    const states = await app.prisma.integrationState.findMany();
    const byProvider = new Map(states.map((s) => [s.provider, s]));
    const catalog = CATALOG_META.map((meta) => {
      const st = byProvider.get(meta.provider);
      const stage = (st?.stage ?? meta.default_stage) as IntegrationStage;
      const adapter = getProvider(meta.provider);
      const credentialStatus = st?.credentialStatus ?? (adapter?.enabled() ? 'configured_unverified' : 'not_applied');
      return {
        provider: meta.provider,
        display_name: meta.display_name,
        connection_type: meta.connection_type,
        implementation_status: stage,
        credential_status: credentialStatus,
        sandbox_status: st?.sandboxStatus ?? 'not_connected',
        production_status: st?.productionStatus ?? 'not_connected',
        supported_activity_types: meta.supported_activity_types,
        required_qualifications: meta.required_qualifications,
        privacy_requirements: meta.privacy_requirements,
        commercial_risk: meta.commercial_risk,
        user_visible_message: stageMessage(stage, meta.user_visible_message),
        ...(meta.product_facts ? { product_facts: meta.product_facts } : {}),
      };
    });
    return { catalog, serverTime: new Date().toISOString() };
  });

  // 微信小程序数据提交（预留）：微信运动数据只能经配套小程序中转提交
  // 当前未配置 MINIPROGRAM_API_KEY，一律 503 如实返回未启用；配置后记录一律 pending 人工审核
  const mpSchema = z.object({
    phone: z.string().regex(/^1\d{10}$/),
    clientId: z.string().min(8).max(64),
    distanceM: z.number().int().positive().max(100_000),
    durationSec: z.number().int().positive().max(86400),
    startedAt: z.string(),
    endedAt: z.string(),
  });
  app.post('/v1/integrations/wechat-miniprogram/activities', async (req, reply) => {
    const expected = process.env.MINIPROGRAM_API_KEY ?? '';
    if (!expected) {
      return reply.code(503).send({ error: 'MINIPROGRAM_NOT_ENABLED', message: '微信小程序通道未启用：需先开发配套小程序并配置服务端密钥' });
    }
    if (req.headers['x-mini-program-key'] !== expected) {
      return reply.code(401).send({ error: 'BAD_KEY', message: '小程序密钥错误' });
    }
    const parsed = mpSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'BAD_REQUEST', message: '参数错误' });
    const user = await app.prisma.user.findUnique({ where: { phone: parsed.data.phone } });
    if (!user || user.status !== 'approved') {
      return reply.code(403).send({ error: 'NOT_APPROVED', message: '账号不存在或未通过班级审批' });
    }
    // 小程序提交视同外部声明：一律走人工审核（不可信通道）
    const result = await createOne(app, user.id, { ...parsed.data, source: 'wechat', evidenceNote: '微信小程序提交（待审核）' });
    return reply.code(result.duplicated ? 200 : 201).send(result);
  });
}
