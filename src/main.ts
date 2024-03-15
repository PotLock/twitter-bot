import NearQuery from "@/api/near/client";
import { trackDonate } from "@/lib/trackers/donate-tracker";
import { trackPotfactory } from "@/lib/trackers/potfactory-tracker";
import { trackRegistry } from "@/lib/trackers/registry-tracker";
import { sendTweet } from "@/lib/twitter";
import { BOT_INTERVAL, BOT_ERROR_DELAY, TWEET_INTERVAL, TWEET_ERROR_DELAY } from "@/config";
import { sendTelegramMessage } from "./lib/telegram";
import { getLastProcessedBlockHeight, setLastProcessedBlockHeight } from "./kv/actions";

export const nearQuery = new NearQuery();

// start the main event loop
await main();

async function main() {
  try {
    const lastProcessedBlockHeight =
      Bun.env.NODE_ENV === "production" ? await getLastProcessedBlockHeight() : 114509477;
    if (lastProcessedBlockHeight === null) {
      console.error("No lastProcessedBlockHeight found, waiting...");
      await Bun.sleep(BOT_ERROR_DELAY);
      return;
    }
    const startBlockHeight = lastProcessedBlockHeight + 1;

    const donateResponse = await trackDonate(startBlockHeight);
    const registryResponse = await trackRegistry(startBlockHeight);
    const potfactoryResponse = await trackPotfactory(startBlockHeight);

    const {
      twitterMessages: donateTwitterMessages,
      telegramMessages: donateTelegramMessages,
      endBlockHeight: donateEndBlockHeight,
    } = donateResponse;
    const {
      twitterMessages: registryTwitterMessages,
      telegramMessages: registryTelegramMessages,
      endBlockHeight: registryEndBlockHeight,
    } = registryResponse;
    const {
      twitterMessages: potfactoryTwitterMessages,
      telegramMessages: potfactoryTelegramMessages,
      endBlockHeight: potfactoryEndBlockHeight,
    } = potfactoryResponse;

    // find the highest block height form the data
    const newProcessedBlockHeight = Math.max(
      donateEndBlockHeight,
      registryEndBlockHeight,
      potfactoryEndBlockHeight,
      lastProcessedBlockHeight
    );

    console.log(
      `${startBlockHeight} - ${newProcessedBlockHeight} donate: ${donateTwitterMessages.length} | registry: ${registryTwitterMessages.length} | potfactory: ${potfactoryTwitterMessages.length}`
    );

    // SEND TELEGRAM MESSAGES
    for (const telegramMessage of [
      ...donateTelegramMessages,
      ...registryTelegramMessages,
      ...potfactoryTelegramMessages,
    ]) {
      await sendTelegramMessage(telegramMessage);
    }

    // SEND TWITTER MESSAGES
    for (const twitterMessage of [...donateTwitterMessages, ...registryTwitterMessages, ...potfactoryTwitterMessages]) {
      const tweetStatus = await sendTweet(twitterMessage);
      if (tweetStatus === "rate-limited" || tweetStatus === "error" || tweetStatus === "unknown") {
        await Bun.sleep(TWEET_ERROR_DELAY);
      } else {
        await Bun.sleep(TWEET_INTERVAL);
      }
    }

    await setLastProcessedBlockHeight(newProcessedBlockHeight);
    await Bun.sleep(BOT_INTERVAL);
    await main();
  } catch (error) {
    console.error("Error processing receipts, waiting...", error);
    await Bun.sleep(BOT_ERROR_DELAY);
    await main();
  }
}
