import NearQuery from "@/api/near/client";
import { trackDonate } from "@/lib/trackers/donate-tracker";
import { trackPotfactory } from "@/lib/trackers/potfactory-tracker";
import { trackRegistry } from "@/lib/trackers/registry-tracker";
import { sendTweet } from "@/lib/twitter";
import { BOT_INTERVAL, BOT_ERROR_DELAY, TWEET_INTERVAL, TWEET_ERROR_DELAY } from "@/config";
import { sendTelegramMessage } from "./lib/telegram";
import { getLastProcessedBlockHeight, setLastProcessedBlockHeight } from "./kv/actions";

export const nearQuery = new NearQuery();

const isProduction = Bun.env.NODE_ENV === "production";
let devBlockHeight = 116900993;

// start the main event loop
await main();

async function main() {
  try {
    const lastProcessedBlockHeight = isProduction ? await getLastProcessedBlockHeight() : devBlockHeight;
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

    // combine all twitter messages
    const allTwitterMessages = [...donateTwitterMessages, ...registryTwitterMessages, ...potfactoryTwitterMessages];
    // combine all telegram messages
    const allTelegramMessages = [...donateTelegramMessages, ...registryTelegramMessages, ...potfactoryTelegramMessages];

    for (let i = 0; i < allTwitterMessages.length; i++) {
      try {
        const tweetStatus = await sendTweet(allTwitterMessages[i]);
        const telegramResponse = await sendTelegramMessage(allTelegramMessages[i]);
        if (tweetStatus === "rate-limited") {
          console.log("Twitter Rate limited, waiting...", TWEET_ERROR_DELAY);
          await Bun.sleep(TWEET_ERROR_DELAY);
        }
        await Bun.sleep(TWEET_INTERVAL);
      } catch (error) {
        console.error("Error sending tweet or telegram message, continuing", error);
      }
    }
    if (isProduction) {
      await setLastProcessedBlockHeight(newProcessedBlockHeight);
    } else {
      devBlockHeight = newProcessedBlockHeight;
    }

    await Bun.sleep(BOT_INTERVAL);
    await main();
  } catch (error) {
    console.error("Error processing receipts, waiting...", error);
    await Bun.sleep(BOT_ERROR_DELAY);
    await main();
  }
}
