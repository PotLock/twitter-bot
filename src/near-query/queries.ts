export const potlockReceipts = `
  query PotlockReceipts($receiver: String!, $methodName: String!, $startBlockHeight: numeric!, $endBlockHeight: numeric!) {
    markeljan_near_potlock_actions_v3_receipt(
      where: {
        receiver: {_eq: $receiver},
        method_name: {_eq: $methodName},
        block_height: {_gte: $startBlockHeight, _lte: $endBlockHeight},
        status: {_eq: "SUCCESS"}
      }
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
