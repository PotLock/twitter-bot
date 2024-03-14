import { getTelegramChatIds, removeTelegramChatId, storeTelegramChatId } from "@/kv/actions";
import TelegramBot from "node-telegram-bot-api";

const token = `${process.env.TELEGRAM_BOT_TOKEN}`;

const isProduction = Bun.env.NODE_ENV === "production";

export const bot = new TelegramBot(token, { polling: true });

// on start of the bot, get the chat id and store it in the kv store
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await storeTelegramChatId({ chatId });
  bot.sendMessage(chatId, "Subscribed to Potlock events ✅");
});

bot.onText(/\/stop/, async (msg) => {
  const chatId = msg.chat.id;
  await removeTelegramChatId({ chatId });
  bot.sendMessage(chatId, "Unsubscribed from Potlock events ❌");
});

export async function sendTelegramMessage(telegramMessage: string) {
  const chatIds = await getTelegramChatIds();

  // Function to send a message to a single chat ID
  const sendMessage = async (chatId: string) => {
    await bot.sendMessage(chatId, telegramMessage);
  };

  // Function to process a batch of chat IDs
  const processBatch = async (batch: string[]) => {
    await Promise.all(batch.map((chatId) => sendMessage(chatId)));
  };

  // Function to introduce a delay between batches
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Process the chat IDs in batches of 29
  for (let i = 0; i < chatIds.length; i += 29) {
    const batch = chatIds.slice(i, i + 29);
    if (isProduction) {
      await processBatch(batch);
    } else {
      console.log(`Simulating Telegram message: ${telegramMessage} for ${batch.length} chat IDs`);
    }

    // Wait for 31 seconds before processing the next batch, if there are more chat IDs to process
    if (i + 29 < chatIds.length) {
      await delay(31000);
    }
  }

  return chatIds;
}
