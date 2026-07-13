/* 分享卡片类型 */

export interface ShareCardTheme {
  bgColor: string;
  headerColor: string;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  barColor: string;
}

export const PERSONAL_THEME: ShareCardTheme = {
  bgColor: '#0f2027',
  headerColor: '#ffd54f',
  accentColor: '#4fc3f7',
  textColor: '#ffffff',
  mutedColor: 'rgba(255,255,255,0.5)',
  barColor: '#ffd54f',
};

export const GLOBAL_THEME: ShareCardTheme = {
  bgColor: '#0f2027',
  headerColor: '#81c784',
  accentColor: '#66bb6a',
  textColor: '#ffffff',
  mutedColor: 'rgba(255,255,255,0.5)',
  barColor: '#66bb6a',
};
