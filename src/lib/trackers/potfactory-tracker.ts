import { nearQuery } from "@/main";
import { DONATION_BROADCAST_MINIMUM } from "@/config";
import { formatAmount, shortenMessage } from "@/lib/utils";
import { Platform, TrackerResponse } from "@/lib/types";

type PotfactoryMessageArgs = {
  method_name: string;
  sender: string;
  receiver: string;
  block_height: number;
  deposit: string;
  parsedArgs: any;
};

export async function trackPotfactory(startBlockHeight: number): Promise<TrackerResponse> {
  const { errors, data: potfactoryReceipts } = await nearQuery.fetchContractReceipts({
    queryName: "potfactoryReceipts",
    startBlockHeight: startBlockHeight,
  });

  if (errors) {
    console.log("Error fetching potfactory receipts", errors);
    return {
      endBlockHeight: 0,
      twitterMessages: [],
      telegramMessages: [],
    };
  }

  if (!potfactoryReceipts.length) {
    return {
      endBlockHeight: 0,
      twitterMessages: [],
      telegramMessages: [],
    };
  }

  const endBlockHeight = potfactoryReceipts.at(-1).block_height;

  const twitterMessages = await Promise.all(
    potfactoryReceipts.map((receipt: any) => {
      return formatMessage(receipt, "twitter");
    })
  );
  const telegramMessages = await Promise.all(
    potfactoryReceipts.map((receipt: any) => {
      return formatMessage(receipt, "telegram");
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

async function formatMessage(receipt: PotfactoryMessageArgs, platform: Platform): Promise<string | null> {
  const { method_name, sender, receiver, block_height, deposit, parsedArgs } = receipt;
  const parsedMessage = parsedArgs.message;
  const parsedProjectId = parsedArgs.project_id;
  const parsedChef = parsedArgs.chef;
  const potTag = receiver.split(".")[0];
  const projectIdTag = parsedProjectId?.split(".")[0];
  const [projectSocialTag, projectWebsite, donorTag, chefTag] = await Promise.all([
    nearQuery.getLinkTree(parsedProjectId).then((linkTree) => linkTree[platform] || projectIdTag || parsedProjectId),
    nearQuery.getLinkTree(parsedProjectId).then((linkTree) => linkTree.website || null),
    nearQuery.getLinkTree(sender).then((linkTree) => linkTree[platform] || sender),
    parsedChef && nearQuery.getLinkTree(parsedArgs.chef).then((linkTree) => linkTree[platform] || parsedChef),
  ]);

  const formattedDeposit = formatAmount(deposit, "near");

  if (Number(formattedDeposit) < DONATION_BROADCAST_MINIMUM) {
    return null;
  }

  let message = "";

  switch (method_name) {
    case "donate":
      message += platform === "twitter" ? `🫕 @potlock_ Pot Donation Alert! 🎉\n` : `🫕 Pot Donation Alert! 🎉\n`;
      message += `Donor: ${donorTag}\n`;
      message +=
        platform === "twitter"
          ? `Project: ${projectSocialTag}\n`
          : projectWebsite
          ? `Project: <a href="${projectWebsite}">${projectIdTag}</a>\n`
          : `Project: <a href="https://bos.potlock.org/?tab=project&projectId=${parsedProjectId}">${projectIdTag}</a>\n`;
      message += `Amount: ${formattedDeposit} NEAR\n`;
      message +=
        platform === "twitter"
          ? `Pot: ${potTag}\n`
          : `Pot: <a href="https://bos.potlock.org/?tab=pot&potId=${receiver}&nav=projects">${potTag}</a>\n`;
      if (parsedMessage) {
        const donationMessage = shortenMessage(parsedMessage, 150);
        message += `Message: "${donationMessage}"\n`;
      }
      break;

    case "chef_set_application_status":
      const status = parsedArgs.status;
      const statusEmoji = status === "Approved" ? "✅" : status === "Rejected" ? "❌" : "🔔";

      message += `${statusEmoji} Project ${projectSocialTag} ${status?.toLowerCase()} for ${receiver}\n`;
      if (parsedArgs.notes) {
        message += `Review Notes: "${parsedArgs.notes}"\n`;
      }
      break;

    case "assert_can_apply_callback":
      message += `📋 New project application for ${receiver}\n`;
      message += `Project: ${sender}\n`; // Assuming sender is the project id
      if (parsedMessage) {
        const applicationMessage = shortenMessage(parsedMessage, 150);
        message += `Message: "${applicationMessage}"\n`;
      }
      break;

    case "new":
      const potName = parsedArgs.pot_name || "";
      const maxProjects = parsedArgs.max_projects || "No limit";
      message += `🫕 New Pot Created: ${potName} 🎊\n`;
      const parsedDescription = parsedArgs.pot_description;
      if (parsedDescription) {
        const description = shortenMessage(parsedDescription, 150);
        message += `Description: "${description}"\n`;
      }
      if (chefTag) {
        message += `Chef: ${chefTag}\n`;
      }
      message += `Project Limit: ${maxProjects}\n`;
      break;

    default:
      message += `Transaction Alert: A transaction of type ${method_name} was processed from ${sender} to ${receiver}.\n`;
      break;
  }

  message += platform === "twitter" ? `https://bos.potlock.org/?tab=pot&potId=${receiver}&nav=projects` : "";

  return message;
}
