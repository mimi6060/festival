import { Module } from '@nestjs/common';
import { LanguagesController } from './languages.controller';
import { LanguagesService } from './languages.service';
import { LocalizedContentService } from './localized-content.service';

@Module({
  controllers: [LanguagesController],
  providers: [LanguagesService, LocalizedContentService],
  exports: [LanguagesService, LocalizedContentService],
})
export class LanguagesModule {}
