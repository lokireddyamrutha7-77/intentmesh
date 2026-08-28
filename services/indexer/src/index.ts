export interface ProtocolEventLog {
  id: string;
  intentHash: string;
  auctionId?: string;
  solverAddress?: string;
  type: string;
  timestamp: number;
  message: string;
  data?: any;
}

export class ProtocolEventIndexer {
  private readonly events: ProtocolEventLog[] = [];
  private eventCounter: number = 0;

  public recordEvent(
    intentHash: string,
    type: string,
    message: string,
    data?: any,
    auctionId?: string,
    solverAddress?: string
  ): ProtocolEventLog {
    this.eventCounter++;
    const now = Math.floor(Date.now() / 1000);
    const event: ProtocolEventLog = {
      id: `evt_${this.eventCounter}`,
      intentHash,
      auctionId,
      solverAddress,
      type,
      timestamp: now,
      message,
      data,
    };
    this.events.push(event);
    return event;
  }

  public getEventsForIntent(intentHash: string): ProtocolEventLog[] {
    return this.events.filter((e) => e.intentHash.toLowerCase() === intentHash.toLowerCase());
  }

  public getAllEvents(): ProtocolEventLog[] {
    return [...this.events];
  }
}
