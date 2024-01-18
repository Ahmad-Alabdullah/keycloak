-- Copyright (C) 2023 - present Juergen Zimmermann, Hochschule Karlsruhe
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- https://docs.python.org/dev/library/sqlite3.html#sqlite3-cli
-- sqlite3 patient.sqlite

-- https://sqlite.org/lang_createtable.html
-- https://sqlite.org/stricttables.html ab 3.37.0
-- https://sqlite.org/syntax/column-constraint.html
-- https://sqlite.org/autoinc.html
-- https://sqlite.org/stricttables.html: INT, INTEGER, REAL, TEXT
-- https://sqlite.org/lang_createindex.html
-- https://stackoverflow.com/questions/37619526/how-can-i-change-the-default-sqlite-timezone

CREATE TABLE IF NOT EXISTS pkw (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    version        INTEGER NOT NULL DEFAULT 0,
    fin            TEXT NOT NULL UNIQUE,
    ncapRating    INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
    motor          TEXT,
    preis          REAL,
    rabatt         REAL,
    lieferbar      INTEGER NOT NULL CHECK (lieferbar = 0 OR lieferbar = 1) DEFAULT 0,
    releaseDatum   TEXT,
    homepage       TEXT,
    schlagwoerter  TEXT,
    erzeugt        TEXT NOT NULL,
    aktualisiert   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pkw_fin_idx ON pkw(fin);

CREATE TABLE IF NOT EXISTS bauart (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    model       TEXT NOT NULL,
    variante    TEXT,
    pkw_id      INTEGER NOT NULL UNIQUE REFERENCES pkw
);

