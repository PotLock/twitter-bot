import { GraphQLResponse, fetchGraphQL } from "@/api/graphql/fetch";
import { QueryName, queryMap } from "@/api/graphql/queries";

export default class NearQuery {
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
    const { query, operationName } = queryMap.get(queryName) || {};
    if (!query || !operationName) {
      return { errors: [{ message: `Query not found for queryName: ${queryName}` }] };
    }
    const { errors, data } = await fetchGraphQL({
      query,
      operationName,
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

  // Fetch twitter handle from near.social
  async lookupHandles(accountId: string): Promise<{
    twitter: string | null;
    telegram: string | null;
  }> {
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
    const telegramHandleRaw = data[accountId]?.profile?.linktree?.telegram;

    return {
      twitter: twitterHandleRaw ? sanitizeHandle(twitterHandleRaw) : null,
      telegram: telegramHandleRaw ? sanitizeHandle(telegramHandleRaw) : null,
    };
  }
}
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

// Helper function to sanitize invalid twitter handles add @ prefix
function sanitizeHandle(unsanitizedHandle: string): string {
  const sanitizedHandle = unsanitizedHandle
    .replace(/^(https?:\/\/)?(www\.)?(twitter\.com\/|t\.me\/)|[^a-zA-Z0-9_]/g, "") // Remove URL prefixes
    .substring(0, 15); // Enforce max length of 15 characters
  return `@${sanitizedHandle}`;
}
