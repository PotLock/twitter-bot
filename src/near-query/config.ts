export const API_URL = "https://near-queryapi.api.pagoda.co/v1/graphql";

export type GraphQLResponse<T = any> = {
  data?: T;
  errors?: { message: string }[];
};

export async function fetchGraphQL({
  query,
  hasuraRole,
  operationName,
  variables = {},
}: {
  query: string;
  hasuraRole: string;
  operationName: string;
  variables: Record<string, any>;
}): Promise<GraphQLResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "X-Hasura-Role": hasuraRole,
    },
    body: JSON.stringify({
      query,
      variables,
      operationName,
    }),
  });

  return (await response.json()) as GraphQLResponse;
}
