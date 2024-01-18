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
// eslint-disable-next-line max-classes-per-file
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { type Bauart } from '../entity/bauart.entity.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { type IdInput } from './pkw-query.resolver.js';
//import { JwtAuthGraphQlGuard } from '../../security/auth/jwt/jwt-auth-graphql.guard.js';
import { type Pkw } from '../entity/pkw.entity.js';
import { PkwDTO } from '../rest/pkwDTO.entity.js';
import { PkwWriteService } from '../service/pkw-write.service.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
//import { RolesAllowed } from '../../security/auth/roles/roles-allowed.decorator.js';
//import { RolesGraphQlGuard } from '../../security/auth/roles/roles-graphql.guard.js';
import { getLogger } from '../../logger/logger.js';
import { Roles } from 'nest-keycloak-connect';

// Authentifizierung und Autorisierung durch
//  GraphQL Shield
//      https://www.graphql-shield.com
//      https://github.com/maticzav/graphql-shield
//      https://github.com/nestjs/graphql/issues/92
//      https://github.com/maticzav/graphql-shield/issues/213
//  GraphQL AuthZ
//      https://github.com/AstrumU/graphql-authz
//      https://www.the-guild.dev/blog/graphql-authz

export interface CreatePayload {
    readonly id: number;
}

export interface UpdatePayload {
    readonly version: number;
}

export class PkwUpdateDTO extends PkwDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}
@Resolver()
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
//@UseGuards(JwtAuthGraphQlGuard, RolesGraphQlGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class PkwMutationResolver {
    readonly #service: PkwWriteService;

    readonly #logger = getLogger(PkwMutationResolver.name);

    constructor(service: PkwWriteService) {
        this.#service = service;
    }

    @Mutation()
    //@RolesAllowed('admin', 'fachabteilung')
    @Roles({ roles: ['realm:app-admin'] })      
    async create(@Args('input') pkwDTO: PkwDTO) {
        this.#logger.debug('create: pkwDTO=%o', pkwDTO);

        const pkw = this.#pkwDtoToPkw(pkwDTO);
        const id = await this.#service.create(pkw);
        // TODO BadUserInputError
        this.#logger.debug('createPkw: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    @Mutation()
    //@RolesAllowed('admin', 'fachabteilung')
    @Roles({ roles: ['realm:app-admin'] })      
    async update(@Args('input') pkwDTO: PkwUpdateDTO) {
        this.#logger.debug('update: pkw=%o', pkwDTO);

        const pkw = this.#pkwUpdateDtoToPkw(pkwDTO);
        const versionStr = `"${pkwDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(pkwDTO.id, 10),
            pkw,
            version: versionStr,
        });
        // TODO BadUserInputError
        this.#logger.debug('updatePkw: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    //@RolesAllowed('admin')
    @Roles({ roles: ['realm:app-admin'] })      
    async delete(@Args() id: IdInput) {
        const idStr = id.id;
        this.#logger.debug('delete: id=%s', idStr);
        const result = await this.#service.delete(idStr);
        this.#logger.debug('deletePkw: result=%s', result);
        return result;
    }

    #pkwDtoToPkw(pkwDTO: PkwDTO): Pkw {
        const bauartDTO = pkwDTO.bauart;
        const bauart: Bauart = {
            id: undefined,
            model: bauartDTO.model,
            variante: bauartDTO.variante,
            pkw: undefined,
        };
        const pkw: Pkw = {
            id: undefined,
            version: undefined,
            fin: pkwDTO.fin,
            ncapRating: pkwDTO.ncapRating,
            motor: pkwDTO.motor,
            preis: pkwDTO.preis,
            rabatt: pkwDTO.rabatt,
            lieferbar: pkwDTO.lieferbar,
            releaseDatum: pkwDTO.releaseDatum,
            homepage: pkwDTO.homepage,
            schlagwoerter: pkwDTO.schlagwoerter,
            bauart,
            erzeugt: undefined,
            aktualisiert: undefined,
        };

        // Rueckwaertsverweis
        pkw.bauart!.pkw = pkw;
        return pkw;
    }

    #pkwUpdateDtoToPkw(pkwDTO: PkwUpdateDTO): Pkw {
        return {
            id: undefined,
            version: undefined,
            fin: pkwDTO.fin,
            ncapRating: pkwDTO.ncapRating,
            motor: pkwDTO.motor,
            preis: pkwDTO.preis,
            rabatt: pkwDTO.rabatt,
            lieferbar: pkwDTO.lieferbar,
            releaseDatum: pkwDTO.releaseDatum,
            homepage: pkwDTO.homepage,
            schlagwoerter: pkwDTO.schlagwoerter,
            bauart: undefined,
            erzeugt: undefined,
            aktualisiert: undefined,
        };
    }

    // #errorMsgCreatePkw(err: CreateError) {
    //     switch (err.type) {
    //         case 'FinExists': {
    //             return `Die FIN ${err.fin} existiert bereits`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }

    // #errorMsgUpdatePkw(err: UpdateError) {
    //     switch (err.type) {
    //         case 'PkwNotExists': {
    //             return `Es gibt kein Pkw mit der ID ${err.id}`;
    //         }
    //         case 'VersionInvalid': {
    //             return `"${err.version}" ist keine gueltige Versionsnummer`;
    //         }
    //         case 'VersionOutdated': {
    //             return `Die Versionsnummer "${err.version}" ist nicht mehr aktuell`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }
}
