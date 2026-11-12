const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

function severity(value, mid, high, reverse=false) {
  if (!reverse) return value >= high ? 'high' : value >= mid ? 'mid' : 'low';
  return value <= high ? 'high' : value <= mid ? 'mid' : 'low';
}

export function analyzeInteraction(summary) {
  // Prototype-only heuristic thresholds. They are intentionally transparent
  // and are NOT presented as clinical/validated cut-offs.
  const components = {
    rtVariability: clamp((summary.rtCV - 0.12) / 0.30, 0, 1),
    commission: clamp(summary.commissionRate / 0.45, 0, 1),
    omission: clamp(summary.omissionRate / 0.35, 0, 1),
    direction: clamp((summary.directionChanges - 1.5) / 8, 0, 1),
    movementVariability: clamp(summary.speedStd / 900, 0, 1),
  };

  const score = Math.round(100 * (
    components.rtVariability * 0.30 +
    components.commission * 0.28 +
    components.omission * 0.20 +
    components.direction * 0.12 +
    components.movementVariability * 0.10
  ));

  const level = score >= 65 ? 'High' : score >= 35 ? 'Moderate' : 'Low';
  const label = level === 'High' ? '較多注意／抑制控制支援訊號' :
                level === 'Moderate' ? '出現部分注意／抑制控制支援訊號' :
                '目前觀察到的支援訊號較少';

  const signals = [
    { name:'Reaction-time variability', value: summary.rtCV, display:`CV ${(summary.rtCV*100).toFixed(1)}%`, severity:severity(summary.rtCV,.18,.28) },
    { name:'Commission errors (No-Go)', value:summary.commissionRate, display:`${summary.commissionErrors} / ${summary.noGoTrials}`, severity:severity(summary.commissionRate,.15,.30) },
    { name:'Omission errors (Go)', value:summary.omissionRate, display:`${summary.omissionErrors} / ${summary.goTrials}`, severity:severity(summary.omissionRate,.10,.25) },
    { name:'Direction changes', value:summary.directionChanges, display:`${summary.directionChanges.toFixed(1)} / trial`, severity:severity(summary.directionChanges,3,6) },
    { name:'Movement consistency', value:summary.speedStd, display:`${Math.round(summary.speedStd)} px/s SD`, severity:severity(summary.speedStd,350,700) },
  ];

  const recommendations = [];
  if (components.rtVariability > .35 || components.omission > .3) recommendations.push('啟用 Focus Mode，減少側欄、動畫與次要訊息。');
  if (components.commission > .3) recommendations.push('重要操作增加確認步驟，並放大主要點擊目標。');
  if (components.direction > .35 || components.movementVariability > .35) recommendations.push('固定主要操作位置，減少需要反覆搜尋的控制元件。');
  if (!recommendations.length) recommendations.push('維持一般介面，保留使用者手動開啟 Focus Mode 的選項。');
  recommendations.push('所有自動調整都應可由使用者立即覆寫或關閉。');

  return {
    score,
    level,
    label,
    signals,
    recommendations,
    explanation: level === 'High'
      ? '本次任務中同時出現較高的反應變異、抑制錯誤或移動不穩定訊號。'
      : level === 'Moderate'
      ? '本次任務出現部分注意力穩定性或抑制控制相關訊號，但不足以做任何臨床推論。'
      : '本次短任務中，上述行為訊號整體較低；這不代表沒有 ADHD，也不代表臨床狀態。'
  };
}
