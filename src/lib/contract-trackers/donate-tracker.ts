import { nearQuery } from "../../near-query/client";
import { TrackerResponse } from "../types";
import { formatAmount } from "../utils";

type DonateTweetArgs = {
  donorId: string;
  recipientId: string;
  totalAmount: string;
  ftId: string;
  reffererId?: string;
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
        reffererId: receipt.parsedEvent.refferer_id,
        referrerFee: receipt.parsedEvent.referrer_fee,
      };

      return await formatTweetMessage(donateTweetArgs);
    })
  );

  return {
    endBlockHeight,
    tweetMessages,
  };
}

async function formatTweetMessage(tweetArgs: DonateTweetArgs) {
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
