import { nearQuery } from "@/main";
import { DONATION_BROADCAST_MINIMUM } from "@/config";
import { formatAmount } from "@/lib/trackers/utils";
import { Platform, TrackerResponse } from "@/lib/trackers/types";

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
        recipientId: receipt.parsedEvent.recipient_id,
        donorId: receipt.parsedEvent.donor_id,
        totalAmount: receipt.parsedEvent.total_amount,
        ftId: receipt.parsedEvent.ft_id,
        referrerId: receipt.parsedEvent.referer_id,
        referrerFee: receipt.parsedEvent.referrer_fee,
      };

      return formatMessage(donateMessageArgs, "twitter");
    })
  );

  const telegramMessages = await Promise.all(
    donateReceipts.map((receipt: any) => {
      const donateMessageArgs: DonateMessageArgs = {
        recipientId: receipt.parsedEvent.recipient_id,
        donorId: receipt.parsedEvent.donor_id,
        totalAmount: receipt.parsedEvent.total_amount,
        ftId: receipt.parsedEvent.ft_id,
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

  const [donorTag, recipientTag, referrerTag] = await Promise.all([
    nearQuery.lookupHandles(donorId).then((handles) => handles[platform] || donorId),
    nearQuery.lookupHandles(recipientId).then((handles) => handles[platform] || recipientId),
    referrerId && nearQuery.lookupHandles(referrerId).then((handles) => handles[platform] || referrerId),
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
  message += `Project: ${recipientTag}\n`;
  message += `Amount: ${formattedTotal} ${ftId.toUpperCase()}\n`;

  // Include referrer information if present
  if (referrerTag && referrerFee) {
    const formattedReferrerFee = formatAmount(referrerFee, ftId);
    message += `Referrer: ${referrerTag}\n`;
    message += `Referrer Fee: ${formattedReferrerFee} ${ftId.toUpperCase()}\n`;
  }

  // add project link
  message += `https://bos.potlock.org/?tab=project&projectId=${recipientId}`;

  return message;
}
