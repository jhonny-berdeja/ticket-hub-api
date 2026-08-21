import { Injectable } from '@nestjs/common';
import { IamApiConnector, InternalUser } from './iam-api.connector';

const TICKET_HUB_APPLICATION_NAME = 'ticket-hub';
const ASSIGNABLE_ROLE_NAME = 'ADMIN';

@Injectable()
export class IamApiService {
  constructor(private readonly iamApiConnector: IamApiConnector) {}

  /**
   * Users allowed to be assigned a ticket: ADMINs of the `ticket-hub`
   * application in iam-api. Both filters are hardcoded here, never
   * client-supplied — see `TicketsController.getAssignableUsers`.
   */
  fetchAssignableUsers(): Promise<InternalUser[]> {
    return this.iamApiConnector.fetchInternalUsers(
      TICKET_HUB_APPLICATION_NAME,
      ASSIGNABLE_ROLE_NAME,
    );
  }
}
