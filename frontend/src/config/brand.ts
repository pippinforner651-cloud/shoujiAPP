/**
 * E23跑起来 — 品牌文案包 V1.0
 *
 * 所有页面文案统一引用此文件。
 * 修改文案只需改这里，不用逐个改组件。
 */

export const BRAND = {
  /* ======= 基础信息 ======= */
  /** APP正式名称 */
  APP_NAME: 'E23跑起来',
  /** 品牌副标题 */
  TAGLINE: '每一步，都在环游中国',
  /** 核心口号 */
  SLOGAN: '跑起来，看见中国',
  /** 版本号 */
  VERSION: 'V1.0.1',
  /** 品牌精神 */
  SPIRIT: ['真实', '坚持', '探索', '抵达'],

  /* ======= 启动页 ======= */
  SPLASH: {
    main: '每一步，都在环游中国',
    bottom: '48城 · 21,423公里 · 1:10虚拟推进',
  },

  /* ======= 登录/注册 ======= */
  AUTH: {
    welcome: '欢迎加入E23共同奔跑计划。\n记录每一次出发，\n见证每一段坚持，\n一起完成属于E23的环游旅程。',
    phoneLoginTitle: '手机号登录 / 注册',
    realNameLabel: '真实姓名',
    realNamePlaceholder: '请输入真实姓名',
    realNameHint: '用于识别E23成员身份，仅本人和管理员可见。',
    phoneLabel: '手机号码',
    phonePlaceholder: '请输入手机号码',
    phoneHint: '手机号将用于登录、找回账号和接收重要通知。',
    codeLabel: '验证码',
    codePlaceholder: '请输入验证码',
    getCodeBtn: '获取验证码',
    resendCode: '重新获取',
    testEnvHint: '当前为测试版本，请使用验证码 123456。',
    testCodeMsg: '测试验证码：123456',
    errorCode: '验证码错误，请重新输入。',
    errorPhone: '请输入正确的手机号码。',
    errorName: '请输入真实姓名。',
    errorAgreement: '请先阅读并同意《用户协议》和《隐私政策》。',
    loginBtn: '登录 / 注册',
    loginProcessing: '正在登录...',
    loginSuccess: '登录成功，欢迎加入E23跑起来。',
    wechatBtn: '微信模拟登录（测试版）',
    wechatDialogTitle: '微信登录尚未正式开放',
    wechatDialogBody:
      '当前微信登录尚未接入微信开放平台。\n\n此入口仅用于测试界面和登录流程，不会获取真实微信头像、昵称或账号信息。',
    wechatCancel: '取消',
    wechatConfirm: '继续测试',
    agreementText: '我已阅读并同意《用户协议》和《隐私政策》',
    footerVersion: 'E23跑起来 V1.0.1',
    footerTest: '当前为内部测试版本',
  },

  /* ======= 首页 ======= */
  HOME: {
    greetingMorning: '早上好，准备开始今天的奔跑了吗？',
    greetingAfternoon: '中午好，每一步都算数。',
    greetingEvening: '晚上好，今天也别忘了为自己出发。',
    greetingGeneral: '欢迎回来，E23跑者。',
    todayRun: '今日跑量',
    weekRun: '本周跑量',
    totalRun: '累计跑量',
    streak: '连续运动',
    startRun: '开始跑步',
    startRunAlt: '立即出发',
    running: '正在奔跑',
    pause: '暂停',
    resume: '继续',
    finish: '结束本次跑步',
    currentReach: 'E23当前到达',
    nextStop: '下一站',
    distanceToNext: '距离下一站还有',
    teamMileage: '团队累计里程',
    encouragement: '一起向前，再坚持一点。',
    teamProgress: '每个人的一小步，\n汇聚成E23的一大步。',
    teamProgressAlt: '今天的每一公里，\n都在推动团队向前。',
  },

  /* ======= 跑步页面 ======= */
  RUN: {
    ready: '准备好了吗？',
    readyHint: '确认定位权限后，即可开始记录跑步。',
    startRecord: '开始记录',
    distance: '当前距离',
    duration: '运动时长',
    avgPace: '平均配速',
    currentPace: '当前配速',
    calories: '消耗热量',
    gpsSignal: 'GPS信号',
    gpsGood: '定位良好',
    gpsSearching: '正在搜索GPS信号',
    gpsWeak: 'GPS信号较弱，请前往开阔区域',
    pausedTitle: '本次跑步已暂停',
    pausedHint: '准备好后继续出发',
    finishConfirmTitle: '确认结束本次跑步？',
    finishConfirmBody: '结束后将保存本次跑步记录，并更新个人及团队里程。',
    finishContinue: '继续跑步',
    finishSave: '结束并保存',
    savedTitle: '本次跑步已保存',
    savedHint: '你的每一步，都在推动E23向前。',
    failedTitle: '当前网络异常，记录已保存在本机。',
    failedHint: '恢复网络后将自动同步。',
    retryBtn: '重新上传',
  },

  /* ======= 跑步总结页 ======= */
  SUMMARY: {
    title: '本次跑步完成',
    encouragements: [
      '又完成了一次出发。',
      '坚持没有白走的路。',
      '今天的你，比昨天更向前一步。',
    ],
    distance: '跑步距离',
    duration: '运动时长',
    pace: '平均配速',
    calories: '消耗热量',
    elevation: '累计爬升',
    shareBtn: '分享本次成绩',
    posterBtn: '生成跑步海报',
    backBtn: '返回首页',
  },

  /* ======= 我的页面 ======= */
  PROFILE: {
    runnerTitle: 'E23跑者',
    subtitle: '每一步，都在环游中国',
    totalRun: '累计跑步',
    runCount: '跑步次数',
    streak: '连续天数',
    citiesReached: '到达城市',
    currentJourney: '当前旅程',
    fromGobi: '从深圳出发',
    distanceToNext: '距离下一站还有',
    completionPercent: '已完成全部旅程的',
    editProfile: '编辑资料',
    nickName: 'APP昵称',
    realName: '真实姓名',
    phone: '手机号',
    signature: '个性签名',
    defaultSignature: '跑起来，看见中国。',
    saveBtn: '保存资料',
    saved: '资料已更新',
    selectAvatar: '选择头像',
    systemAvatar: '使用系统头像',
    uploadAvatar: '上传本地头像',
    wechatAvatar: '微信头像暂未开放',
  },

  /* ======= 称号系统 ======= */
  TITLES: [
    { name: '旅程起跑者', desc: '加入E23跑起来，开启中国环线旅程。', minKm: 0 },
    { name: '坚持跑者', desc: '累计跑步达到10公里。', minKm: 10 },
    { name: '百里跑者', desc: '累计跑步达到100公里。', minKm: 100 },
    { name: '城市探索者', desc: '与E23共同到达第一个新城市。', minKm: 500 },
    { name: '环游挑战者', desc: '累计跑步达到1000公里。', minKm: 1000 },
    { name: '远方同行者', desc: '累计跑步达到5000公里。', minKm: 5000 },
    { name: '中国环线跑者', desc: '持续推进中国环线旅程。', minKm: 10000 },
  ],

  /* ======= 勋章系统 ======= */
  BADGES: [
    { name: '首次出发', desc: '完成第一次跑步记录。', icon: 'flag' },
    { name: '深圳起点', desc: '从深圳开启中国环线旅程。', icon: 'route' },
    { name: '十公里跑者', desc: '累计跑步达到10公里。', icon: 'award' },
    { name: '百里跑者', desc: '累计跑步达到100公里。', icon: 'trophy' },
    { name: '连续七天', desc: '连续7天完成运动记录。', icon: 'calendar' },
    { name: '城市探索者', desc: '到达第一个新城市。', icon: 'map' },
    { name: '环游跑者', desc: '持续推进中国环线旅程。', icon: 'route' },
    { name: '坚持跑者', desc: '在困难中保持真实记录。', icon: 'fire' },
    { name: '中国环线跑者', desc: '向48座城市的完整路线前进。', icon: 'map' },
  ],

  /* ======= 排行榜 ======= */
  RANKING: {
    title: 'E23跑者榜',
    weekly: '本周排行',
    monthly: '本月排行',
    allTime: '累计排行',
    description: '排名不是终点，\n坚持才是最大的胜利。',
    leader: '领跑者',
    empty: '暂时还没有跑步记录。',
    emptyHint: '完成一次跑步，成为首位出发的E23跑者。',
    optOut: '不参与排行榜',
    optOutHint: '关闭后，你的跑量仍会计入个人统计，但不会公开显示在排行榜中。',
  },

  /* ======= 数据接入 ======= */
  DEVICES: {
    title: '运动数据与设备',
    desc: '你可以通过APP直接记录，也可以导入其他运动平台的数据。',
    sources: {
      app_gps: { name: 'APP直接记录', status: '已支持', desc: '使用手机GPS记录距离、时间、配速和轨迹。' },
      manual: { name: '手动录入', status: '已支持', desc: '适合补录未通过设备记录的跑步数据。' },
      gpx_import: { name: 'GPX文件导入', status: '已支持', desc: '可从其他运动软件导出GPX文件后导入。' },
      health_connect: { name: 'Android Health Connect', status: '接入测试中', desc: '用于读取已授权的安卓健康与运动记录。' },
      coros: { name: 'COROS 高驰', status: '官方接口申请中', desc: '待获得官方授权后开放数据同步。' },
      joyrun: { name: '悦跑圈', status: '接入条件核验中', desc: '待确认官方开放平台与授权能力。' },
      wechat: { name: '微信运动', status: '暂未开放', desc: '当前没有适合本APP直接读取完整跑步记录的公开接口。' },
      healthkit: { name: 'Apple健康', status: '等待iOS原生版', desc: 'PWA版本无法读取HealthKit，需在iOS原生APP中接入。' },
    },
  },

  /* ======= GPX导入 ======= */
  GPX_IMPORT: {
    title: '导入跑步记录',
    desc: '请选择从其他运动软件导出的GPX文件。',
    support: '支持单个或多个GPX文件导入。',
    selectBtn: '选择GPX文件',
    parsing: '正在解析跑步记录...',
    success: '导入成功',
    added: (n: number) => `已新增${n}条跑步记录。`,
    duplicate: '该跑步记录已存在，未重复导入。',
    failed: '文件无法解析，请确认文件格式是否正确。',
  },

  /* ======= 客服中心 ======= */
  SUPPORT: {
    title: '客服与帮助',
    welcome: '遇到问题时，我们会尽力帮助你。',
    categories: ['账号与登录', '验证码问题', '跑步数据问题', 'GPS定位问题', '设备同步问题', '地图与里程问题'],
    contact: '联系客服',
    contactHint: '请描述问题，并尽量附上截图、手机型号和发生时间。',
    typePlaceholder: '请选择问题类型',
    descPlaceholder: '请详细描述你遇到的问题',
    contactPlaceholder: '请留下手机号或微信，方便客服回复',
    submitBtn: '提交反馈',
    submitted: '反馈已提交，我们会尽快处理。',
  },

  /* ======= 账号安全 ======= */
  ACCOUNT: {
    title: '账号与安全',
    boundPhone: '已绑定手机号',
    wechatNotOpen: '微信账号尚未正式开放绑定',
    lastLoginTime: '最近登录时间',
    lastLoginDevice: '最近登录设备',
    logout: '退出登录',
    logoutConfirm: '确认退出当前账号？',
    logoutHint: '退出后需要重新登录，但不会删除已同步的跑步数据。',
    logoutCancel: '取消',
    logoutConfirmBtn: '确认退出',
    deleteAccount: '注销账号',
    deleteWarning: '注销后，账号及相关数据将按规则处理，且操作不可撤销。',
  },

  /* ======= 权限请求 ======= */
  PERMISSIONS: {
    location: 'E23跑起来需要使用定位权限记录跑步距离、路线和配速。',
    backgroundLocation: '在跑步过程中，即使手机锁屏或APP切到后台，也需要持续获取定位，以保证跑步记录完整。',
    denied: '未获得定位权限，无法开始GPS跑步记录。',
    goToSettings: '前往设置',
  },

  /* ======= 分享海报 ======= */
  SHARE: {
    title: 'E23跑起来',
    subtitle: '每一步，都在环游中国',
    thisRun: '本次跑步',
    totalMileage: '累计里程',
    teamReached: '团队当前到达',
    footer: '每一步，都在环游中国。',
    footerAlt: '真实跑步，虚拟前进。',
    footerAlt2: '从深圳出发，最终回到深圳。',
  },

  /* ======= 异常提示 ======= */
  ERRORS: {
    network: '网络连接异常，请稍后重试。',
    server: '服务暂时不可用，请稍后再试。',
    sessionExpired: '登录状态已失效，请重新登录。',
    noData: '暂时还没有数据。',
    success: '操作成功',
    failed: '操作失败，请重试。',
    duplicate: '该记录已存在，无需重复添加。',
  },

  /* ======= 品牌短句库 ======= */
  QUOTES: [
    '每一步，都在环游中国。',
    '跑起来，看见中国。',
    '从深圳出发，最终回到深圳。',
    '真实跑步，虚拟前进。',
    '48座城市，等待你的脚步。',
    '今天的距离，也是旅程的进度。',
    '坚持，是对远方最好的回答。',
    '今天的每一公里，都会成为旅程的记忆。',
    '沿着中国路线，一站一站抵达。',
    '不是为了超越别人，而是为了不停止前进。',
    '每一次出发，都是新的连接。',
    '路有多远，坚持就有多长。',
  ],
} as const;

/** 获取当日问候语 */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return BRAND.HOME.greetingMorning;
  if (h < 18) return BRAND.HOME.greetingAfternoon;
  return BRAND.HOME.greetingEvening;
}
