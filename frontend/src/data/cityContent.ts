export interface CityArrivalContent {
  tagline: string;
  arrivalMessage: string;
  badgeLabel: string;
}

const KEY_CITY_CONTENT: Record<string, CityArrivalContent> = {
  深圳: {
    tagline: '旅程起点',
    arrivalMessage: '从这里出发，把每天的真实跑步连成一段中国旅程。',
    badgeLabel: 'E23出发章',
  },
  厦门: {
    tagline: '路线第一站',
    arrivalMessage: '你已经抵达离开深圳后的第一站，环游旅程正式展开。',
    badgeLabel: '第一站到达章',
  },
  广州: {
    tagline: '闭环前的最后一站',
    arrivalMessage: '你已抵达第48座路线城市，接下来经140公里闭环返回深圳。',
    badgeLabel: '闭环挑战章',
  },
};

export function getCityArrivalContent(city: string, order: number): CityArrivalContent {
  return KEY_CITY_CONTENT[city] ?? {
    tagline: `环游路线第${order}站`,
    arrivalMessage: `到站！你已通过真实跑步抵达${city}，下一段旅程继续。`,
    badgeLabel: `第${order}站到达章`,
  };
}
