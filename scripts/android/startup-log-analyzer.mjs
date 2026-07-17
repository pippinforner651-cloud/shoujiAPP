export function analyzeStartupLog(logText, applicationId) {
  const lines = String(logText).split(/\r?\n/);
  const fatalStarts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].includes('FATAL EXCEPTION')) fatalStarts.push(index);
  }

  let firstFatalBlock = '';
  for (let fatalIndex = 0; fatalIndex < fatalStarts.length; fatalIndex += 1) {
    const start = fatalStarts[fatalIndex];
    const end = fatalStarts[fatalIndex + 1] ?? lines.length;
    const candidate = lines.slice(start, end).join('\n').trim();
    if (candidate.includes(applicationId)) {
      firstFatalBlock = candidate;
      break;
    }
  }

  const persistenceMatches = [...String(logText).matchAll(/PERSISTENCE_READY\s+(\d+)/g)];
  const persistenceReady = persistenceMatches.length > 0
    ? Number(persistenceMatches.at(-1)?.[1])
    : 0;

  return {
    fatal: firstFatalBlock.length > 0,
    firstFatalBlock,
    nativeReady: lines.some((line) => line.includes('E23Startup') && line.includes('NATIVE_READY')),
    webReady: lines.some((line) => line.includes('[E23_STARTUP] WEB_READY')),
    persistenceReady,
  };
}

