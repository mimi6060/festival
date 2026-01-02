import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController, FestivalPaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, forwardRef(() => NotificationsModule)],
  controllers: [PaymentsController, FestivalPaymentsController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
