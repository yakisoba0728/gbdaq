export const fmtPoints = (n: number) => Math.round(n).toLocaleString('ko-KR')
export const fmtPct = (p: number) => `${Math.round(p * 100)}%`     // p: 0..1
