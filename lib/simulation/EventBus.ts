import { ProtocolEvent, EventTopic } from '../types';

class EventBus {
  private events: ProtocolEvent[] = [];
  private currentBlock: number = 18450120;

  public emit(
    topic: EventTopic,
    details: Record<string, any>,
    intentId?: string,
    solverId?: string
  ): ProtocolEvent {
    this.currentBlock += Math.floor(Math.random() * 3) + 1;
    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const event: ProtocolEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Math.floor(Date.now() / 1000),
      blockNumber: this.currentBlock,
      txHash,
      topic,
      intentId,
      solverId,
      details,
    };

    this.events.unshift(event); // newest first
    return event;
  }

  public getEvents(intentId?: string): ProtocolEvent[] {
    if (intentId) {
      return this.events.filter((e) => e.intentId === intentId);
    }
    return this.events;
  }

  public clear(): void {
    this.events = [];
    this.currentBlock = 18450120;
  }
}

export const eventBus = new EventBus();
