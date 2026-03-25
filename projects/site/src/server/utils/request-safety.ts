import type { Request } from 'express';
import { EventEmitter } from 'events';
import type { Socket } from 'net';

/**
 * Normalize socket for Angular SSR / undici — avoids undefined `encrypted` crashes.
 */
export function ensureSafeSocket(existing?: Socket): Socket {
  if (existing) {
    if (typeof (existing as { encrypted?: boolean }).encrypted === 'undefined') {
      (existing as { encrypted?: boolean }).encrypted = false;
    }
    return existing;
  }

  const socket = new EventEmitter() as unknown as Socket;
  (socket as { encrypted?: boolean }).encrypted = false;
  (socket as { remoteAddress?: string }).remoteAddress = '127.0.0.1';
  return socket;
}

export function ensureSafeRequest(req?: Partial<Request>): Request {
  if (req) {
    const socket = ensureSafeSocket(req.socket as Socket | undefined);
    const r = req as Request & { connection?: Socket };
    if (!r.socket) {
      (r as { socket: Socket }).socket = socket;
    } else if (r.socket !== socket) {
      (r as { socket: Socket }).socket = socket;
    }
    if (!r.connection) {
      r.connection = socket;
    }
    if (!r.headers) {
      (r as { headers: Record<string, unknown> }).headers = {};
    }
    if (!r.headers.host) {
      r.headers.host = `localhost:${process.env['PORT'] || 4200}`;
    }
    if (!(r as { protocol?: string }).protocol) {
      (r as { protocol: string }).protocol = 'http';
    }
    return r as Request;
  }

  const socket = ensureSafeSocket();
  return {
    method: 'GET',
    url: '/',
    originalUrl: '/',
    path: '/',
    headers: {},
    query: {},
    socket,
    connection: socket,
  } as Request;
}
