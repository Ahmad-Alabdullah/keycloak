/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
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

/**
 * Das Modul besteht aus der Klasse {@linkcode PkwReadService}.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { type MotorArt, Pkw } from './../entity/pkw.entity.js';
import { QueryBuilder } from './query-builder.js';
import RE2 from 're2';
import { getLogger } from '../../logger/logger.js';

/**
 * Typdefinition für `findById`
 */
export interface FindByIdParams {
    /** ID des gesuchten Pkw's */
    readonly id: number;
}
export interface Suchkriterien {
    readonly fin?: string;
    readonly ncapRating?: number;
    readonly motor?: MotorArt;
    readonly preis?: number;
    readonly rabatt?: number;
    readonly lieferbar?: boolean;
    readonly releaseDatum?: string;
    readonly homepage?: string;
    readonly mercedes?: string;
    readonly audi?: string;
    readonly bauart?: string;
}

/**
 * Die Klasse `PkwReadService` implementiert das Lesen für Pkw's und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class PkwReadService {
    static readonly ID_PATTERN = new RE2('^[1-9][\\d]*$');

    readonly #pkwProps: string[];

    readonly #queryBuilder: QueryBuilder;

    readonly #logger = getLogger(PkwReadService.name);

    constructor(queryBuilder: QueryBuilder) {
        const pkwDummy = new Pkw();
        this.#pkwProps = Object.getOwnPropertyNames(pkwDummy);
        this.#queryBuilder = queryBuilder;
    }

    /**
     * Ein Pkw asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Pkw's
     * @returns Der gefundene Pkw vom Typ [Pkw](pkw_entity_pkw_entity.Pkw.html)
     *          in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Pkw mit der ID existiert
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async findById({ id }: FindByIdParams) {
        this.#logger.debug('findById: id=%d', id);

        // https://typeorm.io/working-with-repository
        // Das Resultat ist undefined, falls kein Datensatz gefunden
        // Lesen: Keine Transaktion erforderlich
        const pkw = await this.#queryBuilder.buildId({ id }).getOne();
        if (pkw === null) {
            throw new NotFoundException(`Es gibt keinen Pkw mit der ID ${id}.`);
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: pkw=%s, bauart=%o',
                pkw.toString(),
                pkw.bauart,
            );
        }
        return pkw;
    }

    /**
     * Pkw's asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns Ein JSON-Array mit den gefundenen Pkw's.
     * @throws NotFoundException falls keine Pkw's gefunden wurden.
     */
    async find(suchkriterien?: Suchkriterien) {
        this.#logger.debug('find: suchkriterien=%o', suchkriterien);

        // Keine Suchkriterien?
        if (suchkriterien === undefined) {
            return this.#queryBuilder.build({}).getMany();
        }
        const keys = Object.keys(suchkriterien);
        if (keys.length === 0) {
            return this.#queryBuilder.build(suchkriterien).getMany();
        }

        // Falsche Namen fuer Suchkriterien?
        if (!this.#checkKeys(keys)) {
            throw new NotFoundException('Ungueltige Suchkriterien');
        }

        // QueryBuilder https://typeorm.io/select-query-builder
        // Das Resultat ist eine leere Liste, falls nichts gefunden
        // Lesen: Keine Transaktion erforderlich
        const pkws = await this.#queryBuilder.build(suchkriterien).getMany();
        this.#logger.debug('find: pkws=%o', pkws);
        if (pkws.length === 0) {
            throw new NotFoundException(
                `Keine Pkw's gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }

        return pkws;
    }

    #checkKeys(keys: string[]) {
        // Ist jedes Suchkriterium auch eine Property von Pkw oder "schlagwoerter"?
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !this.#pkwProps.includes(key) &&
                key !== 'mercedes' &&
                key !== 'audi'
            ) {
                this.#logger.debug(
                    '#find: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }
}
