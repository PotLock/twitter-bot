import { kv } from "@vercel/kv";

// add the telegram chat id tot he list of chat ids using kv.lpush
export async function storeTelegramChatId({ chatId }: { chatId: string | number }) {
  // use a set so that we don't have duplicate chat ids
  await kv.sadd("telegramChatIds", chatId);
}

// remove the telegram chat id from the list of chat ids using kv.lrem
export async function removeTelegramChatId({ chatId }: { chatId: string | number }) {
  await kv.srem("telegramChatIds", chatId);
}

// get the list of chat ids using kv.lrange
export async function getTelegramChatIds() {
  const chatIds = await kv.smembers("telegramChatIds");
  return chatIds;
}
