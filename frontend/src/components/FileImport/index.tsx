/**
 * GPX / FIT 文件导入组件
 *
 * Phase 6.3 — 第三方接入前的临时方案
 */

import { useState, useRef } from 'react';
import { parseGpxXml, parseFitFile } from '../../services/activitySources/FileImportAdapter';
import { useRunStore } from '../../store/runStore';
import { getSourceLabel } from '../../services/activitySources';
import type { AdapterResult } from '../../types/activity';
import { adaptToRunStore } from '../../services/activitySources';

type ImportStatus = 'idle' | 'parsing' | 'done' | 'error';

interface ImportLog {
  fileName: string;
  status: 'success' | 'duplicate' | 'error';
  detail?: string;
  distanceKm?: number;
}

export default function FileImport() {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [totalKm, setTotalKm] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addRecord = useRunStore((s) => s.addRecord);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatus('parsing');
    const newLogs: ImportLog[] = [];
    let total = 0;

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();

      try {
        if (ext === 'gpx') {
          const text = await file.text();
          const input = parseGpxXml(text);

          if (!input) {
            newLogs.push({ fileName: file.name, status: 'error', detail: '解析失败，文件格式不正确' });
            continue;
          }

          const result = adaptToRunStore(input);
          if (result.success) {
            const km = input.distanceMeters / 1000;
            total += km;
            newLogs.push({
              fileName: file.name,
              status: 'success',
              distanceKm: km,
              detail: `✅ ${km.toFixed(2)} km · ${Math.round(input.durationSeconds / 60)} 分钟`,
            });
          } else if (result.error === 'duplicate') {
            newLogs.push({ fileName: file.name, status: 'duplicate', detail: '重复活动，已跳过' });
          } else {
            newLogs.push({ fileName: file.name, status: 'error', detail: result.error });
          }
        } else if (ext === 'fit') {
          const buffer = await file.arrayBuffer();
          const input = parseFitFile(buffer);

          if (!input) {
            newLogs.push({ fileName: file.name, status: 'error', detail: 'FIT 解析暂未实现（开发中）' });
            continue;
          }

          const result = adaptToRunStore(input);
          if (result.success) {
            const km = input.distanceMeters / 1000;
            total += km;
            newLogs.push({ fileName: file.name, status: 'success', distanceKm: km });
          } else {
            newLogs.push({ fileName: file.name, status: 'error', detail: result.error });
          }
        } else {
          newLogs.push({ fileName: file.name, status: 'error', detail: '不支持的文件格式，仅支持 .gpx 和 .fit' });
        }
      } catch (err) {
        newLogs.push({ fileName: file.name, status: 'error', detail: `解析异常: ${String(err)}` });
      }
    }

    setLogs((prev) => [...newLogs, ...prev]);
    setTotalKm((prev) => prev + total);
    setStatus('done');

    // 重置 input 以允许重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const successCount = logs.filter((l) => l.status === 'success').length;
  const duplicateCount = logs.filter((l) => l.status === 'duplicate').length;
  const errorCount = logs.filter((l) => l.status === 'error').length;

  return (
    <div className="file-import">
      <h3 className="fi-title">📂 导入运动数据</h3>
      <p className="fi-desc">支持 GPX（推荐）和 FIT 格式文件，可多选</p>

      <div className="fi-upload-area">
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx,.fit"
          multiple
          onChange={handleFile}
          className="fi-input"
          id="fi-file-input"
        />
        <label htmlFor="fi-file-input" className="fi-upload-btn">
          {status === 'parsing' ? '⏳ 解析中...' : '📤 选择文件'}
        </label>
      </div>

      {/* 统计 */}
      {logs.length > 0 && (
        <div className="fi-stats">
          <span className="fi-stat ok">✅ 成功 {successCount}</span>
          <span className="fi-stat dup">🔄 重复 {duplicateCount}</span>
          <span className="fi-stat err">❌ 失败 {errorCount}</span>
          <span className="fi-stat total">📊 合计 {totalKm.toFixed(2)} km</span>
        </div>
      )}

      {/* 日志 */}
      {logs.length > 0 && (
        <div className="fi-logs">
          {logs.map((log, i) => (
            <div key={i} className={`fi-log fi-log-${log.status}`}>
              <span className="fi-log-icon">
                {log.status === 'success' ? '✅' : log.status === 'duplicate' ? '🔄' : '❌'}
              </span>
              <span className="fi-log-name">{log.fileName}</span>
              <span className="fi-log-detail">{log.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
