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
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle.
 * @packageDocumentation
 */

import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Req,
    Res,
   // UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { PkwDTO, PkwDtoOhneRef } from './pkwDTO.entity.js';
import { Request, Response } from 'express';
import { type Bauart } from '../entity/bauart.entity.js';
//import { JwtAuthGuard } from '../../security/auth/jwt/jwt-auth.guard.js';
import { type Pkw } from '../entity/pkw.entity.js';
import { PkwWriteService } from '../service/pkw-write.service.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
//import { RolesAllowed } from '../../security/auth/roles/roles-allowed.decorator.js';
//import { RolesGuard } from '../../security/auth/roles/roles.guard.js';
import { getBaseUri } from './getBaseUri.js';
import { getLogger } from '../../logger/logger.js';
import { paths } from '../../config/paths.js';
import { Roles } from 'nest-keycloak-connect';

const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';
/**
 * Die Controller-Klasse für die Verwaltung von Bücher.
 */
@Controller(paths.rest)
//@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Pkw REST-API')
@ApiBearerAuth()
export class PkwWriteController {
    readonly #service: PkwWriteService;

    readonly #logger = getLogger(PkwWriteController.name);

    constructor(service: PkwWriteService) {
        this.#service = service;
    }

    /**
     * Ein neuer Pkw wird asynchron angelegt. Der neu anzulegende Pkw ist als
     * JSON-Datensatz im Request-Objekt enthalten. Wenn es keine
     * Verletzungen von Constraints gibt, wird der Statuscode `201` (`Created`)
     * gesetzt und im Response-Header wird `Location` auf die URI so gesetzt,
     * dass damit der neu angelegte Pkw abgerufen werden kann.
     *
     * Falls Constraints verletzt sind, wird der Statuscode `400` (`Bad Request`)
     * gesetzt und genauso auch wenn der Titel oder die ISBN-Nummer bereits
     * existieren.
     *
     * @param pkw JSON-Daten für einen Pkw im Request-Body.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Post()
    //@RolesAllowed('admin', 'fachabteilung')
    @Roles({ roles: ['realm:app-admin'] })    
    @ApiOperation({ summary: 'Einen neuen Pkw anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Pkwdaten' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() pkwDTO: PkwDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: pkwDTO=%o', pkwDTO);

        const pkw = this.#pkwDtoToPkw(pkwDTO);
        const result = await this.#service.create(pkw);

        const location = `${getBaseUri(req)}/${result}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Ein vorhandener Pkw wird asynchron aktualisiert.
     *
     * Im Request-Objekt von Express muss die ID des zu aktualisierenden Pkws
     * als Pfad-Parameter enthalten sein. Außerdem muss im Rumpf das zu
     * aktualisierende Pkw als JSON-Datensatz enthalten sein. Damit die
     * Aktualisierung überhaupt durchgeführt werden kann, muss im Header
     * `If-Match` auf die korrekte Version für optimistische Synchronisation
     * gesetzt sein.
     *
     * Bei erfolgreicher Aktualisierung wird der Statuscode `204` (`No Content`)
     * gesetzt und im Header auch `ETag` mit der neuen Version mitgeliefert.
     *
     * Falls die Versionsnummer fehlt, wird der Statuscode `428` (`Precondition
     * required`) gesetzt; und falls sie nicht korrekt ist, der Statuscode `412`
     * (`Precondition failed`). Falls Constraints verletzt sind, wird der
     * Statuscode `400` (`Bad Request`) gesetzt und genauso auch wenn der neue
     * Titel oder die neue ISBN-Nummer bereits existieren.
     *
     * @param pkw Pkwdaten im Body des Request-Objekts.
     * @param id Pfad-Paramater für die ID.
     * @param version Versionsnummer aus dem Header _If-Match_.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Put(':id')
    //@RolesAllowed('admin', 'fachabteilung')
    @Roles({ roles: ['realm:app-admin'] })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Ein vorhandener Pkw aktualisieren',
        tags: ['Aktualisieren'],
    })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Pkwdaten' })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: 'Header "If-Match" fehlt',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() pkwDTO: PkwDtoOhneRef,
        @Param('id') id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%s, pkwDTO=%o, version=%s',
            id,
            pkwDTO,
            version,
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const pkw = this.#pkwDtoOhneRefToPkw(pkwDTO);
        const neueVersion = await this.#service.update({ id, pkw, version });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    /**
     * Ein Pkw wird anhand seiner ID-gelöscht, die als Pfad-Parameter angegeben
     * ist. Der zurückgelieferte Statuscode ist `204` (`No Content`).
     *
     * @param id Pfad-Paramater für die ID.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Delete(':id')
    //@RolesAllowed('admin')
    @Roles({ roles: ['realm:app-admin'] })     
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Pkw mit der ID löschen' })
    @ApiNoContentResponse({
        description: 'Der Pkw wurde gelöscht oder war nicht vorhanden',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%s', id);
        await this.#service.delete(id);
    }

    #pkwDtoToPkw(pkwDTO: PkwDTO): Pkw {
        const bauartDTO = pkwDTO.bauart;
        const bauart: Bauart = {
            id: undefined,
            model: bauartDTO.model,
            variante: bauartDTO.variante,
            pkw: undefined,
        };
        const pkw = {
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

        pkw.bauart.pkw = pkw;
        return pkw;
    }

    #pkwDtoOhneRefToPkw(pkwDTO: PkwDtoOhneRef): Pkw {
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
}
