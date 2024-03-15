export type TrackerResponse = {
  endBlockHeight: number;
  twitterMessages: string[];
  telegramMessages: string[];
};

export type Platform = "twitter" | "telegram";

export type LinkTree = {
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  github: string | null;
};
