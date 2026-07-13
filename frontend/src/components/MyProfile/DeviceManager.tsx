import { useState } from 'react';

interface Device {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  lastSync?: string;
}

const MOCK_DEVICES: Device[] = [
  { id: 'apple', name: 'Apple Watch', icon: '🍎', connected: false },
  { id: 'huawei', name: '华为运动健康', icon: '⌚', connected: false },
  { id: 'xiaomi', name: '小米运动', icon: '⌚', connected: false },
  { id: 'garmin', name: 'Garmin', icon: '⏱️', connected: false },
];

export default function DeviceManager() {
  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem('vr_china_devices');
    return saved ? JSON.parse(saved) : MOCK_DEVICES;
  });

  const toggleDevice = (id: string) => {
    const updated = devices.map((d) => {
      if (d.id !== id) return d;
      if (d.connected) {
        return { ...d, connected: false, lastSync: undefined };
      }
      return { ...d, connected: true, lastSync: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    });
    setDevices(updated);
    localStorage.setItem('vr_china_devices', JSON.stringify(updated));
  };

  return (
    <div className="mp-section">
      <div className="mp-section-title">⌚ 运动设备</div>
      <div className="dm-list">
        {devices.map((device) => (
          <div key={device.id} className="dm-item">
            <div className="dm-info">
              <span className="dm-icon">{device.icon}</span>
              <div className="dm-detail">
                <span className="dm-name">{device.name}</span>
                <span className={`dm-status ${device.connected ? 'connected' : ''}`}>
                  {device.connected ? '已连接' : '未连接'}
                </span>
                {device.lastSync && <span className="dm-sync">最后同步: {device.lastSync}</span>}
              </div>
            </div>
            <button
              className={`dm-btn ${device.connected ? 'disconnect' : 'connect'}`}
              onClick={() => toggleDevice(device.id)}
            >
              {device.connected ? '解绑' : '绑定'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
