import { nearQuery } from "../../near-query/client";
import { TrackerResponse } from "../types";
import { shortenMessage } from "../utils";

type RegistryTweetArgs = {
  projectId: string;
  status: string;
  reviewNotes?: string;
};

export async function trackRegistry(startBlockHeight: number): Promise<TrackerResponse> {
  const { errors, data: potlockReceipts } = await nearQuery.fetchContractReceipts({
    queryName: "potlockReceipts",
    startBlockHeight: startBlockHeight,
    receiver: "registry.potlock.near",
    methodName: "admin_set_project_status",
  });

  if (errors) {
    console.log("Error fetching registry receipts", errors);
    return {
      endBlockHeight: 0,
      tweetMessages: [],
    };
  }

  if (!potlockReceipts.length) {
    // console.log("No new status update receipts found");
    return {
      endBlockHeight: 0,
      tweetMessages: [],
    };
  }

  const endBlockHeight = potlockReceipts.at(-1).block_height;

  const tweetMessages = await Promise.all(
    potlockReceipts.map(async (receipt: any) => {
      const tweetArgs: RegistryTweetArgs = {
        projectId: receipt.parsedArgs.project_id,
        status: receipt.parsedArgs.status,
        reviewNotes: receipt.parsedArgs.review_notes,
      };

      return await formatTweetMessage(tweetArgs);
    })
  );

  return {
    endBlockHeight,
    tweetMessages,
  };
}

async function formatTweetMessage(tweetArgs: RegistryTweetArgs) {
  const { projectId, status, reviewNotes } = tweetArgs;

  const projectTag = await nearQuery.lookupTwitterHandle(projectId).then((handle) => handle ?? projectId);

  // Start with the base message
  let message = `Project ${projectTag}`;

  // Append status-specific prefix
  switch (status) {
    case "Rejected":
      message = `❌ ${message} has been rejected ❌`;
      break;
    case "Graylisted":
      message = `🟡 ${message} has been graylisted 🟡`;
      break;
    case "Approved":
      message = `✅ ${message} has been approved ✅`;
      break;
    default:
      message = `${message} status changed to ${status}`;
      break;
  }

  // Append review notes if present
  if (reviewNotes) {
    const shortendedMessage = shortenMessage(reviewNotes, 150);
    message += `\nReview notes: "${shortendedMessage}"`;
  }

  // Append project link
  message += `\nhttps://bos.potlock.org/?tab=project&projectId=${projectId}`;

  return message;
}
