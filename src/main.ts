import { getLastProcessedBlockHeight, setLastProcessedBlockHeight } from "./db/db-helpers";
import { trackDonations } from "./potlock-donate-tracker";
import { trackStatusChanges } from "./potlock-registry-tracker";
import { sendTweet } from "./twitter";

// main event loop to process blocks and track donations and status changes recursively
const processBlocks = async () => {
  const lastProcessedBlockHeight = await getLastProcessedBlockHeight();

  try {
    const startBlockHeight = lastProcessedBlockHeight + 1;

    const trackDonationsResponse = await trackDonations(startBlockHeight);
    const { tweetMessages: donationTweets, endBlockHeight: donationEndBlockHeight } = trackDonationsResponse ?? {
      tweetMessages: [],
      endBlockHeight: 0,
    };

    const statusChangeResponse = await trackStatusChanges(startBlockHeight);
    const { tweetMessages: statusChangeTweets, endBlockHeight: statusChangeEndBlockHeight } = statusChangeResponse ?? {
      tweetMessages: [],
      endBlockHeight: 0,
    };

    // get the end block height from the last processed block height, donation end block height, and status change end block height
    const newProcessedBlockHeight = Math.max(
      donationEndBlockHeight,
      statusChangeEndBlockHeight,
      lastProcessedBlockHeight
    );

    // send tweets using sendTweet make sure to wait 15 after each tweet and not send them asynchronously
    for (const tweet of [...donationTweets, ...statusChangeTweets]) {
      await sendTweet(tweet);
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
