import { Module } from '@nestjs/common';
import {
  I18nModule as NestI18nModule,
  AcceptLanguageResolver,
  QueryResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { I18nCustomService } from './i18n.service';

/**
 * I18n Module - Internationalization configuration for the Festival API
 *
 * Language detection order:
 * 1. Query parameter: ?lang=fr
 * 2. Custom header: x-custom-lang
 * 3. Accept-Language header
 * 4. Default language (fr)
 */
@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: 'fr',
      fallbacks: {
        'fr-*': 'fr',
        'en-*': 'en',
      },
      loaderOptions: {
        path: path.join(__dirname, '/'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [
        // Priority 1: Query parameter (?lang=fr)
        { use: QueryResolver, options: ['lang', 'locale', 'l'] },
        // Priority 2: Custom header (x-custom-lang)
        { use: HeaderResolver, options: ['x-custom-lang'] },
        // Priority 3: Accept-Language header
        AcceptLanguageResolver,
      ],
      typesOutputPath: path.join(__dirname, '../generated/i18n.generated.ts'),
    }),
  ],
  providers: [I18nCustomService],
  exports: [NestI18nModule, I18nCustomService],
})
export class I18nModule {}
