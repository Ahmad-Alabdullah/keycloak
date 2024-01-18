/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { AuthModule } from '../security/auth/auth.module.js';

import { MailModule } from '../mail/mail.module.js';
import { Module } from '@nestjs/common';
import { PkwGetController } from './rest/pkw-get.controller.js';
import { PkwMutationResolver } from './graphql/pkw-mutation.resolver.js';
import { PkwQueryResolver } from './graphql/pkw-query.resolver.js';
import { PkwReadService } from './service/pkw-read.service.js';
import { PkwWriteController } from './rest/pkw-write.controller.js';
import { PkwWriteService } from './service/pkw-write.service.js';
import { QueryBuilder } from './service/query-builder.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './entity/entities.js';
import { KeycloakConfigModule } from '../security/keycloak.module.js';

/**
 * Das Modul besteht aus Controller- und Service-Klassen für die Verwaltung von
 * PKWs.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit Controller- und Service-Klassen sowie der
 * Funktionalität für TypeORM.
 */
@Module({
    imports: [MailModule, TypeOrmModule.forFeature(entities), AuthModule, KeycloakConfigModule],
    controllers: [PkwGetController, PkwWriteController],
    // Provider sind z.B. Service-Klassen fuer DI
    providers: [
        PkwReadService,
        PkwWriteService,
        PkwQueryResolver,
        PkwMutationResolver,
        QueryBuilder,
    ],
    // Export der Provider fuer DI in anderen Modulen
    exports: [PkwReadService, PkwWriteService],
})
export class PkwModule {}
