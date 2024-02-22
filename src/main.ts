import NearQuery from "@/lib/data/client";
import { getLastProcessedBlockHeight, setLastProcessedBlockHeight } from "@/lib/db/db-helpers";
import { trackDonate } from "@/lib/trackers/donate-tracker";
import { trackPotfactory } from "@/lib/trackers/potfactory-tracker";
import { trackRegistry } from "@/lib/trackers/registry-tracker";
import { BOT_ERROR_DELAY, BOT_INTERVAL, TWEET_ERROR_DELAY, TWEET_INTERVAL } from "@/lib/config";
import { sendTweet } from "@/lib/twitter";

export const nearQuery = new NearQuery();

// start the main event loop
await main();

async function main() {
  try {
    const lastProcessedBlockHeight = await getLastProcessedBlockHeight();
    const startBlockHeight = lastProcessedBlockHeight + 1;

    const donateResponse = await trackDonate(startBlockHeight);
    const registryResponse = await trackRegistry(startBlockHeight);
    const potfactoryResponse = await trackPotfactory(startBlockHeight);

    const { tweetMessages: donateTweets, endBlockHeight: donateEndBlockHeight } = donateResponse;
    const { tweetMessages: registryTweets, endBlockHeight: registryEndBlockHeight } = registryResponse;
    const { tweetMessages: potfactoryTweets, endBlockHeight: potfactoryEndBlockHeight } = potfactoryResponse;

    // find the highest block height form the data
    const newProcessedBlockHeight = Math.max(
      donateEndBlockHeight,
      registryEndBlockHeight,
      potfactoryEndBlockHeight,
      lastProcessedBlockHeight
    );

    console.log(
      `${startBlockHeight} > ${newProcessedBlockHeight} ${donateTweets.length} donate | ${registryTweets.length} registry | ${potfactoryTweets.length} potfactory`
    );

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
    await main();
  } catch (error) {
    console.error("Error processing receipts, waiting...", error);
    await new Promise((resolve) => setTimeout(resolve, BOT_ERROR_DELAY));
    await main();
  }
}
