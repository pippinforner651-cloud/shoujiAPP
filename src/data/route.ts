// ============================================================
// E23跑起来 · 环中国边境线接力路线主数据（冻结）
// 标准环中国自驾环线：深圳出发 → G228沿海北上 → 丹东
//   → G331沿边境 → 哈巴河/喀纳斯 → G219新藏滇藏线 → 东兴
//   → G228返回深圳闭环
// 总里程 27191 公里（≥27,000km 要求），跑量 1:1 同步，不做虚拟放大
// 数据结构即"地图包"接口：未来全球跑/导入第三方地图遵循同一格式
// ============================================================

export interface RouteNode {
  id: number;
  name: string;        // 站点名
  lon: number; lat: number;
  segKm: number;       // 距上一站的真实路段里程
  road: string;        // 当前所在真实道路
  province: string;
  spots: string[];     // 当地名胜古迹
  foods: string[];     // 当地美食推荐
  cumKm: number;       // 距起点累计里程
}

export interface MapPack {
  packId: string;
  name: string;
  version: string;
  totalKm: number;
  loop: boolean;
  nodes: RouteNode[];
}

export const CHINA_LOOP_PACK: MapPack = {
  packId: "china-border-loop-v2",
  name: "环中国边境线（G228+G331+G219）",
  version: "2.0.0",
  totalKm: 27191,
  loop: true,
  nodes: [
  {
    "id": 0,
    "name": "深圳",
    "lon": 114.06,
    "lat": 22.54,
    "segKm": 0,
    "road": "起点·G228国道",
    "province": "广东",
    "spots": [
      "大鹏半岛",
      "莲花山公园"
    ],
    "foods": [
      "光明乳鸽",
      "沙井生蚝"
    ],
    "cumKm": 0
  },
  {
    "id": 1,
    "name": "惠州",
    "lon": 114.42,
    "lat": 23.1,
    "segKm": 115,
    "road": "G228国道",
    "province": "广东",
    "spots": [
      "西湖",
      "罗浮山"
    ],
    "foods": [
      "梅菜扣肉",
      "东江盐焗鸡"
    ],
    "cumKm": 115
  },
  {
    "id": 2,
    "name": "汕尾",
    "lon": 115.38,
    "lat": 22.79,
    "segKm": 160,
    "road": "G228国道",
    "province": "广东",
    "spots": [
      "红海湾",
      "凤山祖庙"
    ],
    "foods": [
      "汕尾薄饼",
      "马鲛鱼丸"
    ],
    "cumKm": 275
  },
  {
    "id": 3,
    "name": "汕头",
    "lon": 116.68,
    "lat": 23.35,
    "segKm": 215,
    "road": "G228国道",
    "province": "广东",
    "spots": [
      "南澳岛",
      "小公园骑楼"
    ],
    "foods": [
      "牛肉火锅",
      "蚝烙"
    ],
    "cumKm": 490
  },
  {
    "id": 4,
    "name": "厦门",
    "lon": 118.09,
    "lat": 24.48,
    "segKm": 305,
    "road": "G228国道",
    "province": "福建",
    "spots": [
      "鼓浪屿",
      "环岛路"
    ],
    "foods": [
      "沙茶面",
      "土笋冻"
    ],
    "cumKm": 795
  },
  {
    "id": 5,
    "name": "泉州",
    "lon": 118.68,
    "lat": 24.93,
    "segKm": 125,
    "road": "G228国道",
    "province": "福建",
    "spots": [
      "开元寺",
      "蟳埔村"
    ],
    "foods": [
      "面线糊",
      "姜母鸭"
    ],
    "cumKm": 920
  },
  {
    "id": 6,
    "name": "福州",
    "lon": 119.3,
    "lat": 26.08,
    "segKm": 220,
    "road": "G228国道",
    "province": "福建",
    "spots": [
      "三坊七巷",
      "鼓山"
    ],
    "foods": [
      "佛跳墙",
      "福州鱼丸"
    ],
    "cumKm": 1140
  },
  {
    "id": 7,
    "name": "宁德",
    "lon": 119.55,
    "lat": 26.66,
    "segKm": 135,
    "road": "G228国道",
    "province": "福建",
    "spots": [
      "太姥山",
      "霞浦滩涂"
    ],
    "foods": [
      "大黄鱼",
      "继光饼"
    ],
    "cumKm": 1275
  },
  {
    "id": 8,
    "name": "温州",
    "lon": 120.7,
    "lat": 28.0,
    "segKm": 305,
    "road": "G228国道",
    "province": "浙江",
    "spots": [
      "雁荡山",
      "楠溪江"
    ],
    "foods": [
      "温州鱼丸",
      "灯盏糕"
    ],
    "cumKm": 1580
  },
  {
    "id": 9,
    "name": "台州",
    "lon": 121.42,
    "lat": 28.66,
    "segKm": 160,
    "road": "G228国道",
    "province": "浙江",
    "spots": [
      "神仙居",
      "天台山"
    ],
    "foods": [
      "临海麦虾",
      "蛋清羊尾"
    ],
    "cumKm": 1740
  },
  {
    "id": 10,
    "name": "宁波",
    "lon": 121.55,
    "lat": 29.87,
    "segKm": 235,
    "road": "G228国道",
    "province": "浙江",
    "spots": [
      "天一阁",
      "东钱湖"
    ],
    "foods": [
      "宁波汤圆",
      "红膏炝蟹"
    ],
    "cumKm": 1975
  },
  {
    "id": 11,
    "name": "上海",
    "lon": 121.47,
    "lat": 31.23,
    "segKm": 345,
    "road": "G228国道·跨海大桥",
    "province": "上海",
    "spots": [
      "外滩",
      "豫园"
    ],
    "foods": [
      "生煎包",
      "本帮红烧肉"
    ],
    "cumKm": 2320
  },
  {
    "id": 12,
    "name": "南通",
    "lon": 120.86,
    "lat": 31.98,
    "segKm": 160,
    "road": "G228国道",
    "province": "江苏",
    "spots": [
      "狼山",
      "濠河"
    ],
    "foods": [
      "南通脆饼",
      "白蒲茶干"
    ],
    "cumKm": 2480
  },
  {
    "id": 13,
    "name": "盐城",
    "lon": 120.16,
    "lat": 33.35,
    "segKm": 195,
    "road": "G228国道",
    "province": "江苏",
    "spots": [
      "丹顶鹤湿地",
      "大丰麋鹿园"
    ],
    "foods": [
      "东台鱼汤面",
      "建湖藕粉圆"
    ],
    "cumKm": 2675
  },
  {
    "id": 14,
    "name": "连云港",
    "lon": 119.22,
    "lat": 34.6,
    "segKm": 225,
    "road": "G228国道",
    "province": "江苏",
    "spots": [
      "花果山",
      "连岛"
    ],
    "foods": [
      "连云港海鲜",
      "板浦凉粉"
    ],
    "cumKm": 2900
  },
  {
    "id": 15,
    "name": "日照",
    "lon": 119.53,
    "lat": 35.42,
    "segKm": 150,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "万平口",
      "日照海滨"
    ],
    "foods": [
      "日照绿茶",
      "海鲜疙瘩汤"
    ],
    "cumKm": 3050
  },
  {
    "id": 16,
    "name": "青岛",
    "lon": 120.38,
    "lat": 36.07,
    "segKm": 155,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "栈桥",
      "崂山"
    ],
    "foods": [
      "辣炒蛤蜊",
      "青岛啤酒"
    ],
    "cumKm": 3205
  },
  {
    "id": 17,
    "name": "烟台",
    "lon": 121.45,
    "lat": 37.46,
    "segKm": 280,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "蓬莱阁",
      "养马岛"
    ],
    "foods": [
      "烟台苹果",
      "鲅鱼水饺"
    ],
    "cumKm": 3485
  },
  {
    "id": 18,
    "name": "威海",
    "lon": 122.12,
    "lat": 37.51,
    "segKm": 105,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "刘公岛",
      "成山头"
    ],
    "foods": [
      "威海海参",
      "鱼锅饼子"
    ],
    "cumKm": 3590
  },
  {
    "id": 19,
    "name": "东营",
    "lon": 118.67,
    "lat": 37.43,
    "segKm": 425,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "黄河入海口湿地"
    ],
    "foods": [
      "黄河口大闸蟹",
      "利津水煎包"
    ],
    "cumKm": 4015
  },
  {
    "id": 20,
    "name": "天津",
    "lon": 117.2,
    "lat": 39.09,
    "segKm": 340,
    "road": "G228国道",
    "province": "天津",
    "spots": [
      "五大道",
      "天津之眼"
    ],
    "foods": [
      "狗不理包子",
      "煎饼果子"
    ],
    "cumKm": 4355
  },
  {
    "id": 21,
    "name": "秦皇岛",
    "lon": 119.6,
    "lat": 39.94,
    "segKm": 315,
    "road": "G228国道",
    "province": "河北",
    "spots": [
      "山海关",
      "北戴河"
    ],
    "foods": [
      "四条包子",
      "长城饽椤饼"
    ],
    "cumKm": 4670
  },
  {
    "id": 22,
    "name": "葫芦岛",
    "lon": 120.84,
    "lat": 40.71,
    "segKm": 190,
    "road": "G228国道",
    "province": "辽宁",
    "spots": [
      "兴城古城",
      "东戴河"
    ],
    "foods": [
      "虹螺岘干豆腐",
      "海鲜烧烤"
    ],
    "cumKm": 4860
  },
  {
    "id": 23,
    "name": "营口",
    "lon": 122.24,
    "lat": 40.67,
    "segKm": 210,
    "road": "G228国道",
    "province": "辽宁",
    "spots": [
      "鲅鱼圈",
      "辽河老街"
    ],
    "foods": [
      "营口海蜇",
      "盖州苹果"
    ],
    "cumKm": 5070
  },
  {
    "id": 24,
    "name": "大连",
    "lon": 121.61,
    "lat": 38.91,
    "segKm": 270,
    "road": "G228国道",
    "province": "辽宁",
    "spots": [
      "星海广场",
      "老虎滩"
    ],
    "foods": [
      "大连海参",
      "咸鱼饼子"
    ],
    "cumKm": 5340
  },
  {
    "id": 25,
    "name": "丹东",
    "lon": 124.39,
    "lat": 40.13,
    "segKm": 365,
    "road": "G228终点·转G331",
    "province": "辽宁",
    "spots": [
      "鸭绿江断桥",
      "虎山长城"
    ],
    "foods": [
      "黄蚬子",
      "朝鲜冷面"
    ],
    "cumKm": 5705
  },
  {
    "id": 26,
    "name": "集安",
    "lon": 126.19,
    "lat": 41.13,
    "segKm": 345,
    "road": "G331国道",
    "province": "吉林",
    "spots": [
      "高句丽古迹",
      "鸭绿江国门"
    ],
    "foods": [
      "高丽火盆",
      "集安板栗"
    ],
    "cumKm": 6050
  },
  {
    "id": 27,
    "name": "二道白河",
    "lon": 128.12,
    "lat": 42.42,
    "segKm": 365,
    "road": "G331国道",
    "province": "吉林",
    "spots": [
      "长白山天池",
      "魔界雾凇"
    ],
    "foods": [
      "朝鲜族烤肉",
      "温泉鸡蛋"
    ],
    "cumKm": 6415
  },
  {
    "id": 28,
    "name": "珲春",
    "lon": 130.37,
    "lat": 42.86,
    "segKm": 411,
    "road": "G331国道",
    "province": "吉林",
    "spots": [
      "防川一眼望三国"
    ],
    "foods": [
      "珲春大串",
      "帝王蟹"
    ],
    "cumKm": 6826
  },
  {
    "id": 29,
    "name": "绥芬河",
    "lon": 131.16,
    "lat": 44.42,
    "segKm": 265,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "国门景区",
      "俄式建筑群"
    ],
    "foods": [
      "俄式列巴",
      "红肠"
    ],
    "cumKm": 7091
  },
  {
    "id": 30,
    "name": "虎林",
    "lon": 132.94,
    "lat": 45.77,
    "segKm": 305,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "珍宝岛",
      "虎头要塞"
    ],
    "foods": [
      "乌苏里江鱼宴"
    ],
    "cumKm": 7396
  },
  {
    "id": 31,
    "name": "抚远",
    "lon": 134.29,
    "lat": 48.36,
    "segKm": 405,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "东极广场",
      "黑瞎子岛"
    ],
    "foods": [
      "大马哈鱼",
      "鲟鳇鱼"
    ],
    "cumKm": 7801
  },
  {
    "id": 32,
    "name": "嘉荫",
    "lon": 130.4,
    "lat": 48.89,
    "segKm": 465,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "恐龙地质公园",
      "茅兰沟"
    ],
    "foods": [
      "黑龙江江鱼",
      "山野菜"
    ],
    "cumKm": 8266
  },
  {
    "id": 33,
    "name": "黑河",
    "lon": 127.53,
    "lat": 50.25,
    "segKm": 385,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "瑷珲历史陈列馆",
      "大黑河岛"
    ],
    "foods": [
      "俄式西餐",
      "五大连池矿泉鱼"
    ],
    "cumKm": 8651
  },
  {
    "id": 34,
    "name": "漠河北极村",
    "lon": 122.54,
    "lat": 53.48,
    "segKm": 635,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "北极村",
      "龙江第一湾"
    ],
    "foods": [
      "铁锅炖",
      "蓝莓果干"
    ],
    "cumKm": 9286
  },
  {
    "id": 35,
    "name": "满归",
    "lon": 122.06,
    "lat": 52.03,
    "segKm": 160,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "伊克萨玛森林公园"
    ],
    "foods": [
      "驯鹿奶列巴",
      "林区炖菜"
    ],
    "cumKm": 9446
  },
  {
    "id": 36,
    "name": "室韦",
    "lon": 119.9,
    "lat": 51.34,
    "segKm": 305,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "室韦俄罗斯民族乡",
      "界河"
    ],
    "foods": [
      "俄式家庭餐",
      "蓝莓酱"
    ],
    "cumKm": 9751
  },
  {
    "id": 37,
    "name": "满洲里",
    "lon": 117.38,
    "lat": 49.6,
    "segKm": 425,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "国门景区",
      "套娃广场"
    ],
    "foods": [
      "俄式西餐",
      "手把肉"
    ],
    "cumKm": 10176
  },
  {
    "id": 38,
    "name": "阿尔山",
    "lon": 119.94,
    "lat": 47.18,
    "segKm": 435,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "阿尔山天池",
      "杜鹃湖"
    ],
    "foods": [
      "林区蘑菇",
      "泉水炖鱼"
    ],
    "cumKm": 10611
  },
  {
    "id": 39,
    "name": "二连浩特",
    "lon": 111.98,
    "lat": 43.65,
    "segKm": 870,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "国门",
      "恐龙故里"
    ],
    "foods": [
      "蒙餐手把肉",
      "奶茶锅茶"
    ],
    "cumKm": 11481
  },
  {
    "id": 40,
    "name": "额济纳旗",
    "lon": 101.07,
    "lat": 41.96,
    "segKm": 1225,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "胡杨林",
      "黑水城"
    ],
    "foods": [
      "驼肉馅饼",
      "居延蜜瓜"
    ],
    "cumKm": 12706
  },
  {
    "id": 41,
    "name": "哈密",
    "lon": 93.51,
    "lat": 42.83,
    "segKm": 1105,
    "road": "G331国道",
    "province": "新疆",
    "spots": [
      "哈密回王府",
      "魔鬼城"
    ],
    "foods": [
      "哈密瓜",
      "大盘鸡"
    ],
    "cumKm": 13811
  },
  {
    "id": 42,
    "name": "巴里坤",
    "lon": 93.02,
    "lat": 43.6,
    "segKm": 145,
    "road": "G331国道",
    "province": "新疆",
    "spots": [
      "巴里坤草原",
      "古城"
    ],
    "foods": [
      "羊肉焖饼子",
      "油酥馍"
    ],
    "cumKm": 13956
  },
  {
    "id": 43,
    "name": "富蕴",
    "lon": 89.53,
    "lat": 47.0,
    "segKm": 645,
    "road": "G331国道",
    "province": "新疆",
    "spots": [
      "可可托海",
      "三号矿坑"
    ],
    "foods": [
      "额河冷水鱼",
      "哈萨克奶茶"
    ],
    "cumKm": 14601
  },
  {
    "id": 44,
    "name": "哈巴河",
    "lon": 86.42,
    "lat": 48.06,
    "segKm": 615,
    "road": "G331终点·转G219",
    "province": "新疆",
    "spots": [
      "白哈巴村",
      "白沙湖"
    ],
    "foods": [
      "喀纳斯冷水鱼",
      "奶疙瘩"
    ],
    "cumKm": 15216
  },
  {
    "id": 45,
    "name": "喀纳斯",
    "lon": 87.02,
    "lat": 48.7,
    "segKm": 120,
    "road": "G219起点",
    "province": "新疆",
    "spots": [
      "喀纳斯湖",
      "禾木村"
    ],
    "foods": [
      "图瓦人奶酒",
      "烤全羊"
    ],
    "cumKm": 15336
  },
  {
    "id": 46,
    "name": "吉木乃",
    "lon": 85.88,
    "lat": 47.43,
    "segKm": 210,
    "road": "G219国道",
    "province": "新疆",
    "spots": [
      "草原石城",
      "吉木乃口岸"
    ],
    "foods": [
      "风干肉",
      "包尔萨克"
    ],
    "cumKm": 15546
  },
  {
    "id": 47,
    "name": "塔城",
    "lon": 82.98,
    "lat": 46.75,
    "segKm": 385,
    "road": "G219国道",
    "province": "新疆",
    "spots": [
      "巴克图口岸",
      "塔尔巴哈台山"
    ],
    "foods": [
      "塔城冰淇淋",
      "玛洛什"
    ],
    "cumKm": 15931
  },
  {
    "id": 48,
    "name": "阿拉山口",
    "lon": 82.57,
    "lat": 45.17,
    "segKm": 325,
    "road": "G219国道",
    "province": "新疆",
    "spots": [
      "阿拉山口国门",
      "艾比湖"
    ],
    "foods": [
      "新疆拌面",
      "烤包子"
    ],
    "cumKm": 16256
  },
  {
    "id": 49,
    "name": "霍尔果斯",
    "lon": 80.42,
    "lat": 44.21,
    "segKm": 295,
    "road": "G219国道",
    "province": "新疆",
    "spots": [
      "霍尔果斯国门",
      "薰衣草庄园"
    ],
    "foods": [
      "伊犁马肠子",
      "熏马肉"
    ],
    "cumKm": 16551
  },
  {
    "id": 50,
    "name": "昭苏",
    "lon": 81.13,
    "lat": 43.16,
    "segKm": 285,
    "road": "G219国道",
    "province": "新疆",
    "spots": [
      "夏塔古道",
      "昭苏天马"
    ],
    "foods": [
      "昭苏油菜花海",
      "手抓肉"
    ],
    "cumKm": 16836
  },
  {
    "id": 51,
    "name": "阿克苏",
    "lon": 80.26,
    "lat": 41.17,
    "segKm": 625,
    "road": "G219国道",
    "province": "新疆",
    "spots": [
      "天山神秘大峡谷",
      "克孜尔千佛洞"
    ],
    "foods": [
      "阿克苏冰糖心苹果",
      "馕坑肉"
    ],
    "cumKm": 17461
  },
  {
    "id": 52,
    "name": "喀什",
    "lon": 75.99,
    "lat": 39.47,
    "segKm": 505,
    "road": "G219国道",
    "province": "新疆",
    "spots": [
      "喀什古城",
      "艾提尕尔清真寺"
    ],
    "foods": [
      "烤全羊",
      "石榴汁"
    ],
    "cumKm": 17966
  },
  {
    "id": 53,
    "name": "叶城",
    "lon": 77.41,
    "lat": 37.88,
    "segKm": 255,
    "road": "G219国道·新藏线零公里",
    "province": "新疆",
    "spots": [
      "新藏线零公里碑",
      "宗朗灵泉"
    ],
    "foods": [
      "叶城核桃",
      "烤蛋"
    ],
    "cumKm": 18221
  },
  {
    "id": 54,
    "name": "三十里营房",
    "lon": 78.06,
    "lat": 36.42,
    "segKm": 370,
    "road": "G219国道·新藏线",
    "province": "新疆",
    "spots": [
      "界山达坂",
      "班公湖东岸"
    ],
    "foods": [
      "高原路餐",
      "牦牛肉干"
    ],
    "cumKm": 18591
  },
  {
    "id": 55,
    "name": "日土",
    "lon": 79.65,
    "lat": 33.4,
    "segKm": 485,
    "road": "G219国道·新藏线",
    "province": "西藏",
    "spots": [
      "班公湖",
      "日土岩画"
    ],
    "foods": [
      "藏式牦牛肉",
      "酥油茶"
    ],
    "cumKm": 19076
  },
  {
    "id": 56,
    "name": "狮泉河",
    "lon": 80.1,
    "lat": 32.5,
    "segKm": 140,
    "road": "G219国道",
    "province": "西藏",
    "spots": [
      "阿里暗夜公园",
      "狮泉河镇"
    ],
    "foods": [
      "藏餐",
      "甜茶"
    ],
    "cumKm": 19216
  },
  {
    "id": 57,
    "name": "塔尔钦",
    "lon": 81.31,
    "lat": 31.03,
    "segKm": 345,
    "road": "G219国道",
    "province": "西藏",
    "spots": [
      "冈仁波齐",
      "玛旁雍措"
    ],
    "foods": [
      "藏面",
      "风干牦牛肉"
    ],
    "cumKm": 19561
  },
  {
    "id": 58,
    "name": "萨嘎",
    "lon": 85.23,
    "lat": 29.33,
    "segKm": 555,
    "road": "G219国道",
    "province": "西藏",
    "spots": [
      "佩枯措",
      "希夏邦马峰"
    ],
    "foods": [
      "藏式包子",
      "青稞酒"
    ],
    "cumKm": 20116
  },
  {
    "id": 59,
    "name": "定日",
    "lon": 87.12,
    "lat": 28.66,
    "segKm": 300,
    "road": "G219国道",
    "province": "西藏",
    "spots": [
      "珠穆朗玛峰大本营",
      "绒布寺"
    ],
    "foods": [
      "高原酥油茶",
      "糌粑"
    ],
    "cumKm": 20416
  },
  {
    "id": 60,
    "name": "康马",
    "lon": 89.68,
    "lat": 28.56,
    "segKm": 335,
    "road": "G219国道",
    "province": "西藏",
    "spots": [
      "多情措",
      "卓木拉日雪山"
    ],
    "foods": [
      "藏香猪",
      "酥油人参果"
    ],
    "cumKm": 20751
  },
  {
    "id": 61,
    "name": "洛扎",
    "lon": 90.86,
    "lat": 28.39,
    "segKm": 165,
    "road": "G219国道",
    "province": "西藏",
    "spots": [
      "库拉岗日",
      "赛卡古托寺"
    ],
    "foods": [
      "洛扎藏鸡蛋",
      "土豆包子"
    ],
    "cumKm": 20916
  },
  {
    "id": 62,
    "name": "错那",
    "lon": 91.96,
    "lat": 27.99,
    "segKm": 265,
    "road": "G219国道",
    "province": "西藏",
    "spots": [
      "勒布沟",
      "拿日雍措"
    ],
    "foods": [
      "门巴族荞麦饼",
      "鸡爪谷酒"
    ],
    "cumKm": 21181
  },
  {
    "id": 63,
    "name": "米林",
    "lon": 94.21,
    "lat": 29.22,
    "segKm": 495,
    "road": "G219国道",
    "province": "西藏",
    "spots": [
      "雅鲁藏布大峡谷",
      "南迦巴瓦峰"
    ],
    "foods": [
      "林芝石锅鸡",
      "松茸"
    ],
    "cumKm": 21676
  },
  {
    "id": 64,
    "name": "察隅",
    "lon": 97.47,
    "lat": 28.66,
    "segKm": 515,
    "road": "G219国道",
    "province": "西藏",
    "spots": [
      "然乌湖",
      "来古冰川"
    ],
    "foods": [
      "察隅手抓饭",
      "藏香猪"
    ],
    "cumKm": 22191
  },
  {
    "id": 65,
    "name": "丙中洛",
    "lon": 98.62,
    "lat": 28.01,
    "segKm": 315,
    "road": "G219国道·丙察察",
    "province": "云南",
    "spots": [
      "怒江第一湾",
      "雾里村"
    ],
    "foods": [
      "怒族石板粑粑",
      "漆油鸡"
    ],
    "cumKm": 22506
  },
  {
    "id": 66,
    "name": "腾冲",
    "lon": 98.49,
    "lat": 25.02,
    "segKm": 465,
    "road": "G219国道",
    "province": "云南",
    "spots": [
      "和顺古镇",
      "热海温泉"
    ],
    "foods": [
      "腾冲大救驾",
      "土锅子"
    ],
    "cumKm": 22971
  },
  {
    "id": 67,
    "name": "景洪",
    "lon": 100.8,
    "lat": 22.01,
    "segKm": 795,
    "road": "G219国道",
    "province": "云南",
    "spots": [
      "告庄西双景",
      "中科院植物园"
    ],
    "foods": [
      "傣味烧烤",
      "菠萝饭"
    ],
    "cumKm": 23766
  },
  {
    "id": 68,
    "name": "绿春",
    "lon": 102.39,
    "lat": 22.99,
    "segKm": 385,
    "road": "G219国道",
    "province": "云南",
    "spots": [
      "哈尼梯田",
      "黄连山"
    ],
    "foods": [
      "哈尼蘸水鸡",
      "竹筒饭"
    ],
    "cumKm": 24151
  },
  {
    "id": 69,
    "name": "麻栗坡",
    "lon": 104.7,
    "lat": 23.12,
    "segKm": 325,
    "road": "G219国道",
    "province": "云南",
    "spots": [
      "老山",
      "天保口岸"
    ],
    "foods": [
      "壮家花米饭",
      "草果炖鸡"
    ],
    "cumKm": 24476
  },
  {
    "id": 70,
    "name": "凭祥",
    "lon": 106.77,
    "lat": 22.1,
    "segKm": 495,
    "road": "G219国道",
    "province": "广西",
    "spots": [
      "友谊关",
      "浦寨边贸城"
    ],
    "foods": [
      "越南卷粉",
      "凭祥水果捞"
    ],
    "cumKm": 24971
  },
  {
    "id": 71,
    "name": "东兴",
    "lon": 107.97,
    "lat": 21.55,
    "segKm": 295,
    "road": "G219终点·转G228",
    "province": "广西",
    "spots": [
      "东兴国门",
      "金滩"
    ],
    "foods": [
      "东兴海鲜",
      "越南春卷"
    ],
    "cumKm": 25266
  },
  {
    "id": 72,
    "name": "钦州",
    "lon": 108.65,
    "lat": 21.98,
    "segKm": 185,
    "road": "G228国道",
    "province": "广西",
    "spots": [
      "三娘湾",
      "八寨沟"
    ],
    "foods": [
      "钦州大蚝",
      "猪脚粉"
    ],
    "cumKm": 25451
  },
  {
    "id": 73,
    "name": "北海",
    "lon": 109.12,
    "lat": 21.48,
    "segKm": 200,
    "road": "G228国道",
    "province": "广西",
    "spots": [
      "银滩",
      "涠洲岛"
    ],
    "foods": [
      "北海海鲜",
      "糖水"
    ],
    "cumKm": 25651
  },
  {
    "id": 74,
    "name": "湛江",
    "lon": 110.36,
    "lat": 21.27,
    "segKm": 310,
    "road": "G228国道",
    "province": "广东",
    "spots": [
      "湖光岩",
      "金沙湾"
    ],
    "foods": [
      "湛江生蚝",
      "白切鸡"
    ],
    "cumKm": 25961
  },
  {
    "id": 75,
    "name": "阳江",
    "lon": 111.98,
    "lat": 21.86,
    "segKm": 405,
    "road": "G228国道",
    "province": "广东",
    "spots": [
      "海陵岛",
      "大角湾"
    ],
    "foods": [
      "阳江豆豉",
      "猪肠碌"
    ],
    "cumKm": 26366
  },
  {
    "id": 76,
    "name": "珠海",
    "lon": 113.58,
    "lat": 22.27,
    "segKm": 480,
    "road": "G228国道",
    "province": "广东",
    "spots": [
      "情侣路",
      "长隆海洋王国"
    ],
    "foods": [
      "横琴蚝",
      "斗门重壳蟹"
    ],
    "cumKm": 26846
  },
  {
    "id": 77,
    "name": "深圳·终点",
    "lon": 114.06,
    "lat": 22.54,
    "segKm": 345,
    "road": "G228国道·闭环",
    "province": "广东",
    "spots": [
      "深圳湾公园",
      "梧桐山"
    ],
    "foods": [
      "椰子鸡",
      "光明乳鸽"
    ],
    "cumKm": 27191
  }
]
};

// ---- 路线计算（1:1，真实公里 = 地图公里） ----
export function positionAt(km: number): { node: RouteNode; next: RouteNode; segProgress: number; lon: number; lat: number } {
  const nodes = CHINA_LOOP_PACK.nodes;
  const d = ((km % CHINA_LOOP_PACK.totalKm) + CHINA_LOOP_PACK.totalKm) % CHINA_LOOP_PACK.totalKm;
  let prev = nodes[0];
  for (let i = 1; i < nodes.length; i++) {
    const cur = nodes[i];
    if (d <= cur.cumKm) {
      const segStart = cur.cumKm - cur.segKm;
      const p = cur.segKm === 0 ? 0 : (d - segStart) / cur.segKm;
      return {
        node: prev, next: cur, segProgress: p,
        lon: prev.lon + (cur.lon - prev.lon) * p,
        lat: prev.lat + (cur.lat - prev.lat) * p,
      };
    }
    prev = cur;
  }
  const last = nodes[nodes.length - 1];
  return { node: last, next: last, segProgress: 1, lon: last.lon, lat: last.lat };
}

export function nearestNode(lon: number, lat: number): RouteNode {
  let best = CHINA_LOOP_PACK.nodes[0], bd = Infinity;
  for (const n of CHINA_LOOP_PACK.nodes) {
    const d = (n.lon - lon) ** 2 + (n.lat - lat) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
