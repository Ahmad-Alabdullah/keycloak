import { Bauart } from './bauart.entity.js';
import { Pkw } from './pkw.entity.js';

// erforderlich in src/config/db.ts und src/buch/buch.module.ts
export const entities = [Bauart, Pkw];
