import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: Bun.env.OPENAI_API_KEY,
});
const TWEET_MODERATOR_PROMPT =
  "Analyze the given message for content that includes hate speech, threats. If any part of the message is found to violate these terms, replace that specific part with 'OMITTED'. Maintain the original meaning of the message as much as possible without revealing moderation. Keep the format of the message the same including new lines and emojis. Use JSON format with moderated_message:";

export async function moderateTweet(tweetMessage: string): Promise<string | null> {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: TWEET_MODERATOR_PROMPT },
      { role: "user", content: tweetMessage },
    ],
    model: "gpt-4-turbo-preview",
    response_format: { type: "json_object" },
    stream: false,
  });

  const completionResult = completion.choices[0].message.content;

  if (!completionResult) {
    return null;
  }

  const completionJson = JSON.parse(completionResult);
  const moderatedMessage = completionJson.moderated_message;

  if (!moderatedMessage) {
    return null;
  }

  return moderatedMessage;
}
