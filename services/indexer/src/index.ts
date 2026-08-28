import fs from "fs";
import path from "path";

export interface ProtocolEventLog {
  id: string;
  intentHash: string;
  auctionId?: string;
  solverAddress?: string;
  type: string;
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
  message: string;
  data?: any;
}

export interface EventQueryFilter {
  intentHash?: string;
  auctionId?: string;
  solverAddress?: string;
  type?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
}

export class ProtocolEventIndexer {
  private readonly events: ProtocolEventLog[] = [];
  private readonly storageFilePath?: string;
  private eventCounter: number = 0;

  constructor(storageFilePath?: string) {
    this.storageFilePath = storageFilePath;
    if (this.storageFilePath && fs.existsSync(this.storageFilePath)) {
      try {
        const raw = fs.readFileSync(this.storageFilePath, "utf8");
        const loaded: ProtocolEventLog[] = JSON.parse(raw);
        if (Array.isArray(loaded)) {
          this.events.push(...loaded);
          this.eventCounter = loaded.length;
        }
      } catch {
        // Fallback to empty if parse fails
      }
    }
  }

  private saveToStorage(): void {
    if (this.storageFilePath) {
      try {
        const dir = path.dirname(this.storageFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.storageFilePath, JSON.stringify(this.events, null, 2), "utf8");
      } catch {
        // Storage write fail safe fallback
      }
    }
  }

  public recordEvent(
    intentHash: string,
    type: string,
    message: string,
    data?: any,
    auctionId?: string,
    solverAddress?: string,
    blockNumber?: number,
    transactionHash?: string
  ): ProtocolEventLog {
    this.eventCounter++;
    const now = Math.floor(Date.now() / 1000);
    const eventId = `evt_${this.eventCounter}_${now}`;
    const event: ProtocolEventLog = {
      id: eventId,
      intentHash,
      auctionId,
      solverAddress,
      type,
      timestamp: now,
      blockNumber,
      transactionHash,
      message,
      data,
    };

    const existing = this.events.find(e => e.id === event.id);
    if (!existing) {
      this.events.push(event);
      this.saveToStorage();
    }
    return event;
  }

  public getEventsForIntent(intentHash: string): ProtocolEventLog[] {
    return this.events.filter((e) => e.intentHash.toLowerCase() === intentHash.toLowerCase());
  }

  public getEventsForAuction(auctionId: string): ProtocolEventLog[] {
    return this.events.filter((e) => e.auctionId && e.auctionId.toLowerCase() === auctionId.toLowerCase());
  }

  public getEventsForSolver(solverAddress: string): ProtocolEventLog[] {
    return this.events.filter((e) => e.solverAddress && e.solverAddress.toLowerCase() === solverAddress.toLowerCase());
  }

  public getEventsByType(type: string): ProtocolEventLog[] {
    return this.events.filter((e) => e.type.toLowerCase() === type.toLowerCase());
  }

  public queryEvents(filter: EventQueryFilter): ProtocolEventLog[] {
    let result = [...this.events];
    if (filter.intentHash) {
      result = result.filter(e => e.intentHash.toLowerCase() === filter.intentHash!.toLowerCase());
    }
    if (filter.auctionId) {
      result = result.filter(e => e.auctionId && e.auctionId.toLowerCase() === filter.auctionId!.toLowerCase());
    }
    if (filter.solverAddress) {
      result = result.filter(e => e.solverAddress && e.solverAddress.toLowerCase() === filter.solverAddress!.toLowerCase());
    }
    if (filter.type) {
      result = result.filter(e => e.type.toLowerCase() === filter.type!.toLowerCase());
    }
    if (filter.fromTimestamp) {
      result = result.filter(e => e.timestamp >= filter.fromTimestamp!);
    }
    if (filter.toTimestamp) {
      result = result.filter(e => e.timestamp <= filter.toTimestamp!);
    }
    if (filter.limit && filter.limit > 0) {
      result = result.slice(-filter.limit);
    }
    return result;
  }

  public getAllEvents(): ProtocolEventLog[] {
    return [...this.events];
  }

  public clearEvents(): void {
    this.events.length = 0;
    this.eventCounter = 0;
    this.saveToStorage();
  }
}
