/** The only two states a ticket ever holds (confirmed product decision — no REJECTED/IN_PROGRESS). */
export enum TicketStatus {
  CREATED = 'CREATED',
  APPROVED = 'APPROVED',
}
