import { constants } from "node:fs";
import { open } from "node:fs/promises";

const MAX_TAIL_BYTES = 256 * 1024;
const MAX_LOG_AGE_MS = 5 * 60 * 1000;
// The packaged provider is pinned to --ts-format=utc so marker age is unambiguous across containers.
const processedHeightPattern = /^\[(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})\]\s+<Controller>\s+Processed height:\s+(\d+),\s+\d+(?:\.\d+)?%,/;

function parseMarkerTimestamp(match: RegExpExecArray): number | null {
  const parts = match.slice(1, 8).map(Number) as [number, number, number, number, number, number, number];
  if (parts.some((part) => !Number.isInteger(part))) return null;
  const [year, month, day, hour, minute, second, millisecond] = parts;
  const timestamp = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
    || parsed.getUTCHours() !== hour
    || parsed.getUTCMinutes() !== minute
    || parsed.getUTCSeconds() !== second
    || parsed.getUTCMilliseconds() !== millisecond
  ) return null;
  return timestamp;
}

export interface FulcrumLogProgress {
  getIndexedHeight(): Promise<number | null>;
}

export function createFulcrumLogProgress({
  path,
  maxTailBytes = MAX_TAIL_BYTES,
  maxAgeMs = MAX_LOG_AGE_MS,
  nowMs = Date.now,
}: {
  path: string;
  maxTailBytes?: number;
  maxAgeMs?: number;
  nowMs?: () => number;
}): FulcrumLogProgress {
  return {
    async getIndexedHeight() {
      let file;
      try {
        file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
        const stats = await file.stat();
        if (!stats.isFile() || stats.size <= 0) return null;
        const now = nowMs();
        if (!Number.isFinite(now) || stats.mtimeMs < now - maxAgeMs || stats.mtimeMs > now + 1_000) return null;

        const length = Math.min(stats.size, maxTailBytes);
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await file.read(buffer, 0, length, stats.size - length);
        const text = buffer.subarray(0, bytesRead).toString("utf8");
        const lines = text.split("\n");
        if (!text.endsWith("\n")) lines.pop();
        if (stats.size > length) lines.shift();

        for (let index = lines.length - 1; index >= 0; index -= 1) {
          const match = processedHeightPattern.exec(lines[index] ?? "");
          if (!match) continue;
          const markerTimestamp = parseMarkerTimestamp(match);
          if (markerTimestamp === null || markerTimestamp < now - maxAgeMs || markerTimestamp > now + 1_000) return null;
          const height = Number(match[8]);
          if (Number.isSafeInteger(height) && height >= 0) return height;
        }
        return null;
      } catch {
        return null;
      } finally {
        await file?.close().catch(() => undefined);
      }
    },
  };
}
