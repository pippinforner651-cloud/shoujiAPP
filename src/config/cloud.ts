// E23跑起来 · Cloud 配置
// 📍 所有云端相关的 Vite 环境变量集中在此

export const CLOUD_CONFIG = {
  /** Supabase 项目 URL */
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ?? '',

  /** Supabase 匿名 publishable key */
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',

  /** 多人后端是否启用 */
  MULTIPLAYER_ENABLED: import.meta.env.VITE_MULTIPLAYER_ENABLED === 'true',

  /** 多人环境就绪？(URL + Key + 开关) */
  get ready(): boolean {
    return this.SUPABASE_URL.length > 0 && this.SUPABASE_KEY.length > 0 && this.MULTIPLAYER_ENABLED;
  },

  /** 开发环境允许测试登录 */
  DEV_ONLY_TEST_LOGIN: import.meta.env.DEV,
};
