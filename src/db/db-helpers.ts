import { START_BLOCK_HEIGHT } from "@/config";

const db = await getOrCreateDB();
const data = await db.json();

export async function getLastProcessedBlockHeight(): Promise<number> {
  try {
    return data.lastProcessedBlockHeight;
  } catch (err) {
    console.error(err);
    return 0;
  }
}

export async function setLastProcessedBlockHeight(blockHeight: number) {
  try {
    data.lastProcessedBlockHeight = blockHeight;
    await Bun.write(db, JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
}

async function getOrCreateDB() {
  const filePath = import.meta.dirname + "/db.json";
  if (!(await Bun.file(filePath).exists())) {
    await Bun.write(
      Bun.file(filePath),
      JSON.stringify({
        lastProcessedBlockHeight: START_BLOCK_HEIGHT,
      })
    );
  }
  return Bun.file(filePath);
}
