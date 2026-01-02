import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    // Import ConfigModule for environment variables
    ConfigModule,

    // Import PrismaModule for database access
    PrismaModule,

    // Import MailModule for sending emails
    MailModule,

    // Configure PassportModule with JWT as default strategy
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    // Configure JwtModule with async factory for environment variables
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('jwt.secret');
        if (!secret) {
          throw new Error('JWT secret is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: 900, // 15 minutes in seconds
            issuer: configService.get<string>('jwt.issuer') || 'festival-api',
            audience: configService.get<string>('jwt.audience') || 'festival-app',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Passport strategies
    JwtStrategy,
    LocalStrategy,
    // Guards (exported for use in other modules)
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
