import { createHmac } from "crypto";
import OAuth from "oauth-1.0a";

const TWITTER_CONSUMER_KEY = `${process.env.TWITTER_CONSUMER_KEY}`;
const TWITTER_CONSUMER_SECRET = `${process.env.TWITTER_CONSUMER_SECRET}`;
const TWITTER_ACCESS_TOKEN = `${process.env.TWITTER_ACCESS_TOKEN}`;
const TWITTER_TOKEN_SECRET = `${process.env.TWITTER_TOKEN_SECRET}`;

const NODE_ENV = process.env.NODE_ENV;

const oauth = new OAuth({
  consumer: { key: TWITTER_CONSUMER_KEY, secret: TWITTER_CONSUMER_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return createHmac("sha1", key).update(base_string).digest("base64");
  },
});

export async function sendTweet(tweetMessage: string) {
  const request_data = {
    url: "https://api.twitter.com/2/tweets",
    method: "POST",
  };

  if (NODE_ENV === "development") {
    console.log("Simulating Tweet:\n", tweetMessage);
    return;
  } else {
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
}
