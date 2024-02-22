import { GraphQLResponse, fetchGraphQL } from "./config";
import { potfactoryReceipts, potlockReceipts } from "./queries";

type QueryName = "potlockReceipts" | "potfactoryReceipts";

const querieData: Record<QueryName, Record<string, string>> = {
  potlockReceipts: {
    query: potlockReceipts,
    operationName: "PotlockReceipts",
  },
  potfactoryReceipts: {
    query: potfactoryReceipts,
    operationName: "PotfactoryReceipts",
  },
};

class NearQuery {
  async fetchContractReceipts({
    queryName,
    receiver,
    methodName,
    startBlockHeight,
  }: {
    queryName: QueryName;
    receiver?: string;
    methodName?: string;
    startBlockHeight: number;
  }): Promise<GraphQLResponse> {
    const { errors, data } = await fetchGraphQL({
      query: querieData[queryName].query,
      operationName: querieData[queryName].operationName,
      variables: { receiver, methodName, startBlockHeight },
    });

    if (errors) {
      return { errors };
    }

    try {
      const parsedData = data.markeljan_near_potlock_actions_v3_receipt.map(parseReceiptData);
      return { data: parsedData };
    } catch (error: any) {
      return { errors: [{ message: `Error parsing args: ${error.message}` }] };
    }
  }

  // Fetch the Twitter handle from the near.social contract
  async lookupTwitterHandle(accountId: string): Promise<string | null> {
    const response = await fetch("https://api.near.social/get", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        keys: [`${accountId}/profile/**`],
      }),
    });

    const data = await response.json();
    const twitterHandleRaw = data[accountId]?.profile?.linktree?.twitter;

    if (twitterHandleRaw) {
      // Remove unwanted patterns and characters
      const sanitizedHandle = sanitizeTwitterHandle(twitterHandleRaw);
      return `@${sanitizedHandle}`;
    } else {
      return null;
    }
  }
}

export const nearQuery = new NearQuery();

// Helper function to parse the receipt data
function parseReceiptData(receiptData: any) {
  try {
    const parsedArgs = JSON.parse(atob(receiptData.args));

    const parsedEventData = receiptData.raw_event ? JSON.parse(receiptData.raw_event) : {};
    const eventName = parsedEventData?.event;
    const parsedEvent = parsedEventData?.data?.length ? parsedEventData.data[0][eventName] : {};

    return { ...receiptData, parsedArgs, parsedEvent };
  } catch (error: any) {
    throw new Error(`Failed to parse args for data ${receiptData}: ${error.message}`);
  }
}

function sanitizeTwitterHandle(unsanitizedHandle: string): string {
  return unsanitizedHandle
    .replace(/^(https?:\/\/)?(www\.)?twitter\.com\//, "") // Remove URL prefixes
    .replace(/[^a-zA-Z0-9_]/g, "") // Remove invalid characters
    .substring(0, 15); // Enforce max length of 15 characters
}
