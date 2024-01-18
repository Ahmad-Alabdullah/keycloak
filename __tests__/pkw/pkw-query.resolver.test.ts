/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-extra-non-null-assertion */
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

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../../__tests__/testserver.js';
import { type GraphQLFormattedError } from 'graphql';
import { type GraphQLRequest } from '@apollo/server';
import { HttpStatus } from '@nestjs/common';
import { type Pkw } from '../../src/pkw/entity/pkw.entity.js';

// eslint-disable-next-line jest/no-export
export interface GraphQLResponseBody {
    data?: Record<string, any> | null;
    errors?: readonly [GraphQLFormattedError];
}

type PkwDTO = Omit<Pkw, 'aktualisiert' | 'erzeugt' | 'rabatt'> & {
    rabatt: string;
};

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idVorhanden = '1';

const bauartVorhanden = 'Alpha';

const teilBauartVorhanden = 'a';

const teilBauartNichtVorhanden = 'abc';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Queries', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}/`;
        client = axios.create({
            baseURL,
            httpsAgent,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Pkw zu vorhandener ID', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    pkw(id: "${idVorhanden}") {
                        version
                        fin
                        motor
                        bauart {
                            model
                        }
                    }
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu); // eslint-disable-line sonarjs/no-duplicate-string
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { pkw } = data.data!;
        const result: PkwDTO = pkw;

        expect(result.bauart?.model).toMatch(/^\w/u);
        expect(result.version).toBeGreaterThan(-1);
        expect(result.id).toBeUndefined();
    });

    test('Pkw zu nicht-vorhandener ID', async () => {
        // given
        const id = '999999';
        const body: GraphQLRequest = {
            query: `
                {
                    pkw(id: "${id}") {
                        bauart {
                            model
                        }
                    }
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.pkw).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toBe(`Es gibt keinen Pkw mit der ID ${id}.`);
        expect(path).toBeDefined();
        expect(path!![0]).toBe('pkw');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Pkw zu vorhandenem Model', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    pkws(bauart: "${bauartVorhanden}") {
                        motor
                        bauart {
                            model
                        }
                    }
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        expect(data.data).toBeDefined();

        const { pkws } = data.data!;

        expect(pkws).not.toHaveLength(0);

        const pkwsArray: PkwDTO[] = pkws;

        expect(pkwsArray).toHaveLength(1);

        const [pkw] = pkwsArray;

        expect(pkw!.bauart?.model).toBe(bauartVorhanden);
    });

    test('Pkw zu vorhandener Teil-Bauart', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    pkws(bauart: "${teilBauartVorhanden}") {
                        motor
                        bauart {
                            model
                        }
                    }
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { pkws } = data.data!;

        expect(pkws).not.toHaveLength(0);

        const pkwsArray: PkwDTO[] = pkws;
        pkwsArray
            .map((pkw) => pkw.bauart)
            .forEach((bauart) =>
                expect(bauart?.model.toLowerCase()).toEqual(
                    expect.stringContaining(teilBauartVorhanden),
                ),
            );
    });

    test('Pkw zu nicht vorhandenem Model', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    pkws(bauart: "${teilBauartNichtVorhanden}") {
                        motor
                        bauart {
                            model
                        }
                    }
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.pkws).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Pkw's gefunden:/u);
        expect(path).toBeDefined();
        expect(path!![0]).toBe('pkws');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-extra-non-null-assertion */
