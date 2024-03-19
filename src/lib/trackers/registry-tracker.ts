import { nearQuery } from "@/main";
import { shortenMessage } from "@/lib/utils";
import { Platform, TrackerResponse } from "@/lib/types";

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

  const projectIdTag = projectId && projectId.split(".")[0];
  const projectTag =
    platform === "twitter"
      ? await nearQuery.getLinkTree(projectId).then((linkTree) => linkTree[platform] || projectIdTag)
      : projectIdTag;
  const projectWebsite = await nearQuery.getLinkTree(projectId).then((linkTree) => linkTree.website || null);

  let message = ``;

  switch (status) {
    case "Rejected":
      message = `❌ Project rejected ❌\n`;
      break;
    case "Graylisted":
      message = `🟡 Project Graylisted 🟡\n`;
      break;
    case "Approved":
      message = `✅ Project approved ✅\n`;
      break;
    default:
      message = `Project status changed to ${status}\n`;
      break;
  }

  message +=
    platform === "twitter"
      ? `Project ${projectTag}\n`
      : projectWebsite
      ? `Project: <a href="${projectWebsite}">${projectIdTag}</a>\n`
      : `Project: ${projectIdTag}\n`;

  if (reviewNotes) {
    const shortendedMessage = shortenMessage(reviewNotes, 150);
    message += `Review notes: "${shortendedMessage}"\n`;
  }

  message +=
    platform === "twitter"
      ? `https://bos.potlock.org/?tab=project&projectId=${projectId}\n`
      : `<a href="https://bos.potlock.org/?tab=project&projectId=${projectId}">View on Potlock</a>\n`;

  return message;
}
