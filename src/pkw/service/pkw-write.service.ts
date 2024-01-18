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
 * Das Modul besteht aus der Klasse {@linkcode PkwWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { type DeleteResult, Repository } from 'typeorm';
import {
    FinExistsException,
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Bauart } from '../entity/bauart.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from '../../mail/mail.service.js';
import { Pkw } from '../entity/pkw.entity.js';
import { PkwReadService } from './pkw-read.service.js';
import RE2 from 're2';
import { getLogger } from '../../logger/logger.js';

/** Typdefinitionen zum Aktualisieren eines Pkws mit `update`. */
export interface UpdateParams {
    /** ID des zu aktualisierenden Pkws. */
    readonly id: number | undefined;
    /** Pkw-Objekt mit den aktualisierten Werten. */
    readonly pkw: Pkw;
    /** Versionsnummer für die aktualisierenden Werte. */
    readonly version: string;
}

/**
 * Die Klasse `PkwWriteService` implementiert den Anwendungskern für das
 * Schreiben von Bücher und greift mit _TypeORM_ auf die DB zu.
 */
@Injectable()
export class PkwWriteService {
    private static readonly VERSION_PATTERN = new RE2('^"\\d*"');

    readonly #repo: Repository<Pkw>;

    readonly #readService: PkwReadService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(PkwWriteService.name);

    constructor(
        @InjectRepository(Pkw) repo: Repository<Pkw>,
        readService: PkwReadService,
        mailService: MailService,
    ) {
        this.#repo = repo;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Ein neuer Pkw soll angelegt werden.
     * @param pkw Der neu abzulegende Pkw
     * @returns Die ID des neu angelegten Pkws
     * @throws FinExists falls die Fin-Nummer bereits existiert
     */
    async create(pkw: Pkw): Promise<number> {
        this.#logger.debug('create: pkw=%o', pkw);
        await this.#validateCreate(pkw);

        const pkwDb = await this.#repo.save(pkw); // implizite Transaktion
        this.#logger.debug('create: pkwDb=%o', pkwDb);

        await this.#sendmail(pkwDb);

        return pkwDb.id!;
    }

    /**
     * Ein vorhandener Pkw soll aktualisiert werden.
     * @param pkw Der zu aktualisierende Pkw
     * @param id ID des zu aktualisierenden Pkws
     * @param version Die Versionsnummer für optimistische Synchronisation
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async update({ id, pkw, version }: UpdateParams): Promise<number> {
        this.#logger.debug(
            'update: id=%d, pkw=%o, version=%s',
            id,
            pkw,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(`Es gibt keinen Pkw mit der ID ${id}.`);
        }

        const validateResult = await this.#validateUpdate(pkw, id, version);
        this.#logger.debug('update: validateResult=%o', validateResult);
        if (!(validateResult instanceof Pkw)) {
            return validateResult;
        }

        const pkwNeu = validateResult;
        const merged = this.#repo.merge(pkwNeu, pkw);
        this.#logger.debug('update: merged=%o', merged);
        const updated = await this.#repo.save(merged); // implizite Transaktion
        this.#logger.debug('update: updated=%o', updated);

        return updated.version!;
    }

    /**
     * Ein Pkw wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Pkws
     * @returns true, falls der Pkw vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);
        const pkw = await this.#readService.findById({
            id,
        });

        let deleteResult: DeleteResult | undefined;
        await this.#repo.manager.transaction(async (transactionalMgr) => {
            // Der Pkw zur gegebenen ID mit Bauart asynchron loeschen

            // TODO "cascade" funktioniert nicht beim Loeschen
            const bauartId = pkw.bauart?.id;
            if (bauartId !== undefined) {
                await transactionalMgr.delete(Bauart, bauartId);
            }

            deleteResult = await transactionalMgr.delete(Pkw, id);
            this.#logger.debug('delete: deleteResult=%o', deleteResult);
        });

        return (
            deleteResult?.affected !== undefined &&
            deleteResult.affected !== null &&
            deleteResult.affected > 0
        );
    }

    async #validateCreate(pkw: Pkw): Promise<undefined> {
        this.#logger.debug('#validateCreate: pkw=%o', pkw);

        const { fin } = pkw;
        try {
            await this.#readService.find({ fin: fin }); // eslint-disable-line object-shorthand
        } catch (err) {
            if (err instanceof NotFoundException) {
                return;
            }
        }
        throw new FinExistsException(fin);
    }

    async #sendmail(pkw: Pkw) {
        const subject = `Neuer Pkw ${pkw.id}`;
        const model = pkw.bauart?.model ?? 'N/A';
        const body = `Der Pkw mit der Bauart <strong>${model}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(
        pkw: Pkw,
        id: number,
        versionStr: string,
    ): Promise<Pkw> {
        const version = this.#validateVersion(versionStr);
        this.#logger.debug('#validateUpdate: pkw=%o, version=%s', pkw, version);

        const resultFindById = await this.#findByIdAndCheckVersion(id, version);
        this.#logger.debug('#validateUpdate: %o', resultFindById);
        return resultFindById;
    }

    #validateVersion(version: string | undefined): number {
        this.#logger.debug('#validateVersion: version=%s', version);
        if (
            version === undefined ||
            !PkwWriteService.VERSION_PATTERN.test(version)
        ) {
            throw new VersionInvalidException(version);
        }

        return Number.parseInt(version.slice(1, -1), 10);
    }

    async #findByIdAndCheckVersion(id: number, version: number): Promise<Pkw> {
        const pkwDb = await this.#readService.findById({ id });

        // nullish coalescing
        const versionDb = pkwDb.version!;
        if (version < versionDb) {
            this.#logger.debug(
                '#checkIdAndVersion: VersionOutdated=%d',
                version,
            );
            throw new VersionOutdatedException(version);
        }

        return pkwDb;
    }
}
