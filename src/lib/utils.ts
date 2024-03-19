const FT_DECIMALS_MAP: { [key: string]: number } = {
  near: 24,
  usd: 6,
};

export const formatAmount = (amount: string, ftId: string) => {
  const decimals = FT_DECIMALS_MAP[ftId] ?? 24;
  return (parseInt(amount) / 10 ** decimals).toFixed(2);
};

export function shortenMessage(message: string, maxLength: number): string {
  return message.substring(0, maxLength) + (message.length > maxLength ? "..." : "");
}

const socialDomains = ["twitter.com", "x.com", "t.me", "telegram.me"];

export function sanitizeHandle(unsanitizedHandle: string): string | null {
  if (!unsanitizedHandle) return null;
  unsanitizedHandle = unsanitizedHandle?.trim();

  if (unsanitizedHandle.length < 4) return null;

  const isSocialUrl = socialDomains.some((domain) => unsanitizedHandle.includes(domain));

  if ((!isSocialUrl && unsanitizedHandle.includes(".")) || unsanitizedHandle.includes("://")) return null; // Return null if the handle is not a social media URL
  if (isSocialUrl) unsanitizedHandle = unsanitizedHandle && unsanitizedHandle.split("/").pop() || "";

  // instead of removing invalid characters, we should just check if the handle is valid
  if (!/^[a-zA-Z0-9_]+$/.test(unsanitizedHandle)) return null; // Return null if the handle contains invalid characters

  // Check the length of the sanitized handle to ensure it's within the valid range
  if (unsanitizedHandle.length < 4 || unsanitizedHandle.length > 15) return null; // Return null if the handle is too short or too long

  return `@${unsanitizedHandle}`;
}
