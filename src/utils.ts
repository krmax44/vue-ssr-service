import { z } from "zod";

export class RenderError extends Error {}

export type RootProps = Record<string, unknown>;

export const requestSchema = z.object({
  entryName: z.string(),
  props: z.record(z.string(), z.unknown()),
});

/**
 * Reads a ReadableStream and writes the data to a provided function.
 * @param stream - The ReadableStream to read from.
 * @param write - The function to write the data to.
 * @returns A promise that resolves when the stream is fully read.
 */
export async function readStream(
  stream: ReadableStream<any>,
  write: (data: string) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { done: isDone, value } = await reader.read();

    if (isDone) {
      return;
    }

    write(decoder.decode(value, { stream: true }));
  }
}

/**
 * Converts a ReadableStream to a string.
 * @param stream - The ReadableStream to convert to a string.
 * @returns The utf-8 decoded string.
 */
export async function readableStreamToString(
  stream: ReadableStream<any>,
): Promise<string> {
  let data = "";

  await readStream(stream, (chunk) => {
    data += chunk;
  });

  return data;
}
