export type TrackerResponse = {
  endBlockHeight: number;
  tweetMessages: string[];
};

const FT_DECIMALS_MAP: { [key: string]: number } = {
  near: 24,
  usd: 6,
};

export const formatAmount = (amount: string, ftId: string) => {
  const decimals = FT_DECIMALS_MAP[ftId] ?? 24;
  return (parseInt(amount) / 10 ** decimals).toFixed(2);
};

export function shortenMessage(message: string, maxLength: number): string {
  return message.substring(0, maxLength) + (message.length > maxLength ? "..." : "");
}
