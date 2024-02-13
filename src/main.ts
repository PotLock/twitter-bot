import { connect } from "near-api-js";
import { getLastProcessedBlockHeight, setLastProcessedBlockHeight } from "./db/db-helpers";
import { trackDonations } from "./potlock-donate-tracker";
import { trackStatusChanges } from "./potlock-registry-tracker";
import { sendTweet } from "./twitter";

const near = await connect({
  nodeUrl: "https://rpc.mainnet.near.org",
  networkId: "mainnet",
});

// main event loop to process blocks and track donations and status changes recursively
const processBlocks = async () => {
  const provider = near.connection.provider;

  const statusResponse = await provider.status();
  const latestBlockHeight = statusResponse.sync_info.latest_block_height;

  const lastProcessedBlockHeight = await getLastProcessedBlockHeight();
  const backfillMode = latestBlockHeight - lastProcessedBlockHeight > 10000;
  const endBlockHeight = backfillMode ? lastProcessedBlockHeight + 9999 : latestBlockHeight;

  try {
    const startBlockHeight = lastProcessedBlockHeight + 1;
    console.log("Processing blocks in range", startBlockHeight, "to", endBlockHeight);

    const donationTweets = (await trackDonations(startBlockHeight, endBlockHeight)) || [];
    const statusChangeTweets = (await trackStatusChanges(startBlockHeight, endBlockHeight)) || [];

    // send tweets using sendTweet make sure to wait 15 after each tweet and not send them asynchronously
    for (const tweet of [...donationTweets, ...statusChangeTweets]) {
      await sendTweet(tweet);
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }

    await setLastProcessedBlockHeight(endBlockHeight);

    if (backfillMode || endBlockHeight < latestBlockHeight) {
      await processBlocks();
    } else {
      console.log("Blocks synced, waiting...");
      // Wait 30 seconds before processing again
      setTimeout(() => processBlocks(), 30000);
    }
  } catch (error) {
    console.error("Error processing blocks, waiting...", error);
    // Wait 30 seconds before retrying
    setTimeout(() => processBlocks(), 30000);
  }
};

// Kick off the processing
await processBlocks();
