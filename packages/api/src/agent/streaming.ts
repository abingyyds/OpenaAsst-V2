import type { AgentMessage } from '@openasst/types';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

export function createSSEStream(
  generator: AsyncGenerator<AgentMessage>,
): { readable: ReadableStream; headers: Record<string, string> } {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const message of generator) {
          const data = `data: ${JSON.stringify(message)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const data = `data: ${JSON.stringify({ type: 'error', content: errMsg })}\n\n`;
        controller.enqueue(encoder.encode(data));
      } finally {
        controller.close();
      }
    },
  });

  return { readable, headers: SSE_HEADERS };
}
