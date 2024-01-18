/**
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

import {
    Column,
    CreateDateColumn,
    Entity,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator.js';
import { Bauart } from './bauart.entity.js';
import { DecimalTransformer } from './decimal-transformer.js';

/**
 * Alias-Typ für gültige Strings bei der Art eines Motors.
 */
export type MotorArt = 'VERBRENNER' | 'ELEKTRO';

/**
 * Entity-Klasse zu einer relationalen Tabelle
 */
// https://typeorm.io/entities
@Entity()
export class Pkw {
    @Column('int')
    // https://typeorm.io/entities#primary-columns
    // CAVEAT: zuerst @Column() und erst dann @PrimaryGeneratedColumn()
    // default: strategy = 'increment' (SEQUENCE, GENERATED ALWAYS AS IDENTITY, AUTO_INCREMENT)
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @VersionColumn()
    readonly version: number | undefined;

    @Column('varchar', { unique: true, length: 16 })
    @ApiProperty({ example: '0-0070-0644-6', type: String })
    readonly fin!: string;

    @Column('int', { name: 'ncaprating' })
    @ApiProperty({ example: 5, type: Number })
    readonly ncapRating: number | undefined;

    @Column('varchar', { length: 12 })
    @ApiProperty({ example: 'VERBRENNER', type: String })
    readonly motor: MotorArt | undefined;

    @Column('decimal', {
        precision: 8,
        scale: 2,
        transformer: new DecimalTransformer(),
    })
    @ApiProperty({ example: 1, type: Number })
    // statt number ggf. Decimal aus decimal.js analog zu BigDecimal von Java
    readonly preis!: number;

    @Column('decimal', {
        precision: 4,
        scale: 3,
        transformer: new DecimalTransformer(),
    })
    @ApiProperty({ example: 0.1, type: Number })
    readonly rabatt: number | undefined;

    @Column('boolean')
    @ApiProperty({ example: true, type: Boolean })
    readonly lieferbar: boolean | undefined;

    // das Temporal-API ab ES2022 wird von TypeORM noch nicht unterstuetzt
    @Column('date', { name: 'releasedatum' })
    @ApiProperty({ example: '2021-01-31' })
    readonly releaseDatum: Date | string | undefined;

    @Column('varchar', { length: 40 })
    @ApiProperty({ example: 'https://test.de/', type: String })
    readonly homepage: string | undefined;

    // https://typeorm.io/entities#simple-array-column-type
    @Column('simple-array')
    readonly schlagwoerter: string[] | undefined;

    // undefined wegen Updates
    @OneToOne(() => Bauart, (bauart) => bauart.pkw, {
        cascade: ['insert', 'remove'],
    })
    readonly bauart: Bauart | undefined;

    // https://typeorm.io/entities#special-columns
    // https://typeorm.io/entities#column-types-for-postgres
    // https://typeorm.io/entities#column-types-for-mysql--mariadb
    // https://typeorm.io/entities#column-types-for-sqlite--cordova--react-native--expo
    // 'better-sqlite3' erfordert Python zum Uebersetzen, wenn das Docker-Image gebaut wird
    @CreateDateColumn({
        type: 'timestamp',
    })
    // SQLite:
    // @CreateDateColumn({ type: 'datetime' })
    readonly erzeugt: Date | undefined;

    @UpdateDateColumn({
        type: 'timestamp',
    })
    // SQLite:
    // @UpdateDateColumn({ type: 'datetime' })
    readonly aktualisiert: Date | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            version: this.version,
            fin: this.fin,
            ncapRating: this.ncapRating,
            motorArt: this.motor,
            preis: this.preis,
            rabatt: this.rabatt,
            lieferbar: this.lieferbar,
            releaseDatum: this.releaseDatum,
            homepage: this.homepage,
            schlagwoerter: this.schlagwoerter,
        });
}
