import { nearQuery } from "@/main";
import { DONATION_BROADCAST_MINIMUM } from "@/config";
import { formatAmount } from "@/lib/utils";
import { Platform, TrackerResponse } from "@/lib/types";

type DonateMessageArgs = {
  donorId: string;
  recipientId: string;
  totalAmount: string;
  ftId: string;
  referrerId?: string;
  referrerFee?: string;
};

export async function trackDonate(startBlockHeight: number): Promise<TrackerResponse> {
  const { errors, data: donateReceipts } = await nearQuery.fetchContractReceipts({
    queryName: "potlockReceipts",
    startBlockHeight,
    receiver: "donate.potlock.near",
    methodName: "donate",
  });

  if (errors) {
    console.log("Error fetching donate receipts", errors);
    return {
      endBlockHeight: 0,
      twitterMessages: [],
      telegramMessages: [],
    };
  }

  if (!donateReceipts.length) {
    return {
      endBlockHeight: 0,
      twitterMessages: [],
      telegramMessages: [],
    };
  }

  const endBlockHeight = donateReceipts.at(-1).block_height;
  // return an array of tweet messages
  const twitterMessages = await Promise.all(
    donateReceipts.map((receipt: any) => {
      const donateMessageArgs: DonateMessageArgs = {
        recipientId: receipt.parsedEvent.recipient_id || receipt.parsedArgs.recipient_id,
        donorId: receipt.parsedEvent.donor_id || receipt.sender,
        totalAmount: receipt.parsedEvent.total_amount || receipt.deposit,
        ftId: receipt.parsedEvent.ft_id || "near",
        referrerId: receipt.parsedEvent.referer_id,
        referrerFee: receipt.parsedEvent.referrer_fee,
      };
      return formatMessage(donateMessageArgs, "twitter");
    })
  );

  const telegramMessages = await Promise.all(
    donateReceipts.map((receipt: any) => {
      const donateMessageArgs: DonateMessageArgs = {
        recipientId: receipt.parsedEvent.recipient_id || receipt.parsedArgs.recipient_id,
        donorId: receipt.parsedEvent.donor_id || receipt.sender,
        totalAmount: receipt.parsedEvent.total_amount || receipt.deposit,
        ftId: receipt.parsedEvent.ft_id || "near",
        referrerId: receipt.parsedEvent.referer_id,
        referrerFee: receipt.parsedEvent.referrer_fee,
      };
      return formatMessage(donateMessageArgs, "telegram");
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

async function formatMessage(messageArgs: DonateMessageArgs, platform: Platform) {
  const { donorId, recipientId, totalAmount, ftId, referrerId, referrerFee } = messageArgs;
  const projectIdTag = recipientId.split(".")[0];

  const [donorTag, projectSocialTag, projectWebsite, referrerTag] = await Promise.all([
    nearQuery.getLinkTree(donorId).then((linkTree) => linkTree[platform] || donorId),
    nearQuery.getLinkTree(recipientId).then((linkTree) => linkTree[platform] || recipientId),
    nearQuery.getLinkTree(recipientId).then((linkTree) => linkTree.website || null),
    referrerId && nearQuery.getLinkTree(referrerId).then((linkTree) => linkTree[platform] || referrerId),
  ]);

  // Format the totalAmount to a more readable form, assuming it's in the smallest unit of the token
  const formattedTotal = formatAmount(totalAmount, ftId);

  if (Number(formattedTotal) < DONATION_BROADCAST_MINIMUM) {
    return null;
  }

  // Construct the base message
  let message =
    platform === "twitter" ? `🎉 @potlock_ Project Donation Alert! 🎉\n` : `🎉 Project Donation Alert! 🎉\n`;
  message += `Donor: ${donorTag}\n`;
  message +=
    platform === "twitter"
      ? `Project: ${projectSocialTag}\n`
      : projectWebsite
      ? `Project: <a href="${projectWebsite}">${projectIdTag}</a>\n`
      : `Project: ${projectIdTag}\n`;
  message += `Amount: ${formattedTotal} ${ftId.toUpperCase()}\n`;

  // Include referrer information if present
  if (referrerTag && referrerFee) {
    const formattedReferrerFee = formatAmount(referrerFee, ftId);
    message += `Referrer: ${referrerTag}\n`;
    message += `Referrer Fee: ${formattedReferrerFee} ${ftId.toUpperCase()}\n`;
  }

  // add project link
  message +=
    platform === "twitter"
      ? `https://bos.potlock.org/?tab=project&projectId=${recipientId}`
      : `<a href="https://bos.potlock.org/?tab=project&projectId=${recipientId}">View on Potlock</a>`;

  return message;
}
