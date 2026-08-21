import { Module } from '@nestjs/common';
import { PcboxApiService } from './pcbox-api.service';
import { PcboxApiConnector } from './pcbox-api.connector';
import { AuthApiLoginModule } from '../../common/auth-api/auth-api-login.module';

@Module({
  imports: [AuthApiLoginModule],
  providers: [PcboxApiService, PcboxApiConnector],
  exports: [PcboxApiService],
})
export class PcboxApiModule {}
