import * as WebSocket from 'ws';
import Client from './Client';
import Player from './Player';
import { EventEmitter } from 'events';

export default class Connection extends EventEmitter {
  public readonly client: Client;
  public url: string;
  public options: WebSocket.ClientOptions;

  public ws?: WebSocket;

  constructor(client: Client, url: string, options: WebSocket.ClientOptions = {}) {
    super();
    this.client = client;
    this.url = url;
    this.options = options;

    this.onClose = this.onClose.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onError = this.onError.bind(this);
  }

  public async connect() {
    const headers = {
      Authorization: this.client.password,
      'Num-Shards': this.client.shards,
      'User-Id': this.client.userID,
    };

    const ws = this.ws = new WebSocket(this.url, Object.assign({ headers }, this.options));
    this.client.connections.push(this);

    ws.once('close', this.onClose);
    ws.once('error', this.onError);
    ws.on('message', this.onMessage);

    await new Promise(r => ws.once('open', r));
  }

  public onError(err?: any) {
    this.emit('error', err);
    this.onClose();
  }

  public async onClose() {
    this._ws.removeListener('close', this.onClose);
    this._ws.removeListener('error', this.onError);
    this._ws.removeListener('message', this.onMessage);

    await new Promise(r => setTimeout(r, 1e3 + Math.random() - 0.5));
    await this.connect();
  }

  public onMessage(d: WebSocket.Data) {
    let buf: Buffer | string;

    if (Buffer.isBuffer(d)) buf = d;
    else if (Array.isArray(d)) buf = Buffer.concat(d);
    else if (d instanceof ArrayBuffer) buf = Buffer.from(d);
    else buf = d;

    const pk: any = JSON.parse(buf.toString());
    this.emit(pk.op, pk);
  }

  public send(d: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this._ws.send(JSON.stringify(d), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  protected get _ws(): WebSocket {
    if (this.ws) return this.ws;
    throw new Error('no WebSocket connection available');
  }
}
