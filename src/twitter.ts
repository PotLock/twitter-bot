import { createHmac } from "crypto";
import OAuth from "oauth-1.0a";

const TWITTER_CONSUMER_KEY = `${process.env.TWITTER_CONSUMER_KEY}`;
const TWITTER_CONSUMER_SECRET = `${process.env.TWITTER_CONSUMER_SECRET}`;
const TWITTER_ACCESS_TOKEN = `${process.env.TWITTER_ACCESS_TOKEN}`;
const TWITTER_TOKEN_SECRET = `${process.env.TWITTER_TOKEN_SECRET}`;

const oauth = new OAuth({
  consumer: { key: TWITTER_CONSUMER_KEY, secret: TWITTER_CONSUMER_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return createHmac("sha1", key).update(base_string).digest("base64");
  },
});

let tweetQueue: string[] = [];
let isProcessing = false;

export async function sendTweet(tweetMessage: string) {
  tweetQueue.push(tweetMessage);
  await processQueue();
}

async function executeTweetRequest(tweetMessage: string) {
  const request_data = {
    url: "https://api.twitter.com/2/tweets",
    method: "POST",
  };

  try {
    const response = await fetch(request_data.url, {
      method: request_data.method,
      body: JSON.stringify({ text: tweetMessage }),
      headers: {
        "Content-Type": "application/json",
        ...oauth.toHeader(oauth.authorize(request_data, { key: TWITTER_ACCESS_TOKEN, secret: TWITTER_TOKEN_SECRET })),
      },
    });
    const body = await response.json();
    console.log(body);
  } catch (e) {
    console.log(e);
  }
}

async function processQueue() {
  if (isProcessing || tweetQueue.length === 0) return;

  isProcessing = true;
  const nextTweet = tweetQueue.shift();

  if (!nextTweet) {
    isProcessing = false;
    return;
  } else {
    process.env.NODE_ENV === "production"
      ? await executeTweetRequest(nextTweet)
      : console.log("Simulating Tweet:", nextTweet);
  }

  isProcessing = false;
  if (tweetQueue.length > 0) {
    setTimeout(processQueue, 15000); // Wait for 15 seconds before sending the next tweet
  }
}
