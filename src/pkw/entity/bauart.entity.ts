import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Pkw } from './pkw.entity.js';

@Entity()
export class Bauart {
    @Column('int')
    // https://typeorm.io/entities#primary-columns
    // CAVEAT: zuerst @Column() und erst dann @PrimaryGeneratedColumn()
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column('varchar', { unique: true, length: 32 })
    readonly model!: string;

    @Column('varchar', { length: 16 })
    readonly variante: string | undefined;

    @ManyToOne(() => Pkw, (pkw) => pkw.bauart)
    @JoinColumn({ name: 'pkw_id' })
    pkw: Pkw | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            model: this.model,
            variante: this.variante,
        });
}
