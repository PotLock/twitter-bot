import { nearQuery } from "@/main";
import { shortenMessage } from "@/lib/trackers/utils";
import { Platform, TrackerResponse } from "@/lib/trackers/types";

type RegistryMessageArgs = {
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
      twitterMessages: [],
      telegramMessages: [],
    };
  }

  if (!potlockReceipts.length) {
    // console.log("No new status update receipts found");
    return {
      endBlockHeight: 0,
      twitterMessages: [],
      telegramMessages: [],
    };
  }

  const endBlockHeight = potlockReceipts.at(-1).block_height;

  const getMessageArgs = (receipt: any) => ({
    projectId: receipt.parsedArgs.project_id,
    status: receipt.parsedArgs.status,
    reviewNotes: receipt.parsedArgs.review_notes,
  });

  const twitterMessages = await Promise.all(
    potlockReceipts.map((receipt: any) => {
      return formatMessage(getMessageArgs(receipt), "twitter");
    })
  );
  const telegramMessages = await Promise.all(
    potlockReceipts.map((receipt: any) => {
      return formatMessage(getMessageArgs(receipt), "telegram");
    })
  );

  // remove any null messages
  const filteredTwitterMessages = twitterMessages.filter((message: string | null) => message !== null);
  const filteredTelegramMessages = telegramMessages.filter((message: string | null) => message !== null);

  return {
    endBlockHeight,
    twitterMessages: filteredTwitterMessages,
    telegramMessages: filteredTelegramMessages,
  };
}

async function formatMessage(messageArgs: RegistryMessageArgs, platform: Platform): Promise<string | null> {
  const { projectId, status, reviewNotes } = messageArgs;

  const projectTag = await nearQuery.lookupHandles(projectId).then((handles) => handles[platform] || projectId);

  // Start with the base message
  let message = platform === "twitter" ? `@potlock_ Project ${projectTag}` : `Project ${projectTag}`;

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
