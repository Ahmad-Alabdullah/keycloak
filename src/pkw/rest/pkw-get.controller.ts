/* eslint-disable max-lines */
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

/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

// eslint-disable-next-line max-classes-per-file
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    Param,
    Query,
    Req,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import { type MotorArt, type Pkw } from '../entity/pkw.entity.js';
import {
    PkwReadService,
    type Suchkriterien,
} from '../service/pkw-read.service.js';
import { Request, Response } from 'express';
import { type Bauart } from '../entity/bauart.entity.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { getBaseUri } from './getBaseUri.js';
import { getLogger } from '../../logger/logger.js';
import { paths } from '../../config/paths.js';
import { Public } from 'nest-keycloak-connect';

/** href-Link für HATEOAS */
export interface Link {
    /** href-Link für HATEOAS-Links */
    readonly href: string;
}

/** Links für HATEOAS */
export interface Links {
    /** self-Link */
    readonly self: Link;
    /** Optionaler Linke für list */
    readonly list?: Link;
    /** Optionaler Linke für add */
    readonly add?: Link;
    /** Optionaler Linke für update */
    readonly update?: Link;
    /** Optionaler Linke für remove */
    readonly remove?: Link;
}

/** Typedefinition für ein Titel-Objekt ohne Rückwärtsverweis zum Pkw */
export type BauartModel = Omit<Bauart, 'pkw' | 'id'>;

/** Pkw-Objekt mit HATEOAS-Links */
export type PkwModel = Omit<
    Pkw,
    'aktualisiert' | 'erzeugt' | 'id' | 'bauart' | 'version'
> & {
    bauart: BauartModel;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _links: Links;
};

/** Pkw-Objekte mit HATEOAS-Links in einem JSON-Array. */
export interface PkwsModel {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _embedded: {
        pkws: PkwModel[];
    };
}

/**
 * Klasse für `PkwGetController`, um Queries in _OpenAPI_ bzw. Swagger zu
 * formulieren. `PkwController` hat dieselben Properties wie die Basisklasse
 * `Pkw` - allerdings mit dem Unterschied, dass diese Properties beim Ableiten
 * so überschrieben sind, dass sie auch nicht gesetzt bzw. undefined sein
 * dürfen, damit die Queries flexibel formuliert werden können. Deshalb ist auch
 * immer der zusätzliche Typ undefined erforderlich.
 * Außerdem muss noch `string` statt `Date` verwendet werden, weil es in OpenAPI
 * den Typ Date nicht gibt.
 */
export class PkwQuery implements Suchkriterien {
    @ApiProperty({ required: false })
    declare readonly fin: string;

    @ApiProperty({ required: false })
    declare readonly ncapRating: number;

    @ApiProperty({ required: false })
    declare readonly motor: MotorArt;

    @ApiProperty({ required: false })
    declare readonly preis: number;

    @ApiProperty({ required: false })
    declare readonly rabatt: number;

    @ApiProperty({ required: false })
    declare readonly lieferbar: boolean;

    @ApiProperty({ required: false })
    declare readonly releaseDatum: string;

    @ApiProperty({ required: false })
    declare readonly homepage: string;

    @ApiProperty({ required: false })
    declare readonly bmw: string;

    @ApiProperty({ required: false })
    declare readonly amg: string;

    @ApiProperty({ required: false })
    declare readonly model: string;
}

const APPLICATION_HAL_JSON = 'application/hal+json';

/**
 * Die Controller-Klasse für die Verwaltung von Bücher.
 */
// Decorator in TypeScript, zur Standardisierung in ES vorgeschlagen (stage 3)
// https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/#decorators
// https://github.com/tc39/proposal-decorators
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Pkw REST-API')
// @ApiBearerAuth()
// Klassen ab ES 2015
export class PkwGetController {
    // readonly in TypeScript, vgl. C#
    // private ab ES 2019
    readonly #service: PkwReadService;

    readonly #logger = getLogger(PkwGetController.name);

    // Dependency Injection (DI) bzw. Constructor Injection
    // constructor(private readonly service: PkwReadService) {}
    // https://github.com/tc39/proposal-type-annotations#omitted-typescript-specific-features-that-generate-code
    constructor(service: PkwReadService) {
        this.#service = service;
    }

    /**
     * Ein Pkw wird asynchron anhand seiner ID als Pfadparameter gesucht.
     *
     * Falls es ein solches Pkw gibt und `If-None-Match` im Request-Header
     * auf die aktuelle Version des Pkwes gesetzt war, wird der Statuscode
     * `304` (`Not Modified`) zurückgeliefert. Falls `If-None-Match` nicht
     * gesetzt ist oder eine veraltete Version enthält, wird das gefundene
     * Pkw im Rumpf des Response als JSON-Datensatz mit Atom-Links für HATEOAS
     * und dem Statuscode `200` (`OK`) zurückgeliefert.
     *
     * Falls es kein Pkw zur angegebenen ID gibt, wird der Statuscode `404`
     * (`Not Found`) zurückgeliefert.
     *
     * @param id Pfad-Parameter `id`
     * @param req Request-Objekt von Express mit Pfadparameter, Query-String,
     *            Request-Header und Request-Body.
     * @param version Versionsnummer im Request-Header bei `If-None-Match`
     * @param accept Content-Type bzw. MIME-Type
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Suche mit der PKW-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Das PKW wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Kein PKW zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Das PKW wurde bereits heruntergeladen',
    })
    async getById(
        @Param('id') idStr: string,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<PkwModel | undefined>> {
        this.#logger.debug('getById: idStr=%s, version=%s"', idStr, version);
        const id = Number(idStr);
        if (Number.isNaN(id)) {
            this.#logger.debug('getById: NaN');
            return res.sendStatus(HttpStatus.NOT_FOUND);
        }

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const pkw = await this.#service.findById({ id });
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('getById(): Pkw=%s', pkw.toString());
            this.#logger.debug('getById(): bauart=%o', pkw.bauart);
        }

        // ETags
        const versionDb = pkw.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getById: versionDb=%s', versionDb);
        res.header('ETag', `"${versionDb}"`);

        // HATEOAS mit Atom Links und HAL (= Hypertext Application Language)
        const pkwModel = this.#toModel(pkw, req);
        this.#logger.debug('getById: PkwModel=%o', pkwModel);
        return res.contentType(APPLICATION_HAL_JSON).json(pkwModel);
    }

    /**
     * Bücher werden mit Query-Parametern asynchron gesucht. Falls es mindestens
     * ein solches Pkw gibt, wird der Statuscode `200` (`OK`) gesetzt. Im Rumpf
     * des Response ist das JSON-Array mit den gefundenen Büchern, die jeweils
     * um Atom-Links für HATEOAS ergänzt sind.
     *
     * Falls es kein Pkw zu den Suchkriterien gibt, wird der Statuscode `404`
     * (`Not Found`) gesetzt.
     *
     * Falls es keine Query-Parameter gibt, werden alle Bücher ermittelt.
     *
     * @param query Query-Parameter von Express.
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @Public()
    @ApiOperation({ summary: 'Suche mit Suchkriterien' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit PKWs' })
    async get(
        @Query() query: PkwQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response<PkwsModel | undefined>> {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const pkws = await this.#service.find(query);
        this.#logger.debug('get: %o', pkws);

        // HATEOAS: Atom Links je PKW
        const pkwsModel = pkws.map((pkw: Pkw) =>
            this.#toModel(pkw, req, false),
        );
        this.#logger.debug('get: pkwsModel=%o', pkwsModel);

        const result: PkwsModel = { _embedded: { pkws: pkwsModel } };
        return res.contentType(APPLICATION_HAL_JSON).json(result).send();
    }

    #toModel(pkw: Pkw, req: Request, all = true) {
        const baseUri = getBaseUri(req);
        this.#logger.debug('#toModel: baseUri=%s', baseUri);
        const { id } = pkw;
        const links = all
            ? {
                  self: { href: `${baseUri}/${id}` },
                  list: { href: `${baseUri}` },
                  add: { href: `${baseUri}` },
                  update: { href: `${baseUri}/${id}` },
                  remove: { href: `${baseUri}/${id}` },
              }
            : { self: { href: `${baseUri}/${id}` } };

        this.#logger.debug('#toModel: Pkw=%o, links=%o', pkw, links);
        const bauartModel: BauartModel = {
            model: pkw.bauart?.model ?? 'N/A', // eslint-disable-line unicorn/consistent-destructuring
            variante: pkw.bauart?.variante ?? 'N/A', // eslint-disable-line unicorn/consistent-destructuring
        };
        /* eslint-disable unicorn/consistent-destructuring */
        const pkwModel: PkwModel = {
            fin: pkw.fin,
            ncapRating: pkw.ncapRating,
            motor: pkw.motor,
            preis: pkw.preis,
            rabatt: pkw.rabatt,
            lieferbar: pkw.lieferbar,
            releaseDatum: pkw.releaseDatum,
            homepage: pkw.homepage,
            schlagwoerter: pkw.schlagwoerter,
            bauart: bauartModel,
            _links: links,
        };
        /* eslint-enable unicorn/consistent-destructuring */

        return pkwModel;
    }
}
/* eslint-enable max-lines */
