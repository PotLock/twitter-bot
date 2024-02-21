import { nearQuery } from "../../near-query/client";
import { formatAmount, shortenMessage } from "../utils";

type PotFactoryMethods = "donate" | "chef_set_application_status" | "new" | "assert_can_apply_callback";

type TrackStatusChangesResponse = {
  endBlockHeight: number;
  tweetMessages: string[];
};

export async function trackPotfactory(startBlockHeight: number): Promise<TrackStatusChangesResponse | undefined> {
  const { errors, data: potfactoryReceipts } = await nearQuery.fetchContractReceipts({
    queryName: "potfactoryReceipts",
    startBlockHeight: startBlockHeight,
  });

  if (errors) {
    console.log("Error fetching potfactory receipts", errors);
    return;
  }

  if (!potfactoryReceipts.length) {
    console.log("No new status update receipts found");
    return;
  }

  const endBlockHeight = potfactoryReceipts[potfactoryReceipts.length - 1]?.block_height;

  const tweetMessages = await Promise.all(
    potfactoryReceipts.map(async (receipt: any) => {
      // console.log("unparsed potfactory receipt", receipt);
      const tweetMessage = await formatTweetMessage(receipt);
      return tweetMessage;
    })
  );

  return {
    endBlockHeight,
    tweetMessages,
  };
}

type PotFactoryReceipt = {
  method_name: string;
  sender: string;
  receiver: string;
  block_height: number;
  deposit: string;
  parsedArgs: any;
};

async function formatTweetMessage(receipt: PotFactoryReceipt): Promise<string> {
  const { method_name, sender, receiver, block_height, deposit, parsedArgs } = receipt;

  const formattedDeposit = formatAmount(deposit, "near");

  let message = "";

  switch (method_name) {
    case "donate":
      const donorTag = (await nearQuery.lookupTwitterHandle(sender)) || sender;
      const recipientTag = (await nearQuery.lookupTwitterHandle(receiver)) || receiver;
      const donationMessage = shortenMessage(parsedArgs.message, 150);

      message += `🫕 Pot Donation Alert! 🎉\n`;
      message += `Donor: ${donorTag}\n`;
      message += `Recipient: ${recipientTag}\n`;
      message += `Amount: ${formattedDeposit} NEAR\n`;
      if (donationMessage) {
        message += `Message: "${donationMessage}"\n`;
      }
      break;

    case "chef_set_application_status":
      const projectTag = (await nearQuery.lookupTwitterHandle(parsedArgs.project_id)) || parsedArgs.project_id;
      const status = parsedArgs.status;
      const statusEmoji = status === "Approved" ? "✅" : status === "Rejected" ? "❌" : "🔔";

      message += `${statusEmoji} Project ${projectTag} ${status?.toLowerCase()} for ${receiver}\n`;
      if (parsedArgs.notes) {
        message += `Notes: "${parsedArgs.notes}"\n`;
      }
      break;

    case "assert_can_apply_callback":
      const applicationMessage = shortenMessage(parsedArgs.message, 150);

      message += `📋 New project application for ${receiver}\n`;
      message += `Project: ${sender}\n`; // Assuming sender is the project id
      if (applicationMessage) {
        message += `Message: "${applicationMessage}"\n`;
      }
      break;

    case "new":
      const potName = parsedArgs.pot_name || "Unnamed Pot";
      const description = shortenMessage(parsedArgs.pot_description, 150) || "No description provided.";
      const chefTag = (await nearQuery.lookupTwitterHandle(parsedArgs.chef)) || parsedArgs.chef;
      const maxProjects = parsedArgs.max_projects || "No limit";

      message += `🫕 New Pot Created: ${potName} 🎊\n`;
      message += `Description: "${description}"\n`;
      message += `Managed by: ${chefTag}\n`;
      message += `Maximum Projects: ${maxProjects}\n`;
      break;

    default:
      message += `Transaction Alert: A transaction of type ${method_name} was processed from ${sender} to ${receiver}.\n`;
      break;
  }

  message += `More details: https://bos.potlock.org/?tab=pot&potId=${receiver}`;

  return message;
}
