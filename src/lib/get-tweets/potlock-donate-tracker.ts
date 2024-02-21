import { nearQuery } from "../../near-query/client";
import { formatAmount } from "../utils";

type TweetArgs = {
  donorId: string;
  recipientId: string;
  totalAmount: string;
  ftId: string;
  reffererId?: string;
  referrerFee?: string;
};

type TrackDonationsResponse = {
  endBlockHeight: number;
  tweetMessages: string[];
};

export async function trackDonations(startBlockHeight: number): Promise<TrackDonationsResponse | undefined> {
  const { errors, data: potlockReceipts } = await nearQuery.fetchContractReceipts({
    queryName: "potlockReceipts",
    startBlockHeight,
    receiver: "donate.potlock.near",
    methodName: "donate",
  });

  if (errors) {
    console.log("Error fetching potlock receipts", errors);
    return;
  }

  if (!potlockReceipts.length) {
    console.log("No new donate receipts found");
    return;
  }

  const endBlockHeight = potlockReceipts[potlockReceipts.length - 1].block_height;

  // return an array of tweet messages
  const tweetMessages = await Promise.all(
    potlockReceipts.map(async (receipt: any) => {
      const tweetArgs: TweetArgs = {
        recipientId: receipt.parsedEvent.recipient_id,
        donorId: receipt.parsedEvent.donor_id,
        totalAmount: receipt.parsedEvent.total_amount,
        ftId: receipt.parsedEvent.ft_id,
        reffererId: receipt.parsedEvent.refferer_id,
        referrerFee: receipt.parsedEvent.referrer_fee,
      };

      return await formatTweetMessage(tweetArgs);
    })
  );

  // return the array of tweet messages
  return {
    endBlockHeight,
    tweetMessages,
  };
}

async function formatTweetMessage(tweetArgs: TweetArgs) {
  const { donorId, recipientId, totalAmount, ftId, reffererId, referrerFee } = tweetArgs;

  const [donorTag, recipientTag, reffererTag] = await Promise.all([
    nearQuery.lookupTwitterHandle(donorId).then((handle) => handle ?? donorId),
    nearQuery.lookupTwitterHandle(recipientId).then((handle) => handle ?? recipientId),
    reffererId
      ? nearQuery.lookupTwitterHandle(reffererId).then((handle) => handle ?? reffererId)
      : Promise.resolve(reffererId),
  ]);

  // Format the totalAmount to a more readable form, assuming it's in the smallest unit of the token
  const formattedTotal = formatAmount(totalAmount, ftId);

  // Construct the base message
  let message = `🎉 Project Donation Alert! 🎉\n`;
  message += `Donor: ${donorTag}\n`;
  message += `Recipient: ${recipientTag}\n`;
  message += `Amount: ${formattedTotal} ${ftId.toUpperCase()}\n`;

  // Include referrer information if present
  if (reffererId && referrerFee) {
    const formattedReferrerFee = formatAmount(referrerFee, ftId);
    message += `Referrer: ${reffererTag}\n`;
    message += `Referrer Fee: ${formattedReferrerFee} ${ftId.toUpperCase()}\n`;
  }

  // add project link
  message += `https://bos.potlock.org/?tab=project&projectId=${recipientId}`;

  return message;
}
