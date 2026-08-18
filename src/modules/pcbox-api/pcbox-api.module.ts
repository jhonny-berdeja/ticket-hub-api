import { Module } from '@nestjs/common';
import { PcboxApiService } from './pcbox-api.service';
import { PcboxApiConnector } from './pcbox-api.connector';

@Module({
  providers: [PcboxApiService, PcboxApiConnector],
  exports: [PcboxApiService],
})
export class PcboxApiModule {}
