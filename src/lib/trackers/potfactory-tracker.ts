import { nearQuery } from "@/main";
import { TrackerResponse, formatAmount, shortenMessage } from "@/lib/trackers/utils";

type PotfactoryTweetArgs = {
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
      tweetMessages: [],
    };
  }

  if (!potfactoryReceipts.length) {
    return {
      endBlockHeight: 0,
      tweetMessages: [],
    };
  }

  const endBlockHeight = potfactoryReceipts.at(-1).block_height;

  const tweetMessages = await Promise.all(
    potfactoryReceipts.map(async (receipt: any) => {
      const tweetMessage = await formatTweetMessage(receipt);
      return tweetMessage;
    })
  );

  return {
    endBlockHeight,
    tweetMessages,
  };
}

async function formatTweetMessage(receipt: PotfactoryTweetArgs): Promise<string> {
  const { method_name, sender, receiver, block_height, deposit, parsedArgs } = receipt;
  const parsedMessage = parsedArgs.message;
  const parsedProjectId = parsedArgs.project_id;

  const projectTag = (await nearQuery.lookupTwitterHandle(parsedProjectId)) || parsedProjectId;

  const formattedDeposit = formatAmount(deposit, "near");

  let message = "";

  switch (method_name) {
    case "donate":
      const donorTag = (await nearQuery.lookupTwitterHandle(sender)) || sender;
      const recipientTag = (await nearQuery.lookupTwitterHandle(receiver)) || receiver;

      message += `🫕 Pot Donation Alert! 🎉\n`;
      message += `Donor: ${donorTag}\n`;
      message += `Project: ${projectTag}\n`;
      message += `Amount: ${formattedDeposit} NEAR\n`;
      message += `Pot: ${recipientTag}\n`;
      if (parsedMessage) {
        const donationMessage = shortenMessage(parsedMessage, 150);
        message += `Message: "${donationMessage}"\n`;
      }
      break;

    case "chef_set_application_status":
      const status = parsedArgs.status;
      const statusEmoji = status === "Approved" ? "✅" : status === "Rejected" ? "❌" : "🔔";

      message += `${statusEmoji} Project ${projectTag} ${status?.toLowerCase()} for ${receiver}\n`;
      if (parsedArgs.notes) {
        message += `Notes: "${parsedArgs.notes}"\n`;
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
      const parsedChef = parsedArgs.chef;
      const maxProjects = parsedArgs.max_projects || "No limit";
      message += `🫕 New Pot Created: ${potName} 🎊\n`;
      const parsedDescription = parsedArgs.pot_description;
      if (parsedDescription) {
        const description = shortenMessage(parsedDescription, 150);
        message += `Description: "${description}"\n`;
      }
      if (parsedChef) {
        const chefTag = (await nearQuery.lookupTwitterHandle(parsedChef)) || parsedChef;
        message += `Chef: ${chefTag}\n`;
      }
      message += `Project Limit: ${maxProjects}\n`;
      break;

    default:
      message += `Transaction Alert: A transaction of type ${method_name} was processed from ${sender} to ${receiver}.\n`;
      break;
  }

  message += `https://bos.potlock.org/?tab=pot&potId=${receiver}`;

  return message;
}
