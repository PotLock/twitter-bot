import { nearQuery } from "./near-query/client";

type TweetArgs = {
  donorId: string;
  recipientId: string;
  totalAmount: string;
  ftId: string;
  reffererId?: string;
  referrerFee?: string;
};

const FT_DECIMALS_MAP: { [key: string]: number } = {
  near: 24,
  usd: 6,
};

export async function trackDonations(startBlockHeight: number, endBlockHeight: number) {
  const { errors, data: potlockReceipts } = await nearQuery.fetchContractReceipts({
    startBlockHeight,
    endBlockHeight,
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

  console.log(potlockReceipts.length, "donate receipts found");

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
  return tweetMessages;
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
  let message = `🎉 New Donation Alert! 🎉\n`;
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

// helper
const formatAmount = (amount: string, ftId: string) => {
  const decimals = FT_DECIMALS_MAP[ftId] ?? 24;
  return (parseInt(amount) / 10 ** decimals).toFixed(2);
};
