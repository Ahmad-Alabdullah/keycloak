/* eslint-disable max-lines, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-extra-non-null-assertion */
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
import { afterAll, beforeAll, describe, test } from '@jest/globals';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../../__tests__/testserver.js';
import { type GraphQLRequest } from '@apollo/server';
import { type GraphQLResponseBody } from './pkw-query.resolver.test.js';
import { HttpStatus } from '@nestjs/common';
import { loginGraphQL } from '../../__tests__/login.js';
// eslint-disable-next-line jest/no-export
export type GraphQLQuery = Pick<GraphQLRequest, 'query'>;

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------

const idLoeschen = '60';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------

// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Mutations', () => {
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
    // -------------------------------------------------------------------------

    test('Neuer Pkw', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            fin: "W0L550051T21Z3456",
                            ncapRating: 1,
                            motor: ELEKTRO,
                            preis: 99.99,
                            rabatt: 0.123,
                            lieferbar: true,
                            releaseDatum: "2022-02-28",
                            homepage: "https://create.mutation",
                            schlagwoerter: ["BMW", "AUDI"],
                            bauart: {
                                model: "Y",
                                variante: "hatchback"
                            }
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );
        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu); // eslint-disable-line sonarjs/no-duplicate-string
        expect(data.data).toBeDefined();

        const { create } = data.data!;

        // Der Wert der Mutation ist die generierte ID
        expect(create).toBeDefined();
        expect(create.id).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    // eslint-disable-next-line max-lines-per-function
    test('Pkw mit ungueltigen Werten neu anlegen', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            fin: "falsche-ISBN",
                            ncapRating: -1,
                            motor: VERBRENNER,
                            preis: -1,
                            rabatt: 2,
                            lieferbar: false,
                            releaseDatum: "12345-123-123",
                            homepage: "anyHomepage",
                            bauart: {
                                model: "?!"
                            }
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^bauart.model /u),
            expect.stringMatching(/^FIN /u),
            expect.stringMatching(/^fin /u),
            expect.stringMatching(/^ncapRating /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^rabatt /u),
            expect.stringMatching(/^releaseDatum /u),
            expect.stringMatching(/^homepage /u),
        ];

        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );
        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.create).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message } = error;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Neuer Pkw nur als "admin"/"fachabteilung"', async () => {
        // given
        const token = await loginGraphQL(client, 'adriana.alpha', 'p');
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            fin: "W0L550051T21Z3123",
                            ncapRating: 1,
                            motor: VERBRENNER,
                            preis: 11.1,
                            rabatt: 0.011,
                            lieferbar: true,
                            releaseDatum: "2021-01-31",
                            homepage: "http://acme.com",
                            schlagwoerter: ["mercedes"]
                            bauart: {
                                model: "Modelcreatemutation",
                                variante: "variantecreatemutation"
                            }
                        }
                    ) {
                        id
                    }
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, extensions } = error;

        expect(message).toBe('Forbidden resource');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Pkw aktualisieren', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "40",
                            version: 0,
                            fin: "W0L550051T2123456",
                            ncapRating: 5,
                            motor: VERBRENNER,
                            preis: 444.44,
                            rabatt: 0.099,
                            lieferbar: false,
                            releaseDatum: "2021-04-04",
                            homepage: "https://update.mutation"
                            schlagwoerter: ["mercedes", "vw"],
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );
        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const { update } = data.data!;

        // Der Wert der Mutation ist die neue Versionsnummer
        expect(update.version).toBe(1);
    });

    // -------------------------------------------------------------------------
    // eslint-disable-next-line max-lines-per-function
    test('Pkw mit ungueltigen Werten aktualisieren', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const id = '40';
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            fin: "falsche-ISBN",
                            ncapRating: -1,
                            motor: VERBRENNER,
                            preis: -1,
                            rabatt: 2,
                            lieferbar: false,
                            releaseDatum: "12345-123-123",
                            homepage: "anyHomepage",
                            schlagwoerter: ["audi", "vw"]
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^FIN /u),
            expect.stringMatching(/^fin /u),
            expect.stringMatching(/^ncapRating /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^rabatt /u),
            expect.stringMatching(/^releaseDatum /u),
            expect.stringMatching(/^homepage /u),
        ];
        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message } = error;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Nicht-vorhandenen Pkw aktualisieren', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const id = '999999';
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            fin: "W0L550051T21Z3098",
                            ncapRating: 5,
                            motor: ELEKTRO,
                            preis: 99.99,
                            rabatt: 0.099,
                            lieferbar: false,
                            releaseDatum: "2021-01-02",
                            homepage: "https://acme.com",
                            schlagwoerter: ["mercedes", "bmw"]
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );
        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message, path, extensions } = error;

        expect(message).toBe(
            `Es gibt keinen Pkw mit der ID ${id.toLowerCase()}.`,
        );
        expect(path).toBeDefined();
        expect(path!![0]).toBe('update');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Pkw loeschen', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}")
                }
            `,
        };
        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );
        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const deleteMutation = data.data!.delete;

        // Der Wert der Mutation ist true (falls geloescht wurde) oder false
        expect(deleteMutation).toBe(true);
    });
});
/* eslint-enable max-lines, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-extra-non-null-assertion */
