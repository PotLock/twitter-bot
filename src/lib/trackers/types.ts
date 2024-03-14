export type TrackerResponse = {
  endBlockHeight: number;
  twitterMessages: string[];
  telegramMessages: string[];
};

export type Platform = "twitter" | "telegram";
