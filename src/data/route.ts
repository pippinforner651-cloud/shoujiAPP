// ============================================================
// E23跑起来 · 环中国边境线接力路线主数据（冻结）
// 标准环中国自驾环线：北大汇丰商学院（深圳）楼下出发
//   → G228沿海北上 → 丹东 → G331沿边境 → 哈巴河/喀纳斯
//   → G219新藏滇藏线 → 东兴 → G228返回北大汇丰楼下闭环
// 总里程 27171 公里（≥27,000km 要求），跑量 1:1 同步，不做虚拟放大
// 线路已逐段校验：全程贴合真实国界线与海岸线（v2.2 边界描点）
// 数据结构即"地图包"接口：未来全球跑/导入第三方地图遵循同一格式
// ============================================================

export interface RouteNode {
  id: number;
  name: string;        // 空字符串 = 边界途经点（不渲染圆点、不可点击）
  lon: number; lat: number;
  segKm: number;
  road: string;
  province: string;
  spots: string[];
  foods: string[];
  cumKm: number;
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
  version: "2.2.0",
  totalKm: 27171,
  loop: true,
  nodes: [
  {
    "id": 0,
    "name": "北大汇丰商学院",
    "lon": 113.97,
    "lat": 22.6,
    "segKm": 0,
    "road": "起点·北大汇丰楼下→G228国道",
    "province": "广东",
    "spots": [
      "深圳大学城",
      "西丽湖"
    ],
    "foods": [
      "校园食堂",
      "南山荔枝"
    ],
    "cumKm": 0
  },
  {
    "id": 1,
    "name": "惠州",
    "lon": 114.42,
    "lat": 23.1,
    "segKm": 110,
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
    "cumKm": 110
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
    "cumKm": 270
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
    "cumKm": 485
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
    "cumKm": 790
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
    "cumKm": 915
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
    "cumKm": 1135
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
    "cumKm": 1270
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
    "cumKm": 1575
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
    "cumKm": 1735
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
    "cumKm": 1970
  },
  {
    "id": 11,
    "name": "杭州",
    "lon": 120.16,
    "lat": 30.25,
    "segKm": 155,
    "road": "G228国道",
    "province": "浙江",
    "spots": [
      "西湖",
      "灵隐寺"
    ],
    "foods": [
      "东坡肉",
      "片儿川"
    ],
    "cumKm": 2125
  },
  {
    "id": 12,
    "name": "上海",
    "lon": 121.47,
    "lat": 31.23,
    "segKm": 190,
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
    "cumKm": 2315
  },
  {
    "id": 13,
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
    "cumKm": 2475
  },
  {
    "id": 14,
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
    "cumKm": 2670
  },
  {
    "id": 15,
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
    "cumKm": 2895
  },
  {
    "id": 16,
    "name": "赣榆",
    "lon": 119.13,
    "lat": 34.84,
    "segKm": 40,
    "road": "G228国道",
    "province": "江苏",
    "spots": [
      "秦山岛",
      "抗日山"
    ],
    "foods": [
      "赣榆煎饼",
      "梭子蟹"
    ],
    "cumKm": 2935
  },
  {
    "id": 17,
    "name": "日照",
    "lon": 119.53,
    "lat": 35.42,
    "segKm": 110,
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
    "cumKm": 3045
  },
  {
    "id": 18,
    "name": "黄岛",
    "lon": 120.05,
    "lat": 35.95,
    "segKm": 110,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "金沙滩",
      "琅琊台"
    ],
    "foods": [
      "海菜凉粉",
      "泊里西施舌"
    ],
    "cumKm": 3155
  },
  {
    "id": 19,
    "name": "青岛",
    "lon": 120.38,
    "lat": 36.07,
    "segKm": 45,
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
    "cumKm": 3200
  },
  {
    "id": 20,
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
    "cumKm": 3480
  },
  {
    "id": 21,
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
    "cumKm": 3585
  },
  {
    "id": 22,
    "name": "",
    "lon": 121.98,
    "lat": 37.49,
    "segKm": 15,
    "road": "G228国道",
    "province": "山东",
    "spots": [],
    "foods": [],
    "cumKm": 3600
  },
  {
    "id": 23,
    "name": "",
    "lon": 121.7,
    "lat": 37.47,
    "segKm": 30,
    "road": "G228国道",
    "province": "山东",
    "spots": [],
    "foods": [],
    "cumKm": 3630
  },
  {
    "id": 24,
    "name": "",
    "lon": 121.47,
    "lat": 37.49,
    "segKm": 25,
    "road": "G228国道",
    "province": "山东",
    "spots": [],
    "foods": [],
    "cumKm": 3655
  },
  {
    "id": 25,
    "name": "",
    "lon": 121.35,
    "lat": 37.62,
    "segKm": 20,
    "road": "G228国道",
    "province": "山东",
    "spots": [],
    "foods": [],
    "cumKm": 3675
  },
  {
    "id": 26,
    "name": "",
    "lon": 121.16,
    "lat": 37.65,
    "segKm": 20,
    "road": "G228国道",
    "province": "山东",
    "spots": [],
    "foods": [],
    "cumKm": 3695
  },
  {
    "id": 27,
    "name": "",
    "lon": 120.97,
    "lat": 37.77,
    "segKm": 25,
    "road": "G228国道",
    "province": "山东",
    "spots": [],
    "foods": [],
    "cumKm": 3720
  },
  {
    "id": 28,
    "name": "蓬莱",
    "lon": 120.76,
    "lat": 37.81,
    "segKm": 30,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "蓬莱阁",
      "八仙过海"
    ],
    "foods": [
      "蓬莱小面",
      "鲅鱼水饺"
    ],
    "cumKm": 3750
  },
  {
    "id": 29,
    "name": "龙口",
    "lon": 120.35,
    "lat": 37.65,
    "segKm": 50,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "南山大佛",
      "屺姆岛"
    ],
    "foods": [
      "龙口粉丝",
      "黄县肉盒"
    ],
    "cumKm": 3800
  },
  {
    "id": 30,
    "name": "莱州",
    "lon": 119.93,
    "lat": 37.18,
    "segKm": 75,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "云峰山",
      "莱州湾湿地"
    ],
    "foods": [
      "莱州梭子蟹",
      "羊汤"
    ],
    "cumKm": 3875
  },
  {
    "id": 31,
    "name": "昌邑",
    "lon": 119.4,
    "lat": 36.85,
    "segKm": 55,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "绿博园",
      "潍河湿地"
    ],
    "foods": [
      "昌邑梭子蟹",
      "热合菜"
    ],
    "cumKm": 3930
  },
  {
    "id": 32,
    "name": "寿光",
    "lon": 118.74,
    "lat": 36.88,
    "segKm": 40,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "蔬菜博览园",
      "弥河湿地"
    ],
    "foods": [
      "寿光蔬菜",
      "羊口咸蟹子"
    ],
    "cumKm": 3970
  },
  {
    "id": 33,
    "name": "东营",
    "lon": 118.67,
    "lat": 37.43,
    "segKm": 40,
    "road": "G228国道",
    "province": "山东",
    "spots": [
      "黄河入海口湿地"
    ],
    "foods": [
      "黄河口大闸蟹",
      "利津水煎包"
    ],
    "cumKm": 4010
  },
  {
    "id": 34,
    "name": "黄骅",
    "lon": 117.33,
    "lat": 38.37,
    "segKm": 225,
    "road": "G228国道",
    "province": "河北",
    "spots": [
      "聚馆古贡枣园",
      "贝壳堤"
    ],
    "foods": [
      "黄骅冬枣",
      "虾酱"
    ],
    "cumKm": 4235
  },
  {
    "id": 35,
    "name": "天津",
    "lon": 117.2,
    "lat": 39.09,
    "segKm": 115,
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
    "cumKm": 4350
  },
  {
    "id": 36,
    "name": "唐山",
    "lon": 118.18,
    "lat": 39.63,
    "segKm": 140,
    "road": "G228国道",
    "province": "河北",
    "spots": [
      "清东陵",
      "南湖公园"
    ],
    "foods": [
      "棋子烧饼",
      "蜂蜜麻糖"
    ],
    "cumKm": 4490
  },
  {
    "id": 37,
    "name": "秦皇岛",
    "lon": 119.6,
    "lat": 39.94,
    "segKm": 175,
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
    "cumKm": 4665
  },
  {
    "id": 38,
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
    "cumKm": 4855
  },
  {
    "id": 39,
    "name": "锦州",
    "lon": 121.13,
    "lat": 41.1,
    "segKm": 65,
    "road": "G228国道",
    "province": "辽宁",
    "spots": [
      "笔架山",
      "辽沈战役纪念馆"
    ],
    "foods": [
      "锦州烧烤",
      "沟帮子熏鸡"
    ],
    "cumKm": 4920
  },
  {
    "id": 40,
    "name": "盘锦",
    "lon": 122.07,
    "lat": 41.12,
    "segKm": 90,
    "road": "G228国道",
    "province": "辽宁",
    "spots": [
      "红海滩",
      "苇海"
    ],
    "foods": [
      "盘锦河蟹",
      "盘锦大米"
    ],
    "cumKm": 5010
  },
  {
    "id": 41,
    "name": "营口",
    "lon": 122.24,
    "lat": 40.67,
    "segKm": 55,
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
    "cumKm": 5065
  },
  {
    "id": 42,
    "name": "瓦房店",
    "lon": 121.98,
    "lat": 39.63,
    "segKm": 155,
    "road": "G228国道",
    "province": "辽宁",
    "spots": [
      "仙浴湾",
      "复州古城"
    ],
    "foods": [
      "瓦房店苹果",
      "虾皮"
    ],
    "cumKm": 5220
  },
  {
    "id": 43,
    "name": "大连",
    "lon": 121.61,
    "lat": 38.91,
    "segKm": 115,
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
    "cumKm": 5335
  },
  {
    "id": 44,
    "name": "金州",
    "lon": 121.72,
    "lat": 39.05,
    "segKm": 25,
    "road": "G228国道",
    "province": "辽宁",
    "spots": [
      "金石滩",
      "大黑山"
    ],
    "foods": [
      "金州海蛎子",
      "烤鱼片"
    ],
    "cumKm": 5360
  },
  {
    "id": 45,
    "name": "庄河",
    "lon": 122.97,
    "lat": 39.7,
    "segKm": 165,
    "road": "G228国道",
    "province": "辽宁",
    "spots": [
      "冰峪沟",
      "海王九岛"
    ],
    "foods": [
      "庄河大骨鸡",
      "杂色蛤"
    ],
    "cumKm": 5525
  },
  {
    "id": 46,
    "name": "丹东",
    "lon": 124.39,
    "lat": 40.13,
    "segKm": 175,
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
    "cumKm": 5700
  },
  {
    "id": 47,
    "name": "宽甸",
    "lon": 124.78,
    "lat": 40.73,
    "segKm": 125,
    "road": "G331国道",
    "province": "辽宁",
    "spots": [
      "天桥沟",
      "河口景区"
    ],
    "foods": [
      "宽甸酸汤子",
      "板栗"
    ],
    "cumKm": 5825
  },
  {
    "id": 48,
    "name": "集安",
    "lon": 126.19,
    "lat": 41.13,
    "segKm": 220,
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
    "cumKm": 6045
  },
  {
    "id": 49,
    "name": "苇沙河",
    "lon": 126.58,
    "lat": 41.58,
    "segKm": 95,
    "road": "G331国道",
    "province": "吉林",
    "spots": [
      "鸭绿江国境风光"
    ],
    "foods": [
      "鸭绿江鱼",
      "朝鲜族泡菜"
    ],
    "cumKm": 6140
  },
  {
    "id": 50,
    "name": "临江",
    "lon": 126.92,
    "lat": 41.81,
    "segKm": 65,
    "road": "G331国道",
    "province": "吉林",
    "spots": [
      "江心岛公园",
      "四保临江纪念馆"
    ],
    "foods": [
      "临江板栗",
      "蝲蛄豆腐"
    ],
    "cumKm": 6205
  },
  {
    "id": 51,
    "name": "二道白河",
    "lon": 128.12,
    "lat": 42.42,
    "segKm": 205,
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
    "cumKm": 6410
  },
  {
    "id": 52,
    "name": "图们",
    "lon": 129.85,
    "lat": 42.97,
    "segKm": 320,
    "road": "G331国道",
    "province": "吉林",
    "spots": [
      "图们江国门",
      "日光山"
    ],
    "foods": [
      "图们江鱼",
      "辣白菜"
    ],
    "cumKm": 6730
  },
  {
    "id": 53,
    "name": "凉水",
    "lon": 129.98,
    "lat": 43.02,
    "segKm": 25,
    "road": "G331国道",
    "province": "吉林",
    "spots": [
      "图们江湿地",
      "凉水断桥"
    ],
    "foods": [
      "图们江鱼",
      "米肠"
    ],
    "cumKm": 6755
  },
  {
    "id": 54,
    "name": "",
    "lon": 130.0,
    "lat": 42.98,
    "segKm": 5,
    "road": "G331国道",
    "province": "吉林",
    "spots": [],
    "foods": [],
    "cumKm": 6760
  },
  {
    "id": 55,
    "name": "",
    "lon": 130.07,
    "lat": 42.97,
    "segKm": 10,
    "road": "G331国道",
    "province": "吉林",
    "spots": [],
    "foods": [],
    "cumKm": 6770
  },
  {
    "id": 56,
    "name": "",
    "lon": 130.13,
    "lat": 42.98,
    "segKm": 10,
    "road": "G331国道",
    "province": "吉林",
    "spots": [],
    "foods": [],
    "cumKm": 6780
  },
  {
    "id": 57,
    "name": "",
    "lon": 130.12,
    "lat": 42.93,
    "segKm": 10,
    "road": "G331国道",
    "province": "吉林",
    "spots": [],
    "foods": [],
    "cumKm": 6790
  },
  {
    "id": 58,
    "name": "",
    "lon": 130.14,
    "lat": 42.91,
    "segKm": 5,
    "road": "G331国道",
    "province": "吉林",
    "spots": [],
    "foods": [],
    "cumKm": 6795
  },
  {
    "id": 59,
    "name": "",
    "lon": 130.21,
    "lat": 42.9,
    "segKm": 10,
    "road": "G331国道",
    "province": "吉林",
    "spots": [],
    "foods": [],
    "cumKm": 6805
  },
  {
    "id": 60,
    "name": "珲春",
    "lon": 130.37,
    "lat": 42.86,
    "segKm": 16,
    "road": "G331国道",
    "province": "吉林",
    "spots": [
      "防川一眼望三国"
    ],
    "foods": [
      "珲春大串",
      "帝王蟹"
    ],
    "cumKm": 6821
  },
  {
    "id": 61,
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
    "cumKm": 7086
  },
  {
    "id": 62,
    "name": "鸡西",
    "lon": 130.97,
    "lat": 45.3,
    "segKm": 105,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "兴凯湖",
      "蜂蜜山"
    ],
    "foods": [
      "鸡西冷面",
      "辣菜"
    ],
    "cumKm": 7191
  },
  {
    "id": 63,
    "name": "虎林",
    "lon": 132.94,
    "lat": 45.77,
    "segKm": 200,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "珍宝岛",
      "虎头要塞"
    ],
    "foods": [
      "乌苏里江鱼宴"
    ],
    "cumKm": 7391
  },
  {
    "id": 64,
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
    "cumKm": 7796
  },
  {
    "id": 65,
    "name": "同江",
    "lon": 132.51,
    "lat": 47.65,
    "segKm": 200,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "三江口",
      "街津口赫哲族乡"
    ],
    "foods": [
      "大马哈鱼",
      "赫哲鱼宴"
    ],
    "cumKm": 7996
  },
  {
    "id": 66,
    "name": "萝北",
    "lon": 130.83,
    "lat": 47.58,
    "segKm": 135,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "名山岛",
      "太平沟"
    ],
    "foods": [
      "萝北江鱼",
      "红小豆"
    ],
    "cumKm": 8131
  },
  {
    "id": 67,
    "name": "嘉荫",
    "lon": 130.4,
    "lat": 48.89,
    "segKm": 130,
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
    "cumKm": 8261
  },
  {
    "id": 68,
    "name": "",
    "lon": 130.34,
    "lat": 48.88,
    "segKm": 5,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8266
  },
  {
    "id": 69,
    "name": "",
    "lon": 130.26,
    "lat": 48.87,
    "segKm": 10,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8276
  },
  {
    "id": 70,
    "name": "",
    "lon": 130.2,
    "lat": 48.9,
    "segKm": 10,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8286
  },
  {
    "id": 71,
    "name": "",
    "lon": 130.14,
    "lat": 48.94,
    "segKm": 10,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8296
  },
  {
    "id": 72,
    "name": "",
    "lon": 130.07,
    "lat": 48.98,
    "segKm": 10,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8306
  },
  {
    "id": 73,
    "name": "",
    "lon": 130.01,
    "lat": 49.02,
    "segKm": 10,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8316
  },
  {
    "id": 74,
    "name": "乌云",
    "lon": 129.95,
    "lat": 49.02,
    "segKm": 0,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "黑龙江畔风光"
    ],
    "foods": [
      "江鱼",
      "山野菜"
    ],
    "cumKm": 8316
  },
  {
    "id": 75,
    "name": "逊克",
    "lon": 128.42,
    "lat": 49.58,
    "segKm": 190,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "库尔滨河雾凇",
      "宝山玛瑙"
    ],
    "foods": [
      "逊克江鱼",
      "山野菜"
    ],
    "cumKm": 8506
  },
  {
    "id": 76,
    "name": "孙吴",
    "lon": 127.33,
    "lat": 49.42,
    "segKm": 70,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "胜山要塞",
      "逊别拉河"
    ],
    "foods": [
      "孙吴江鱼",
      "木耳"
    ],
    "cumKm": 8576
  },
  {
    "id": 77,
    "name": "黑河",
    "lon": 127.53,
    "lat": 50.25,
    "segKm": 70,
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
    "cumKm": 8646
  },
  {
    "id": 78,
    "name": "",
    "lon": 127.37,
    "lat": 50.4,
    "segKm": 20,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8666
  },
  {
    "id": 79,
    "name": "",
    "lon": 127.3,
    "lat": 50.66,
    "segKm": 25,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8691
  },
  {
    "id": 80,
    "name": "",
    "lon": 127.11,
    "lat": 50.94,
    "segKm": 30,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8721
  },
  {
    "id": 81,
    "name": "",
    "lon": 126.9,
    "lat": 51.2,
    "segKm": 30,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8751
  },
  {
    "id": 82,
    "name": "",
    "lon": 126.9,
    "lat": 51.25,
    "segKm": 5,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8756
  },
  {
    "id": 83,
    "name": "",
    "lon": 126.85,
    "lat": 51.41,
    "segKm": 15,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [],
    "foods": [],
    "cumKm": 8771
  },
  {
    "id": 84,
    "name": "白银纳",
    "lon": 126.45,
    "lat": 51.45,
    "segKm": 30,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "鄂伦春民族乡",
      "黑龙江畔"
    ],
    "foods": [
      "江鱼",
      "蓝莓"
    ],
    "cumKm": 8801
  },
  {
    "id": 85,
    "name": "呼玛",
    "lon": 126.65,
    "lat": 51.73,
    "segKm": 35,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "呼玛河口",
      "鹿鼎山"
    ],
    "foods": [
      "呼玛江鱼",
      "蓝莓"
    ],
    "cumKm": 8836
  },
  {
    "id": 86,
    "name": "塔河",
    "lon": 124.71,
    "lat": 52.33,
    "segKm": 200,
    "road": "G331国道",
    "province": "黑龙江",
    "spots": [
      "栖霞山",
      "固奇谷湿地"
    ],
    "foods": [
      "塔河蓝莓",
      "偃松子"
    ],
    "cumKm": 9036
  },
  {
    "id": 87,
    "name": "漠河北极村",
    "lon": 122.54,
    "lat": 53.48,
    "segKm": 245,
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
    "cumKm": 9281
  },
  {
    "id": 88,
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
    "cumKm": 9441
  },
  {
    "id": 89,
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
    "cumKm": 9746
  },
  {
    "id": 90,
    "name": "额尔古纳",
    "lon": 120.18,
    "lat": 50.24,
    "segKm": 135,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "额尔古纳湿地",
      "白桦林"
    ],
    "foods": [
      "俄式列巴",
      "蓝莓酱"
    ],
    "cumKm": 9881
  },
  {
    "id": 91,
    "name": "黑山头",
    "lon": 119.45,
    "lat": 50.65,
    "segKm": 75,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "黑山头古城遗址",
      "界河湿地"
    ],
    "foods": [
      "手把肉",
      "烤全羊"
    ],
    "cumKm": 9956
  },
  {
    "id": 92,
    "name": "",
    "lon": 119.39,
    "lat": 50.66,
    "segKm": 5,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 9961
  },
  {
    "id": 93,
    "name": "",
    "lon": 119.32,
    "lat": 50.62,
    "segKm": 5,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 9966
  },
  {
    "id": 94,
    "name": "",
    "lon": 119.29,
    "lat": 50.58,
    "segKm": 5,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 9971
  },
  {
    "id": 95,
    "name": "",
    "lon": 119.26,
    "lat": 50.51,
    "segKm": 5,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 9976
  },
  {
    "id": 96,
    "name": "",
    "lon": 119.24,
    "lat": 50.45,
    "segKm": 5,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 9981
  },
  {
    "id": 97,
    "name": "",
    "lon": 119.19,
    "lat": 50.42,
    "segKm": 5,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 9986
  },
  {
    "id": 98,
    "name": "五卡",
    "lon": 118.95,
    "lat": 50.35,
    "segKm": 25,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "边防卡线",
      "额尔古纳河"
    ],
    "foods": [
      "手把肉",
      "列巴"
    ],
    "cumKm": 10011
  },
  {
    "id": 99,
    "name": "",
    "lon": 119.38,
    "lat": 50.33,
    "segKm": 20,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10031
  },
  {
    "id": 100,
    "name": "",
    "lon": 119.28,
    "lat": 50.11,
    "segKm": 15,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10046
  },
  {
    "id": 101,
    "name": "",
    "lon": 119.01,
    "lat": 49.98,
    "segKm": 15,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10061
  },
  {
    "id": 102,
    "name": "",
    "lon": 118.68,
    "lat": 49.95,
    "segKm": 15,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10076
  },
  {
    "id": 103,
    "name": "",
    "lon": 118.41,
    "lat": 49.83,
    "segKm": 15,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10091
  },
  {
    "id": 104,
    "name": "",
    "lon": 118.17,
    "lat": 49.67,
    "segKm": 15,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10106
  },
  {
    "id": 105,
    "name": "二卡",
    "lon": 117.85,
    "lat": 49.65,
    "segKm": 25,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "二卡湿地",
      "界河风光"
    ],
    "foods": [
      "烤全羊",
      "奶茶"
    ],
    "cumKm": 10131
  },
  {
    "id": 106,
    "name": "",
    "lon": 117.78,
    "lat": 49.53,
    "segKm": 10,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10141
  },
  {
    "id": 107,
    "name": "",
    "lon": 117.65,
    "lat": 49.57,
    "segKm": 10,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10151
  },
  {
    "id": 108,
    "name": "",
    "lon": 117.53,
    "lat": 49.62,
    "segKm": 10,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10161
  },
  {
    "id": 109,
    "name": "",
    "lon": 117.41,
    "lat": 49.63,
    "segKm": 10,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10171
  },
  {
    "id": 110,
    "name": "满洲里",
    "lon": 117.38,
    "lat": 49.6,
    "segKm": 0,
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
    "cumKm": 10171
  },
  {
    "id": 111,
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
    "cumKm": 10606
  },
  {
    "id": 112,
    "name": "",
    "lon": 119.84,
    "lat": 46.97,
    "segKm": 20,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10626
  },
  {
    "id": 113,
    "name": "",
    "lon": 119.93,
    "lat": 46.9,
    "segKm": 10,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10636
  },
  {
    "id": 114,
    "name": "",
    "lon": 119.93,
    "lat": 46.79,
    "segKm": 10,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10646
  },
  {
    "id": 115,
    "name": "",
    "lon": 119.92,
    "lat": 46.68,
    "segKm": 10,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10656
  },
  {
    "id": 116,
    "name": "",
    "lon": 119.81,
    "lat": 46.68,
    "segKm": 10,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10666
  },
  {
    "id": 117,
    "name": "",
    "lon": 119.74,
    "lat": 46.61,
    "segKm": 10,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [],
    "foods": [],
    "cumKm": 10676
  },
  {
    "id": 118,
    "name": "宝格达山",
    "lon": 119.65,
    "lat": 46.6,
    "segKm": 0,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "宝格达山林场",
      "草原"
    ],
    "foods": [
      "手把肉",
      "奶豆腐"
    ],
    "cumKm": 10676
  },
  {
    "id": 119,
    "name": "满都胡宝拉格",
    "lon": 118.9,
    "lat": 46.2,
    "segKm": 80,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "草原戈壁",
      "边境风光"
    ],
    "foods": [
      "乌珠穆沁羊",
      "奶食品"
    ],
    "cumKm": 10756
  },
  {
    "id": 120,
    "name": "东乌珠穆沁旗",
    "lon": 116.97,
    "lat": 45.51,
    "segKm": 195,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "乌珠穆沁草原",
      "乃林郭勒"
    ],
    "foods": [
      "乌珠穆沁羊",
      "锅茶"
    ],
    "cumKm": 10951
  },
  {
    "id": 121,
    "name": "二连浩特",
    "lon": 111.98,
    "lat": 43.65,
    "segKm": 525,
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
    "cumKm": 11476
  },
  {
    "id": 122,
    "name": "满都拉",
    "lon": 110.08,
    "lat": 42.53,
    "segKm": 250,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "满都拉口岸",
      "戈壁草原"
    ],
    "foods": [
      "手把肉",
      "奶食品"
    ],
    "cumKm": 11726
  },
  {
    "id": 123,
    "name": "乌拉特中旗",
    "lon": 108.52,
    "lat": 41.57,
    "segKm": 200,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "甘其毛都口岸",
      "阴山岩画"
    ],
    "foods": [
      "乌拉特羊肉",
      "炒米"
    ],
    "cumKm": 11926
  },
  {
    "id": 124,
    "name": "乌力吉",
    "lon": 104.45,
    "lat": 41.35,
    "segKm": 420,
    "road": "G331国道",
    "province": "内蒙古",
    "spots": [
      "乌力吉口岸",
      "大漠戈壁"
    ],
    "foods": [
      "驼肉馅饼",
      "锁阳"
    ],
    "cumKm": 12346
  },
  {
    "id": 125,
    "name": "额济纳旗",
    "lon": 101.07,
    "lat": 41.96,
    "segKm": 355,
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
    "cumKm": 12701
  },
  {
    "id": 126,
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
    "cumKm": 13806
  },
  {
    "id": 127,
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
    "cumKm": 13951
  },
  {
    "id": 128,
    "name": "木垒",
    "lon": 90.28,
    "lat": 43.83,
    "segKm": 265,
    "road": "G331国道",
    "province": "新疆",
    "spots": [
      "木垒胡杨林",
      "鸣沙山"
    ],
    "foods": [
      "木垒羊肉",
      "鹰嘴豆"
    ],
    "cumKm": 14216
  },
  {
    "id": 129,
    "name": "青河",
    "lon": 90.38,
    "lat": 46.67,
    "segKm": 300,
    "road": "G331国道",
    "province": "新疆",
    "spots": [
      "三道海子",
      "青格里狼山"
    ],
    "foods": [
      "青河沙棘",
      "冷水鱼"
    ],
    "cumKm": 14516
  },
  {
    "id": 130,
    "name": "富蕴",
    "lon": 89.53,
    "lat": 47.0,
    "segKm": 80,
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
    "cumKm": 14596
  },
  {
    "id": 131,
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
    "cumKm": 15211
  },
  {
    "id": 132,
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
    "cumKm": 15331
  },
  {
    "id": 133,
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
    "cumKm": 15541
  },
  {
    "id": 134,
    "name": "和布克赛尔",
    "lon": 85.72,
    "lat": 46.79,
    "segKm": 85,
    "road": "G219国道",
    "province": "新疆",
    "spots": [
      "江格尔文化",
      "王爷府"
    ],
    "foods": [
      "手把肉",
      "奶酒"
    ],
    "cumKm": 15626
  },
  {
    "id": 135,
    "name": "托里",
    "lon": 83.6,
    "lat": 45.93,
    "segKm": 200,
    "road": "G219国道",
    "province": "新疆",
    "spots": [
      "巴尔鲁克山",
      "野果林"
    ],
    "foods": [
      "托里风干肉",
      "红花"
    ],
    "cumKm": 15826
  },
  {
    "id": 136,
    "name": "塔城",
    "lon": 82.98,
    "lat": 46.75,
    "segKm": 100,
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
    "cumKm": 15926
  },
  {
    "id": 137,
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
    "cumKm": 16251
  },
  {
    "id": 138,
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
    "cumKm": 16546
  },
  {
    "id": 139,
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
    "cumKm": 16831
  },
  {
    "id": 140,
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
    "cumKm": 17456
  },
  {
    "id": 141,
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
    "cumKm": 17961
  },
  {
    "id": 142,
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
    "cumKm": 18216
  },
  {
    "id": 143,
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
    "cumKm": 18586
  },
  {
    "id": 144,
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
    "cumKm": 19071
  },
  {
    "id": 145,
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
    "cumKm": 19211
  },
  {
    "id": 146,
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
    "cumKm": 19556
  },
  {
    "id": 147,
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
    "cumKm": 20111
  },
  {
    "id": 148,
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
    "cumKm": 20411
  },
  {
    "id": 149,
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
    "cumKm": 20746
  },
  {
    "id": 150,
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
    "cumKm": 20911
  },
  {
    "id": 151,
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
    "cumKm": 21176
  },
  {
    "id": 152,
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
    "cumKm": 21671
  },
  {
    "id": 153,
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
    "cumKm": 22186
  },
  {
    "id": 154,
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
    "cumKm": 22501
  },
  {
    "id": 155,
    "name": "福贡",
    "lon": 98.87,
    "lat": 26.9,
    "segKm": 175,
    "road": "G219国道",
    "province": "云南",
    "spots": [
      "怒江大峡谷",
      "石月亮"
    ],
    "foods": [
      "傈僳手抓饭",
      "漆油鸡"
    ],
    "cumKm": 22676
  },
  {
    "id": 156,
    "name": "泸水",
    "lon": 98.85,
    "lat": 25.97,
    "segKm": 140,
    "road": "G219国道",
    "province": "云南",
    "spots": [
      "怒江大峡谷",
      "片马口岸"
    ],
    "foods": [
      "傈僳手抓饭",
      "漆油鸡"
    ],
    "cumKm": 22816
  },
  {
    "id": 157,
    "name": "腾冲",
    "lon": 98.49,
    "lat": 25.02,
    "segKm": 150,
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
    "cumKm": 22966
  },
  {
    "id": 158,
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
    "cumKm": 23761
  },
  {
    "id": 159,
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
    "cumKm": 24146
  },
  {
    "id": 160,
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
    "cumKm": 24471
  },
  {
    "id": 161,
    "name": "富宁",
    "lon": 105.63,
    "lat": 23.63,
    "segKm": 170,
    "road": "G219国道",
    "province": "云南",
    "spots": [
      "驮娘江",
      "剥隘古镇"
    ],
    "foods": [
      "富宁八角",
      "花米饭"
    ],
    "cumKm": 24641
  },
  {
    "id": 162,
    "name": "靖西",
    "lon": 106.42,
    "lat": 23.13,
    "segKm": 140,
    "road": "G219国道",
    "province": "广西",
    "spots": [
      "通灵大峡谷",
      "鹅泉"
    ],
    "foods": [
      "靖西香糯",
      "酸嘢"
    ],
    "cumKm": 24781
  },
  {
    "id": 163,
    "name": "大新",
    "lon": 107.2,
    "lat": 22.83,
    "segKm": 80,
    "road": "G219国道",
    "province": "广西",
    "spots": [
      "德天瀑布",
      "明仕田园"
    ],
    "foods": [
      "大新苦丁茶",
      "卷筒粉"
    ],
    "cumKm": 24861
  },
  {
    "id": 164,
    "name": "龙州",
    "lon": 106.85,
    "lat": 22.34,
    "segKm": 65,
    "road": "G219国道",
    "province": "广西",
    "spots": [
      "小连城",
      "弄岗保护区"
    ],
    "foods": [
      "龙州桄榔粉",
      "鸡肉粉"
    ],
    "cumKm": 24926
  },
  {
    "id": 165,
    "name": "凭祥",
    "lon": 106.77,
    "lat": 22.1,
    "segKm": 40,
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
    "cumKm": 24966
  },
  {
    "id": 166,
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
    "cumKm": 25261
  },
  {
    "id": 167,
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
    "cumKm": 25446
  },
  {
    "id": 168,
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
    "cumKm": 25646
  },
  {
    "id": 169,
    "name": "合浦",
    "lon": 109.2,
    "lat": 21.66,
    "segKm": 50,
    "road": "G228国道",
    "province": "广西",
    "spots": [
      "汉代文化博物馆",
      "星岛湖"
    ],
    "foods": [
      "合浦大月饼",
      "海鲜"
    ],
    "cumKm": 25696
  },
  {
    "id": 170,
    "name": "湛江",
    "lon": 110.36,
    "lat": 21.27,
    "segKm": 260,
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
    "cumKm": 25956
  },
  {
    "id": 171,
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
    "cumKm": 26361
  },
  {
    "id": 172,
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
    "cumKm": 26841
  },
  {
    "id": 173,
    "name": "中山",
    "lon": 113.38,
    "lat": 22.52,
    "segKm": 125,
    "road": "G228国道",
    "province": "广东",
    "spots": [
      "孙中山故居",
      "岐江公园"
    ],
    "foods": [
      "石岐乳鸽",
      "杏仁饼"
    ],
    "cumKm": 26966
  },
  {
    "id": 174,
    "name": "东莞",
    "lon": 113.75,
    "lat": 22.9,
    "segKm": 120,
    "road": "G228国道",
    "province": "广东",
    "spots": [
      "可园",
      "松山湖"
    ],
    "foods": [
      "东莞腊肠",
      "烧鹅濑粉"
    ],
    "cumKm": 27086
  },
  {
    "id": 175,
    "name": "北大汇丰商学院·终点",
    "lon": 113.97,
    "lat": 22.6,
    "segKm": 85,
    "road": "G228国道→北大汇丰楼下·闭环",
    "province": "广东",
    "spots": [
      "深圳湾公园",
      "梧桐山"
    ],
    "foods": [
      "椰子鸡",
      "光明乳鸽"
    ],
    "cumKm": 27171
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

// 距离当前进度最近的"有名"站点（用于前往地展示）
export function nextNamedNode(km: number): { node: RouteNode; distKm: number } {
  const nodes = CHINA_LOOP_PACK.nodes;
  const d = ((km % CHINA_LOOP_PACK.totalKm) + CHINA_LOOP_PACK.totalKm) % CHINA_LOOP_PACK.totalKm;
  for (const n of nodes) {
    if (n.name && n.cumKm >= d) return { node: n, distKm: n.cumKm - d };
  }
  return { node: nodes[0], distKm: CHINA_LOOP_PACK.totalKm - d };
}
