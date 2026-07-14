import assert from 'node:assert/strict';
import test from 'node:test';

const cityContent = await import('../src/data/cityContent.ts').catch(() => ({}));

test('provides restrained key-city arrival copy without invented facts', () => {
  assert.equal(typeof cityContent.getCityArrivalContent, 'function');
  assert.equal(cityContent.getCityArrivalContent!('深圳', 1).tagline, '旅程起点');
  assert.equal(cityContent.getCityArrivalContent!('广州', 48).tagline, '闭环前的最后一站');
});

test('provides an extensible generic template for every other city', () => {
  const result = cityContent.getCityArrivalContent!('测试城市', 12);
  assert.equal(result.tagline, '环游路线第12站');
  assert.match(result.arrivalMessage, /测试城市/);
});
