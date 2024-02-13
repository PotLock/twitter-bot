import { nearQuery } from "./near-query/client";

type TweetArgs = {
  projectId: string;
  status: string;
  reviewNotes?: string;
};

export async function trackStatusChanges(startBlockHeight: number, endBlockHeight: number) {
  const { errors, data: potlockReceipts } = await nearQuery.fetchContractReceipts({
    startBlockHeight: startBlockHeight,
    endBlockHeight: endBlockHeight,
    receiver: "registry.potlock.near",
    methodName: "admin_set_project_status",
  });

  if (errors) {
    console.log("Error fetching potlock receipts", errors);
    return;
  }

  if (!potlockReceipts.length) {
    console.log("No new status update receipts found");
    return;
  }

  console.log(potlockReceipts.length, "status update receipts found");

  const tweetMessages = await Promise.all(
    potlockReceipts.map(async (receipt: any) => {
      const tweetArgs: TweetArgs = {
        projectId: receipt.parsedArgs.project_id,
        status: receipt.parsedArgs.status,
        reviewNotes: receipt.parsedArgs.review_notes,
      };

      return await formatTweetMessage(tweetArgs);
    })
  );

  return tweetMessages;
}

async function formatTweetMessage(tweetArgs: TweetArgs) {
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
    message += `\nReview notes: "${reviewNotes}"`;
  }

  // Append project link
  message += `\nhttps://bos.potlock.org/?tab=project&projectId=${projectId}`;

  return message;
}
