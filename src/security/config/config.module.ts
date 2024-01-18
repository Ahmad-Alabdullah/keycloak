import { KeycloakConfigService } from './keycloak-config.service.js';
import { Module } from '@nestjs/common';

@Module({
    providers: [KeycloakConfigService],
    exports: [KeycloakConfigService],
})
export class ConfigModule {}