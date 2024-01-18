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

import { afterAll, beforeAll, describe, test } from '@jest/globals';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { type ErrorResponse } from './error-response.js';
import { HttpStatus } from '@nestjs/common';
import { type PkwDTO } from '../../src/pkw/rest/pkwDTO.entity.js';
import { PkwReadService } from '../../src/pkw/service/pkw-read.service.js';
import { loginRest } from '../login.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuerPkw: PkwDTO = {
    fin: 'W0L550051T21Z3456',
    ncapRating: 1,
    motor: 'ELEKTRO',
    preis: 99.99,
    rabatt: 0.123,
    lieferbar: true,
    releaseDatum: '2022-02-28',
    homepage: 'https://post.rest',
    schlagwoerter: ['amg', 'A-Klasse'],
    bauart: {
        model: 'A',
        variante: 'limousine',
    },
};
const neuerPkwInvalid: Record<string, unknown> = {
    fin: 'falsche-FIN',
    ncapRating: -1,
    motor: 'UNSICHTBAR',
    preis: -1,
    rabatt: 2,
    lieferbar: true,
    releaseDatum: '12345-123-123',
    homepage: 'anyHomepage',
    bauart: {
        model: '?!',
        variante: 'Varianteinvalid',
    },
};
const neuerPkwFinExistiert: PkwDTO = {
    fin: 'W0L550051T21Z3456',
    ncapRating: 1,
    motor: 'VERBRENNER',
    preis: 99.99,
    rabatt: 0.099,
    lieferbar: true,
    releaseDatum: '2022-02-28',
    homepage: 'https://post.fin/',
    schlagwoerter: ['mercedes', 'vw'],
    bauart: {
        model: 'Modelpostfin',
        variante: 'Variantepostfin',
    },
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('POST /rest', () => {
    let client: AxiosInstance;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json', // eslint-disable-line @typescript-eslint/naming-convention
    };

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: (status) => status < 500, // eslint-disable-line @typescript-eslint/no-magic-numbers
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Neuer Pkw', async () => {
        // given
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<string> = await client.post(
            '/rest',
            neuerPkw,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const { location } = response.headers as { location: string };

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash: number = location.lastIndexOf('/');

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(PkwReadService.ID_PATTERN.test(idStr)).toBe(true);

        expect(data).toBe('');
    });

    test('Neuer Pkw mit ungueltigen Daten', async () => {
        // given
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        const expectedMsg = [
            expect.stringMatching(/^bauart.model /u),
            expect.stringMatching(/^FIN /u),
            expect.stringMatching(/^fin /u),
            expect.stringMatching(/^ncapRating /u),
            expect.stringMatching(/^motor /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^rabatt /u),
            expect.stringMatching(/^releaseDatum /u),
            expect.stringMatching(/^homepage /u),
        ];

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuerPkwInvalid,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const messages: string[] = data.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    test('Neuer Pkw, aber die FIN existiert bereits', async () => {
        // given
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<ErrorResponse> = await client.post(
            '/rest',
            neuerPkwFinExistiert,
            { headers },
        );

        // then
        const { data } = response;

        const { message, statusCode } = data;

        expect(message).toEqual(expect.stringContaining('FIN'));
        expect(statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    test('Neuer Pkw als Kunde', async () => {
        // given
        const token = await loginRest(client, 'adriana.alpha', 'p');
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuerPkw,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.FORBIDDEN);
        expect(data.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    test('Neuer Pkw, aber ohne Token', async () => {
        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuerPkw,
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.FORBIDDEN);
        expect(data.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    test('Neuer Pkw, aber mit falschem Token', async () => {
        // given
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuerPkw,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.FORBIDDEN);
        expect(data.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    test.todo('Abgelaufener Token');
});
