// ============================================================
// E23跑起来 · 运行时配置（所有可调项集中在此，不硬编码在页面里）
// 正式部署时以环境变量 VITE_* 覆盖，见 README「构建说明」
// ============================================================

export const CONFIG = {
  // 个人年度参考目标（公里）
  ANNUAL_GOAL_KM: Number(import.meta.env.VITE_ANNUAL_GOAL_KM ?? 270),
  // 多人后端是否已上线（未上线时：不显示伪造人数/里程/排行/动态）
  MULTIPLAYER_ENABLED: import.meta.env.VITE_MULTIPLAYER_ENABLED === 'true',
  // 测试登录验证码（明确标注为测试用途，非真实短信）
  TEST_SMS_CODE: import.meta.env.VITE_TEST_SMS_CODE ?? '123456',
  // 路线状态：未经逐段来源与几何核验前保持 DRAFT
  ROUTE_STATUS: 'DRAFT' as 'DRAFT' | 'RELEASED',
  // 未来地图服务（高德等）接入预留
  MAP_PROVIDER: import.meta.env.VITE_MAP_PROVIDER ?? 'static-pack',
  // 版本标识：预览版页面明示，正式版单独迁移确认
  APP_EDITION: 'Kimi预览版',
};
