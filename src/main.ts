import { getLastProcessedBlockHeight, setLastProcessedBlockHeight } from "./db/db-helpers";
import { trackDonations } from "./lib/get-tweets/potlock-donate-tracker";
import { trackStatusChanges } from "./lib/get-tweets/potlock-registry-tracker";
import { trackPotfactory } from "./lib/get-tweets/potfactory-tracker";
import { sendTweet } from "./twitter";

const BOT_INTERVAL = 30 * 1000; // 30 seconds
const BOT_ERROR_DELAY = 60 * 1000; // 1 minute
const TWEET_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TWEET_ERROR_DELAY = 30 * 60 * 1000; // 30 minutes

// main event loop to process blocks and track donations and status changes recursively
const processBlocks = async () => {
  const lastProcessedBlockHeight = await getLastProcessedBlockHeight();

  try {
    const startBlockHeight = lastProcessedBlockHeight + 1;

    const trackDonationsResponse = (await trackDonations(startBlockHeight)) ?? {
      tweetMessages: [],
      endBlockHeight: 0,
    };
    const statusChangeResponse = (await trackStatusChanges(startBlockHeight)) ?? {
      tweetMessages: [],
      endBlockHeight: 0,
    };

    const potfactoryResponse = (await trackPotfactory(startBlockHeight)) ?? {
      tweetMessages: [],
      endBlockHeight: 0,
    };

    const { tweetMessages: donationTweets, endBlockHeight: donationEndBlockHeight } = trackDonationsResponse;
    const { tweetMessages: statusChangeTweets, endBlockHeight: statusChangeEndBlockHeight } = statusChangeResponse;
    const { tweetMessages: potfactoryTweets, endBlockHeight: potfactoryEndBlockHeight } = potfactoryResponse;

    // get the end block height from the last processed block height, donation end block height, and status change end block height
    const newProcessedBlockHeight = Math.max(
      donationEndBlockHeight,
      statusChangeEndBlockHeight,
      potfactoryEndBlockHeight,
      lastProcessedBlockHeight
    );

    console.log(
      `${startBlockHeight} -> ${newProcessedBlockHeight} Tweets: ${donationTweets.length} donations | ${statusChangeTweets.length} status changes | ${potfactoryTweets.length} potfactory`
    );

    // send tweets using sendTweet make sure to wait 15 after each tweet and not send them asynchronously
    for (const tweet of [...donationTweets, ...statusChangeTweets, ...potfactoryTweets]) {
      const tweetStatus = await sendTweet(tweet);

      if (tweetStatus === "rate-limited" || tweetStatus === "error" || tweetStatus === "unknown") {
        await new Promise((resolve) => setTimeout(resolve, TWEET_ERROR_DELAY));
      } else {
        await new Promise((resolve) => setTimeout(resolve, TWEET_INTERVAL));
      }
    }

    await setLastProcessedBlockHeight(newProcessedBlockHeight);

    await new Promise((resolve) => setTimeout(resolve, BOT_INTERVAL));
    await processBlocks();
  } catch (error) {
    console.error("Error processing receipts, waiting...", error);
    await new Promise((resolve) => setTimeout(resolve, BOT_ERROR_DELAY));
    await processBlocks();
  }
};

// Kick off the processing
await processBlocks();
