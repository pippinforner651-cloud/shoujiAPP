import { useMemo, useState } from 'react';
import E23Icon from '../E23Icon';
import { calculatePaceLabel, validateManualRun, type ManualRunInput } from '../../utils/runFlow';

interface Props { onSave: (input: ManualRunInput) => void; saving: boolean; }

function todayKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function ManualRunEntry({ onSave, saving }: Props) {
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [date, setDate] = useState(todayKey());
  const [startTime, setStartTime] = useState('');
  const [sportType, setSportType] = useState<ManualRunInput['sportType']>('running');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const distanceKm = Number(distance);
  const durationMin = Number(duration);
  const pace = useMemo(() => calculatePaceLabel(distanceKm, durationMin), [distanceKm, durationMin]);

  const submit = () => {
    const input: ManualRunInput = { distanceKm, durationMin, date, startTime, sportType, note: note.trim() };
    const result = validateManualRun(input);
    if (!result.valid) return setError(result.error);
    setError('');
    onSave(input);
  };

  return (
    <section className="manual-run-card">
      <div className="run-page-heading"><p className="section-kicker">补录真实运动</p><h1>今天跑了多少？</h1><p>填写后会立即推进中国环游路线。</p></div>
      <div className="manual-primary-fields">
        <label><span>距离</span><div className="unit-input"><input value={distance} onChange={(e) => setDistance(e.target.value)} inputMode="decimal" type="number" min="0.1" max="200" step="0.01" placeholder="5.00" /><b>km</b></div></label>
        <label><span>时长</span><div className="unit-input"><input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="decimal" type="number" min="1" max="1440" step="1" placeholder="30" /><b>分钟</b></div></label>
      </div>
      <div className="pace-preview"><span>自动计算平均配速</span><strong>{pace}</strong></div>
      <div className="manual-secondary-fields">
        <label><span>日期</span><input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} /></label>
        <label><span>开始时间（可选）</span><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
        <label><span>运动类型</span><select value={sportType} onChange={(e) => setSportType(e.target.value as ManualRunInput['sportType'])}><option value="running">户外跑步</option><option value="walking">健走</option><option value="trail_running">越野跑</option></select></label>
        <label><span>备注（可选）</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="例如：晚饭后轻松跑" /></label>
      </div>
      {error && <div className="run-form-error" role="alert">{error}</div>}
      <button className="primary-action manual-save" onClick={submit} disabled={saving}><E23Icon name="run" size={20} />{saving ? '正在保存…' : '保存并查看旅程推进'}</button>
      <p className="manual-data-note">手动记录会标记为“本人录入”，保存在当前设备。</p>
    </section>
  );
}
