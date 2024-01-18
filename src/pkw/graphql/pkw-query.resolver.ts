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
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { Pkw } from '../entity/pkw.entity.js';
import { PkwReadService } from '../service/pkw-read.service.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { getLogger } from '../../logger/logger.js';
import { Public } from 'nest-keycloak-connect';

export interface IdInput {
    readonly id: number;
}

@Resolver((_: any) => Pkw)
@UseFilters(HttpExceptionFilter)
@Public()    
@UseInterceptors(ResponseTimeInterceptor)
export class PkwQueryResolver {
    readonly #service: PkwReadService;

    readonly #logger = getLogger(PkwQueryResolver.name);

    constructor(service: PkwReadService) {
        this.#service = service;
    }

    @Query('pkw')
    async findById(@Args() idInput: IdInput) {
        const { id } = idInput;
        this.#logger.debug('findById: id=%d', id);

        const pkw = await this.#service.findById({ id });

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: pkw=%s, bauart=%o',
                pkw.toString(),
                pkw.bauart,
            );
        }
        return pkw;
    }

    @Query('pkws')
    async find(@Args() bauart: { bauart: string } | undefined) {
        const bauartStr = bauart?.bauart;
        this.#logger.debug('find: Suchkriterium bauart=%s', bauartStr);
        const suchkriterium =
            bauartStr === undefined ? {} : { bauart: bauartStr };

        const pkws = await this.#service.find(suchkriterium);

        this.#logger.debug('find: pkws=%o', pkws);
        return pkws;
    }

    @ResolveField('rabatt')
    rabatt(@Parent() pkw: Pkw, short: boolean | undefined) {
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'rabatt: pkw=%s, short=%s',
                pkw.toString(),
                short,
            );
        }
        const rabatt = pkw.rabatt ?? 0;
        const shortStr = short === undefined || short ? '%' : 'Prozent';
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        return `${(rabatt * 100).toFixed(2)} ${shortStr}`;
    }
}
