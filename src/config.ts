const SECOND = 1000;
const MINUTE = 60 * SECOND;

const NODE_ENV = Bun.env.NODE_ENV || "development";
const DEVELOPMENT_MULTIPLIER = NODE_ENV === "production" ? 1 : 0;

export const BOT_INTERVAL = 30 * SECOND * DEVELOPMENT_MULTIPLIER; // 30 seconds
export const BOT_ERROR_DELAY = 60 * SECOND * DEVELOPMENT_MULTIPLIER; // 60 seconds
export const TWEET_INTERVAL = 5 * MINUTE * DEVELOPMENT_MULTIPLIER; // 5 minutes
export const TWEET_ERROR_DELAY = 30 * MINUTE * DEVELOPMENT_MULTIPLIER; // 30 minutes

export const DONATION_BROADCAST_MINIMUM = 0.5; // NEAR
