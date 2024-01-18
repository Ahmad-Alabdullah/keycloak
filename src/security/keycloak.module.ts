import {
    AuthGuard,
    KeycloakConnectModule,
    RoleGuard,
} from 'nest-keycloak-connect';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module.js';
import { KeycloakConfigService } from './config/keycloak-config.service.js';
import { Module } from '@nestjs/common';

@Module({
    imports: [
        KeycloakConnectModule.registerAsync({
            useExisting: KeycloakConfigService,
            imports: [ConfigModule],
        }),
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
        // New in 1.1.0
        // This adds a global level role guard, which is permissive.
        // Used by `@Roles` decorator with the
        // optional `@AllowAnyRole` decorator for allowing any
        // specified role passed.
        {
            provide: APP_GUARD,
            useClass: RoleGuard,
        },
    ],
    exports: [KeycloakConnectModule],
})
export class KeycloakConfigModule {}