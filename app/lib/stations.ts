/**
 * 경보 하나의 일생 — 신호에서 마감까지.
 *
 * 시각 레일의 눈금과 3D 장면의 단계가 이 목록에서 나온다. 페이지의 [data-stamp] 구간과
 * 순서·개수가 같아야 한다 — 레일이 런타임에 [data-stamp] 를 다시 질의해 짝을 맞추므로,
 * 여기가 어긋나면 눈금이 남거나 모자란다.
 *
 * stamp 는 그 구간에서 이벤트 · 경보가 놓인 상태다. ACCEPTED 는 수집 결과(IngestOutcome),
 * RAISED · DISPATCHED · ACKNOWLEDGED 는 서버 AlarmState 값 그대로 쓴다.
 */
export type Band = "dark" | "light";

export type Station = {
  id: string;
  stamp: string;
  band: Band;
};

export const STATIONS: Station[] = [
  { id: "top", stamp: "신호", band: "dark" },
  { id: "sources", stamp: "IF-01~08", band: "dark" },
  { id: "ingest", stamp: "ACCEPTED", band: "light" },
  { id: "judge", stamp: "판정", band: "light" },
  { id: "raised", stamp: "RAISED", band: "dark" },
  { id: "dispatch", stamp: "DISPATCHED", band: "dark" },
  { id: "ack", stamp: "ACKNOWLEDGED", band: "dark" },
  { id: "vitals", stamp: "생존 확인", band: "dark" },
  { id: "measure", stamp: "P-01", band: "light" },
  { id: "later", stamp: "아직", band: "dark" },
];

/** 3D 장면이 단계별로 바뀌는 지점 (STATIONS 의 인덱스). 닫는 말은 STATIONS.length */
export const STAGE = {
  top: 0,
  sources: 1,
  ingest: 2,
  judge: 3,
  raised: 4,
  dispatch: 5,
  ack: 6,
  vitals: 7,
  measure: 8,
  later: 9,
  close: 10,
} as const;
