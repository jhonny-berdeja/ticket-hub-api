import { Module } from '@nestjs/common';
import { IamApiService } from './iam-api.service';
import { IamApiConnector } from './iam-api.connector';
import { AuthApiLoginModule } from '../../common/auth-api/auth-api-login.module';

@Module({
  imports: [AuthApiLoginModule],
  providers: [IamApiService, IamApiConnector],
  exports: [IamApiService],
})
export class IamApiModule {}
