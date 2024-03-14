import { kv } from "@vercel/kv";

/// KV ACTIONS ///
export async function setLastProcessedBlockHeight(height: number) {
  await kv.set("lastProcessedBlockHeight", height);
}

export async function getLastProcessedBlockHeight(): Promise<number | null> {
  const lastProcessedBlockHeight = await kv.get<string>("lastProcessedBlockHeight");
  if (lastProcessedBlockHeight === null) {
    return null;
  }
  return parseInt(lastProcessedBlockHeight);
}

/// TELEGRAM ACTIONS ///
export async function storeTelegramChatId({ chatId }: { chatId: string | number }) {
  await kv.sadd("telegramChatIds", chatId);
}

export async function removeTelegramChatId({ chatId }: { chatId: string | number }) {
  await kv.srem("telegramChatIds", chatId);
}

export async function getTelegramChatIds() {
  const chatIds = await kv.smembers("telegramChatIds");
  return chatIds;
}