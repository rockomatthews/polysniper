export const calculateEdgeBps = (bid: number, ask: number, ref: number): number => {
  if (ref <= 0) {
    return 0;
  }
  const edge = ref - ask;
  return (edge / ref) * 10000;
};

export const calculateSpreadBps = (bid: number, ask: number): number => {
  const mid = (bid + ask) / 2;
  if (mid <= 0) {
    return 0;
  }
  return ((ask - bid) / mid) * 10000;
};
