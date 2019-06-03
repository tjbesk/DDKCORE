import { Headers, SerializedHeaders } from 'shared/model/Peer/headers';

export type SerializedFullHeaders = SerializedHeaders & {
    os: string;
    version: string;
    minVersion: number;
    blocksIds: Array<[number, string]>;
};

export class FullHeaders extends Headers {

    private _os: string;
    private _version: string;
    private _blocksIds: Map<number, string>;
    private _minVersion: number;

    constructor(fullHeaders: SerializedFullHeaders) {
        super(fullHeaders);
        this._os = fullHeaders.os;
        this._version = fullHeaders.version;
        this._minVersion = fullHeaders.minVersion;
        this._blocksIds = new Map(fullHeaders.blocksIds);
    }


    get os(): string {
        return this._os;
    }

    set os(value: string) {
        this._os = value;
    }

    get version(): string {
        return this._version;
    }

    set version(value: string) {
        this._version = value;
    }

    get minVersion(): number {
        return this._minVersion;
    }

    set minVersion(value: number) {
        this._minVersion = value;
    }

    get blocksIds(): Map<number, string> {
        return this._blocksIds;
    }

    set blocksIds(value: Map<number, string>) {
        this._blocksIds = new Map(value);
    }

    serialize(): SerializedFullHeaders {
        return {
            height: this.height,
            broadhash: this.broadhash,
            blocksIds: [...this._blocksIds],
            os: this.os,
            version: this._version,
            minVersion: this._minVersion,
            peerCount: this.peerCount,
        };
    }

    static deserialize(data: SerializedFullHeaders): FullHeaders {
        return new FullHeaders(data);
    }

}