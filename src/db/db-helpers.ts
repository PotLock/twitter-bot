const dirPath = import.meta.dirname;
const db = Bun.file(`${dirPath}/db.json`);
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
