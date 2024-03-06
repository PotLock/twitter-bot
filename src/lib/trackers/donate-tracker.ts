import { nearQuery } from "@/main";
import { TrackerResponse, formatAmount } from "@/lib/trackers/utils";
import { DONATION_BROADCAST_MINIMUM } from "@/config";

type DonateTweetArgs = {
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
      tweetMessages: [],
    };
  }

  if (!donateReceipts.length) {
    return {
      endBlockHeight: 0,
      tweetMessages: [],
    };
  }

  const endBlockHeight = donateReceipts.at(-1).block_height;

  // return an array of tweet messages
  const tweetMessages = await Promise.all(
    donateReceipts.map(async (receipt: any) => {
      const donateTweetArgs: DonateTweetArgs = {
        recipientId: receipt.parsedEvent.recipient_id,
        donorId: receipt.parsedEvent.donor_id,
        totalAmount: receipt.parsedEvent.total_amount,
        ftId: receipt.parsedEvent.ft_id,
        referrerId: receipt.parsedEvent.referer_id,
        referrerFee: receipt.parsedEvent.referrer_fee,
      };

      return await formatTweetMessage(donateTweetArgs);
    })
  );

  // remove any null messages
  const filteredMessages = tweetMessages.filter((message) => message !== null);

  return {
    endBlockHeight,
    tweetMessages: filteredMessages,
  };
}

async function formatTweetMessage(tweetArgs: DonateTweetArgs) {
  const { donorId, recipientId, totalAmount, ftId, referrerId, referrerFee } = tweetArgs;

  const [donorTag, recipientTag, referrerTag] = await Promise.all([
    getAccountTag(donorId),
    getAccountTag(recipientId),
    referrerId && getAccountTag(referrerId),
  ]);

  // Format the totalAmount to a more readable form, assuming it's in the smallest unit of the token
  const formattedTotal = formatAmount(totalAmount, ftId);

  if (Number(formattedTotal) < DONATION_BROADCAST_MINIMUM) {
    return null;
  }

  // Construct the base message
  let message = `🎉 Project Donation Alert! 🎉\n`;
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

// utility function to get the twitter handle from near.social
async function getAccountTag(accountId: string) {
  const handle = await nearQuery.lookupTwitterHandle(accountId);
  return handle ?? accountId;
}
