import { getLastProcessedBlockHeight, setLastProcessedBlockHeight } from "./db/db-helpers";
import { trackDonate } from "./lib/contract-trackers/donate-tracker";
import { trackRegistry } from "./lib/contract-trackers/registry-tracker";
import { trackPotfactory } from "./lib/contract-trackers/potfactory-tracker";
import { sendTweet } from "./twitter";

const BOT_INTERVAL = 30 * 1000; // 30 seconds
const BOT_ERROR_DELAY = 60 * 1000; // 1 minute
const TWEET_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TWEET_ERROR_DELAY = 30 * 60 * 1000; // 30 minutes

// main event loop to process data and send tweets
const processBlocks = async () => {
  const lastProcessedBlockHeight = await getLastProcessedBlockHeight();

  try {
    const startBlockHeight = lastProcessedBlockHeight + 1;

    const donateResponse = (await trackDonate(startBlockHeight)) ?? {
      tweetMessages: [],
      endBlockHeight: 0,
    };
    const registryResponse = (await trackRegistry(startBlockHeight)) ?? {
      tweetMessages: [],
      endBlockHeight: 0,
    };

    const potfactoryResponse = (await trackPotfactory(startBlockHeight)) ?? {
      tweetMessages: [],
      endBlockHeight: 0,
    };

    const { tweetMessages: donateTweets, endBlockHeight: donateEndBlockHeight } = donateResponse;
    const { tweetMessages: registryTweets, endBlockHeight: registryEndBlockHeight } = registryResponse;
    const { tweetMessages: potfactoryTweets, endBlockHeight: potfactoryEndBlockHeight } = potfactoryResponse;

    // get the max processed block height from all the responses
    const newProcessedBlockHeight = Math.max(
      donateEndBlockHeight,
      registryEndBlockHeight,
      potfactoryEndBlockHeight,
      lastProcessedBlockHeight
    );

    console.log(
      `${startBlockHeight} > ${newProcessedBlockHeight} ${donateTweets.length} donate | ${registryTweets.length} registry | ${potfactoryTweets.length} potfactory`
    );

    // send tweets using sendTweet make sure to wait 15 after each tweet and not send them asynchronously
    for (const tweet of [...donateTweets, ...registryTweets, ...potfactoryTweets]) {
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
