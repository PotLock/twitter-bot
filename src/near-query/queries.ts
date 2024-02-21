export const potlockReceipts = `
  query PotlockReceipts($receiver: String!, $methodName: String!, $startBlockHeight: numeric!) {
    markeljan_near_potlock_actions_v3_receipt(
      where: {
        status: {_eq: "SUCCESS"},
        block_height: {_gte: $startBlockHeight},
        receiver: {_eq: $receiver},
        method_name: {_eq: $methodName},
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

export const potfactoryReceipts = `
  query PotfactoryReceipts($startBlockHeight: numeric!){
    markeljan_near_potlock_actions_v3_receipt(
      where: {
        status: {_eq: "SUCCESS"},
        block_height: {_gte: $startBlockHeight},
        receiver: {_regex: ".*v1.potfactory.potlock.near"},
        _and: [
          {method_name: {_in: ["donate", "chef_set_application_status", "new", "assert_can_apply_callback"]}}
        ]
      },
      order_by: {block_height: asc}
    ) {
      gas
      raw_event
      status
      sender
      receiver
      receipt_id
      method_name
      deposit
      args
      block_height
    }
  }
`;
