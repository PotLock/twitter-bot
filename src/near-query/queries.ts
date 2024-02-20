export const potlockReceipts = `
  query PotlockReceipts($receiver: String!, $methodName: String!, $startBlockHeight: numeric!) {
    markeljan_near_potlock_actions_v3_receipt(
      where: {
        receiver: {_eq: $receiver},
        method_name: {_eq: $methodName},
        block_height: {_gte: $startBlockHeight},
        status: {_eq: "SUCCESS"}
      }
      order_by: {block_height: asc}
    ) {
      block_height
      gas
      status
      sender
      receiver
      receipt_id
      method_name
      deposit
      args
      raw_event
    }
  }
`;
