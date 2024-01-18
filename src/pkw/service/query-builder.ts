/**
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Bauart } from '../entity/bauart.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Pkw } from '../entity/pkw.entity.js';
import { Repository } from 'typeorm';
import { type Suchkriterien } from './pkw-read.service.js';
import { getLogger } from '../../logger/logger.js';
import { typeOrmModuleOptions } from '../../config/db.js';

/** Typdefinitionen für die Suche mit der Pkw-ID. */
export interface BuildIdParams {
    /** ID des gesuchten Pkw'ss. */
    readonly id: number;
}
/**
 * Die Klasse `QueryBuilder` implementiert das Lesen für Pkw's und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class QueryBuilder {
    readonly #pkwAlias = `${Pkw.name.charAt(0).toLowerCase()}${Pkw.name.slice(
        1,
    )}`;

    readonly #bauartAlias = `${Bauart.name
        .charAt(0)
        .toLowerCase()}${Bauart.name.slice(1)}`;

    readonly #repo: Repository<Pkw>;

    readonly #logger = getLogger(QueryBuilder.name);

    constructor(@InjectRepository(Pkw) repo: Repository<Pkw>) {
        this.#repo = repo;
    }

    /**
     * Ein Pkw mit der ID suchen.
     * @param id ID des gesuchten Pkw's
     * @returns QueryBuilder
     */
    buildId({ id }: BuildIdParams) {
        const queryBuilder = this.#repo.createQueryBuilder(this.#pkwAlias);
        queryBuilder.innerJoinAndSelect(
            `${this.#pkwAlias}.bauart`,
            this.#bauartAlias,
        );
        queryBuilder.where(`${this.#pkwAlias}.id = :id`, { id: id }); // eslint-disable-line object-shorthand
        return queryBuilder;
    }

    /**
     * Pkw's asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns QueryBuilder
     */
    // z.B. { bauart: 'a', ncapRating: 5, mercedes: true }
    // eslint-disable-next-line max-lines-per-function
    build({ bauart, mercedes, audi, ...props }: Suchkriterien) {
        this.#logger.debug(
            'build: bauart=%s, mercedes=%s, audi=%s, props=%o',
            bauart,
            mercedes,
            audi,
            props,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#pkwAlias);
        queryBuilder.innerJoinAndSelect(`${this.#pkwAlias}.bauart`, 'bauart');

        // z.B. { bauart: 'a', ncapRating: 5, mercedes: true }
        // type-coverage:ignore-next-line
        // const { bauart, mercedes, audi, ...props } = suchkriterien;

        let useWhere = true;

        // Bauart in der Query: Teilstring des Modell und "case insensitive"
        // CAVEAT: MySQL hat keinen Vergleich mit "case insensitive"
        // type-coverage:ignore-next-line
        if (bauart !== undefined && typeof bauart === 'string') {
            const ilike =
                typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
            queryBuilder = queryBuilder.where(
                `${this.#bauartAlias}.model ${ilike} :bauart`,
                { bauart: `%${bauart}%` },
            );
            useWhere = false;
        }

        if (mercedes === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#pkwAlias}.schlagwoerter like '%MERCEDES%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#pkwAlias}.schlagwoerter like '%MERCEDES%'`,
                  );
            useWhere = false;
        }

        if (audi === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#pkwAlias}.schlagwoerter like '%AUDI%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#pkwAlias}.schlagwoerter like '%AUDI%'`,
                  );
            useWhere = false;
        }

        // Restliche Properties als Key-Value-Paare: Vergleiche auf Gleichheit
        Object.keys(props).forEach((key) => {
            const param: Record<string, any> = {};
            param[key] = (props as Record<string, any>)[key]; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, security/detect-object-injection
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#pkwAlias}.${key} = :${key}`,
                      param,
                  )
                : queryBuilder.andWhere(
                      `${this.#pkwAlias}.${key} = :${key}`,
                      param,
                  );
            useWhere = false;
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());
        return queryBuilder;
    }
}
