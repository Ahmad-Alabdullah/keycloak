/* eslint-disable max-classes-per-file, @typescript-eslint/no-magic-numbers */
/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Florian Goebel, Hochschule Karlsruhe
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
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

import {
    ArrayUnique,
    IsAlphanumeric,
    IsBoolean,
    IsISO8601,
    IsInt,
    IsOptional,
    IsPositive,
    IsUrl,
    Length,
    Matches,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BauartDTO } from './bauartDTO.entity.js';
import { type MotorArt } from '../entity/pkw.entity.js';
import { Type } from 'class-transformer';

export const MAX_RATING = 5;

/**
 * Entity-Klasse für Pkws ohne TypeORM und ohne Referenzen.
 */
export class PkwDtoOhneRef {
    // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
    @IsAlphanumeric()
    @Length(17, 17, {
        message: 'FIN must be exactly 17 alphanumeric characters',
    })
    @ApiProperty({ example: 'W0L000051T2123456', type: String })
    readonly fin!: string;

    @IsInt()
    @Min(0)
    @Max(MAX_RATING)
    @ApiProperty({ example: 5, type: Number })
    readonly ncapRating: number | undefined;

    @Matches(/^VERBRENNER$|^ELEKTRO$/u)
    @IsOptional()
    @ApiProperty({ example: 'VERBRENNER', type: String })
    readonly motor: MotorArt | undefined;

    @IsPositive()
    @ApiProperty({ example: 1, type: Number })
    // statt number ggf. Decimal aus decimal.js analog zu BigDecimal von Java
    readonly preis!: number;

    @Min(0)
    @Max(1)
    @IsOptional()
    @ApiProperty({ example: 0.1, type: Number })
    readonly rabatt: number | undefined;

    @IsBoolean()
    @ApiProperty({ example: true, type: Boolean })
    readonly lieferbar: boolean | undefined;

    @IsISO8601({ strict: true })
    @IsOptional()
    @ApiProperty({ example: '2021-01-31' })
    readonly releaseDatum: Date | string | undefined;

    @IsUrl()
    @IsOptional()
    @ApiProperty({ example: 'https://test.de/', type: String })
    readonly homepage: string | undefined;

    @IsOptional()
    @ArrayUnique()
    @ApiProperty({ example: ['msg', 'bmw'] })
    readonly schlagwoerter: string[] | undefined;
}

/**
 * Entity-Klasse für Pkws ohne TypeORM.
 */
export class PkwDTO extends PkwDtoOhneRef {
    @ValidateNested()
    @Type(() => BauartDTO)
    @ApiProperty({ type: BauartDTO })
    readonly bauart!: BauartDTO; //NOSONAR
}
/* eslint-enable max-classes-per-file, @typescript-eslint/no-magic-numbers */
