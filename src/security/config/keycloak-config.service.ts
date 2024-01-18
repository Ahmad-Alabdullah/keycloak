import {
    TokenValidation,
    type KeycloakConnectOptions,
    type KeycloakConnectOptionsFactory,
} from 'nest-keycloak-connect';
import { PolicyEnforcementMode} from 'nest-keycloak-connect';
import { Injectable } from '@nestjs/common';

@Injectable()
export class KeycloakConfigService implements KeycloakConnectOptionsFactory {
    createKeycloakConnectOptions(): KeycloakConnectOptions {
        return {
            authServerUrl: 'http://localhost:8080',
            realm: 'demo-realm',
            clientId: 'PKW-Keycloak',
            secret: 'ZUJiEXMFdkia1vqMpADemYmVWbUYgT2U',
            logLevels: ['verbose', 'warn', 'error', 'debug', 'fatal', 'log'],
            useNestLogger: false,
            policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
            tokenValidation: TokenValidation.ONLINE,
        };
    }
}