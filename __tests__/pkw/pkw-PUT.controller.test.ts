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
} from '../../__tests__/testserver.js';
import { type ErrorResponse } from './error-response.js';
import { HttpStatus } from '@nestjs/common';
import { type PkwDtoOhneRef } from '../../src/pkw/rest/pkwDTO.entity.js';
import { loginRest } from '../../__tests__/login.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geaenderterPkw: PkwDtoOhneRef = {
    fin: 'W0L550051T21Z3456',
    ncapRating: 5,
    motor: 'ELEKTRO',
    preis: 3333,
    rabatt: 0.33,
    lieferbar: true,
    releaseDatum: '2022-03-03',
    homepage: 'https://geaendert.put.rest',
    schlagwoerter: ['TESLA'],
};
const idVorhanden = '30';

const geaenderterPkwIdNichtVorhanden: PkwDtoOhneRef = {
    fin: 'W0L550051T21Z3456',
    ncapRating: 4,
    motor: 'VERBRENNER',
    preis: 44.4,
    rabatt: 0.044,
    lieferbar: true,
    releaseDatum: '2022-02-04',
    homepage: 'https://acme.de',
    schlagwoerter: ['BMW'],
};
const idNichtVorhanden = '999999';

const geaenderterPkwInvalid: Record<string, unknown> = {
    fin: 'falsche-FIN',
    ncapRating: -1,
    motor: 'UNSICHTBAR',
    preis: -1,
    rabatt: 2,
    lieferbar: true,
    releaseDatum: '12345-123-123',
    bauart: '?!',
    homepage: 'anyHomepage',
};

const veralteterPkw: PkwDtoOhneRef = {
    fin: 'W0L550051T21Z3456',
    ncapRating: 1,
    motor: 'ELEKTRO',
    preis: 44.4,
    rabatt: 0.044,
    lieferbar: true,
    releaseDatum: '2022-02-04',
    homepage: 'https://acme.de',
    schlagwoerter: ['TESLA'],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('PUT /rest/:id', () => {
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
            headers,
            httpsAgent,
            validateStatus: (status) => status < 500, // eslint-disable-line @typescript-eslint/no-magic-numbers
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Vorhandener Pkw aendern', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<string> = await client.put(
            url,
            geaenderterPkw,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.NO_CONTENT);
        expect(data).toBe('');
    });

    test('Nicht-vorhandener Pkw aendern', async () => {
        // given
        const url = `/rest/${idNichtVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<string> = await client.put(
            url,
            geaenderterPkwIdNichtVorhanden,
            { headers },
        );

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    test('Vorhandener Pkw aendern, aber mit ungueltigen Daten', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';
        const expectedMsg = [
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
        const response: AxiosResponse<Record<string, any>> = await client.put(
            url,
            geaenderterPkwInvalid,
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

    test('Vorhandener Pkw aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        delete headers['If-Match'];

        // when
        const response: AxiosResponse<string> = await client.put(
            url,
            geaenderterPkw,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.PRECONDITION_REQUIRED);
        expect(data).toBe('Header "If-Match" fehlt');
    });

    test('Vorhandener Pkw aendern, aber mit alter Versionsnummer', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"-1"';

        // when
        const response: AxiosResponse<ErrorResponse> = await client.put(
            url,
            veralteterPkw,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.PRECONDITION_FAILED);

        const { message, statusCode } = data;

        expect(message).toMatch(/Versionsnummer/u);
        expect(statusCode).toBe(HttpStatus.PRECONDITION_FAILED);
    });

    test('Vorhandener Pkw aendern, aber ohne Token', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        delete headers.Authorization;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<Record<string, any>> = await client.put(
            url,
            geaenderterPkw,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.FORBIDDEN);
        expect(data.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    test('Vorhandener Pkw aendern, aber mit falschem Token', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.put(
            url,
            geaenderterPkw,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.FORBIDDEN);
        expect(data.statusCode).toBe(HttpStatus.FORBIDDEN);
    });
});
