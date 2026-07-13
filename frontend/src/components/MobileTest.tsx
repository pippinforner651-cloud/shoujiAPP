import { useEffect, useState } from 'react';

interface DeviceInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  touchSupported: boolean;
  safeAreaTop: number;
  safeAreaBottom: number;
  userAgent: string;
}

export default function MobileTest() {
  const [info, setInfo] = useState<DeviceInfo>({
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    touchSupported: 'ontouchstart' in window,
    safeAreaTop: 0,
    safeAreaBottom: 0,
    userAgent: navigator.userAgent,
  });

  useEffect(() => {
    const handleResize = () => {
      setInfo((prev) => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resolvedSafeAreaTop = getComputedStyle(document.documentElement)
    .getPropertyValue('--sat')
    .trim();
  const resolvedSafeAreaBottom = getComputedStyle(document.documentElement)
    .getPropertyValue('--sab')
    .trim();

  const deviceClass =
    info.width < 640
      ? '📱 手机'
      : info.width < 1024
        ? '📟 平板'
        : '💻 桌面';

  const passFail = (condition: boolean) =>
    condition ? '✅ 通过' : '❌ 失败';

  return (
    <div className="mobile-test">
      <h2>移动端基础适配测试</h2>

      <div className="test-grid">
        <div className="test-card">
          <div className="test-label">设备类型</div>
          <div className="test-value">{deviceClass}</div>
        </div>
        <div className="test-card">
          <div className="test-label">视口宽度</div>
          <div className="test-value">{info.width}px</div>
        </div>
        <div className="test-card">
          <div className="test-label">视口高度</div>
          <div className="test-value">{info.height}px</div>
        </div>
        <div className="test-card">
          <div className="test-label">像素比</div>
          <div className="test-value">{info.devicePixelRatio}x</div>
        </div>
        <div className="test-card">
          <div className="test-label">触屏支持</div>
          <div className="test-value">{passFail(info.touchSupported)}</div>
        </div>
        <div className="test-card">
          <div className="test-label">安全区(top)</div>
          <div className="test-value">{resolvedSafeAreaTop || '0px'}</div>
        </div>
        <div className="test-card">
          <div className="test-label">安全区(bottom)</div>
          <div className="test-value">{resolvedSafeAreaBottom || '0px'}</div>
        </div>
        <div className="test-card">
          <div className="test-label">横向溢出</div>
          <div className="test-value">
            {passFail(document.body.scrollWidth <= window.innerWidth + 2)}
          </div>
        </div>
      </div>

      <details className="test-details">
        <summary>查看 User Agent</summary>
        <code>{info.userAgent}</code>
      </details>
    </div>
  );
}
