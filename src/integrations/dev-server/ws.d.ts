declare module 'ws' {
    import { EventEmitter } from 'events';
    import * as http from 'http';

    class WebSocket extends EventEmitter {
        static readonly CONNECTING: number;
        static readonly OPEN: number;
        static readonly CLOSING: number;
        static readonly CLOSED: number;

        constructor(address: string, options?: WebSocket.ClientOptions);

        readyState: number;
        protocol: string;
        url: string;
        binaryType: string;

        close(code?: number, reason?: string): void;
        ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
        pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
        send(data: any, cb?: (err?: Error) => void): void;
        send(data: any, options: { mask?: boolean; binary?: boolean }, cb?: (err?: Error) => void): void;
        terminate(): void;

        on(event: 'close', listener: (code: number, reason: string) => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: 'message', listener: (data: WebSocket.Data) => void): this;
        on(event: 'open', listener: () => void): this;
        on(event: 'ping' | 'pong', listener: (data: Buffer) => void): this;
        on(event: string | symbol, listener: (...args: any[]) => void): this;
    }

    namespace WebSocket {
        interface ClientOptions {
            protocol?: string;
            followRedirects?: boolean;
            handshakeTimeout?: number;
            maxRedirects?: number;
            perMessageDeflate?: boolean | PerMessageDeflateOptions;
            localAddress?: string;
            protocolVersion?: number;
            headers?: { [key: string]: string };
            origin?: string;
            agent?: http.Agent;
            host?: string;
            family?: number;
            checkServerIdentity?(servername: string, cert: { subject: { CN: string } }): boolean;
            rejectUnauthorized?: boolean;
            maxPayload?: number;
        }

        interface PerMessageDeflateOptions {
            serverNoContextTakeover?: boolean;
            clientNoContextTakeover?: boolean;
            serverMaxWindowBits?: number;
            clientMaxWindowBits?: number;
            zlibDeflateOptions?: {
                level?: number;
                windowBits?: number;
                memLevel?: number;
                strategy?: number;
            };
            threshold?: number;
            concurrencyLimit?: number;
        }

        interface ServerOptions {
            host?: string;
            port?: number;
            backlog?: number;
            server?: http.Server;
            verifyClient?: VerifyClientCallbackAsync | VerifyClientCallbackSync;
            handleProtocols?: (protocols: string[], request: http.IncomingMessage) => string | false;
            path?: string;
            noServer?: boolean;
            clientTracking?: boolean;
            perMessageDeflate?: boolean | PerMessageDeflateOptions;
            maxPayload?: number;
        }

        interface AddressInfo {
            address: string;
            family: string;
            port: number;
        }

        interface VerifyClientCallbackAsync {
            (info: { origin: string; secure: boolean; req: http.IncomingMessage }, callback: (res: boolean, code?: number, message?: string) => void): void;
        }

        interface VerifyClientCallbackSync {
            (info: { origin: string; secure: boolean; req: http.IncomingMessage }): boolean;
        }

        type Data = string | Buffer | ArrayBuffer | Buffer[];

        class Server extends EventEmitter {
            constructor(options?: ServerOptions, callback?: () => void);

            address(): AddressInfo | string;
            close(cb?: (err?: Error) => void): void;
            handleUpgrade(request: http.IncomingMessage, socket: any, upgradeHead: Buffer, callback: (client: WebSocket) => void): void;
            shouldHandle(request: http.IncomingMessage): boolean;

            on(event: 'connection', listener: (socket: WebSocket, request: http.IncomingMessage) => void): this;
            on(event: 'error', listener: (error: Error) => void): this;
            on(event: 'headers', listener: (headers: string[], request: http.IncomingMessage) => void): this;
            on(event: 'listening', listener: () => void): this;
            on(event: string | symbol, listener: (...args: any[]) => void): this;
        }

        function createWebSocketStream(websocket: WebSocket, options?: any): any;
    }

    export = WebSocket;
}
