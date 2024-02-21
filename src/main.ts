import { getLastProcessedBlockHeight, setLastProcessedBlockHeight } from "./db/db-helpers";
import { trackDonations } from "./lib/get-tweets/potlock-donate-tracker";
import { trackStatusChanges } from "./lib/get-tweets/potlock-registry-tracker";
import { trackPotfactory } from "./lib/get-tweets/potfactory-tracker";
import { sendTweet } from "./twitter";

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

    donationTweets.length && console.log("found", donationTweets.length, "donation tweets");
    statusChangeTweets.length && console.log("found", statusChangeTweets.length, "status change tweets");
    potfactoryTweets.length && console.log("found", potfactoryTweets.length, "potfactory tweets");

    // get the end block height from the last processed block height, donation end block height, and status change end block height
    const newProcessedBlockHeight = Math.max(
      donationEndBlockHeight,
      statusChangeEndBlockHeight,
      potfactoryEndBlockHeight,
      lastProcessedBlockHeight
    );

    // send tweets using sendTweet make sure to wait 15 after each tweet and not send them asynchronously
    for (const tweet of [...donationTweets, ...statusChangeTweets, ...potfactoryTweets]) {
      await sendTweet(tweet);
      // 15 seconds between tweets to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }

    await setLastProcessedBlockHeight(newProcessedBlockHeight);

    console.log("Receipts synced, waiting...");
    // Wait 30 seconds before processing again
    setTimeout(() => processBlocks(), 30000);
  } catch (error) {
    console.error("Error processing receipts, waiting...", error);
    // Wait 30 seconds before retrying
    setTimeout(() => processBlocks(), 30000);
  }
};

// Kick off the processing
await processBlocks();
