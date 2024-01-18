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

-- "Konzeption und Realisierung eines aktiven Datenbanksystems"
-- "Verteilte Komponenten und Datenbankanbindung"
-- "Design Patterns"
-- "Freiburger Chorbuch"
-- "Maschinelle Lernverfahren zur Behandlung von Bonitätsrisiken im Mobilfunkgeschäft"
-- "Software Pioneers"

INSERT INTO pkw(id, version, fin, ncapRating, motor, preis, rabatt, lieferbar, releaseDatum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (1,0,'JH4DC2345RS001234',4,'VERBRENNER',60000.0,0.011,true,'2022-02-01','https://bmw.de','bmw','2022-02-01 00:00:00','2022-02-01 00:00:00');
INSERT INTO pkw(id, version, fin, ncapRating, motor, preis, rabatt, lieferbar, releaseDatum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (20,0,'1HGCM82633A123456',2,'ELEKTRO',50000.0,0.005,true,'2022-02-02','https://mercedes-benz.de','eq, amg','2022-02-02 00:00:00','2022-02-02 00:00:00');
INSERT INTO pkw(id, version, fin, ncapRating, motor, preis, rabatt, lieferbar, releaseDatum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (30,0,'WAUZZZ8E0A1234567',3,'VERBRENNER',33000.3,0.033,true,'2022-02-03','https://audi.com','a4','2022-02-03 00:00:00','2022-02-03 00:00:00');
INSERT INTO pkw(id, version, fin, ncapRating, motor, preis, rabatt, lieferbar, releaseDatum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (40,0,'5YJSA1E11GF123456',5,'VERBRENNER',44000.4,0.044,true,'2022-02-04','https://vw.de',null,'2022-02-04 00:00:00','2022-02-04 00:00:00');
INSERT INTO pkw(id, version, fin, ncapRating, motor, preis, rabatt, lieferbar, releaseDatum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (50,0,'2HGEJ634XY1234567',2,'ELEKTRO',55000.5,0.055,true,'2022-02-05','https://tesla.com','s, 3, y','2022-02-05 00:00:00','2022-02-05 00:00:00');
INSERT INTO pkw(id, version, fin, ncapRating, motor, preis, rabatt, lieferbar, releaseDatum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (60,0,'1FTSW21PXYED12345',1,'VERBRENNER',66000.6,0.066,true,'2022-02-06','https://mini.co.uk','countryman','2022-02-06 00:00:00','2022-02-06 00:00:00');

INSERT INTO bauart(id, model, variante, pkw_id) VALUES
    (1,'3 Series','M340i',1);
INSERT INTO bauart(id, model, variante, pkw_id) VALUES
    (20,'C-Class',null,20);
INSERT INTO bauart(id, model, variante, pkw_id) VALUES
    (30,'A3','S Line',30);
INSERT INTO bauart(id, model, variante, pkw_id) VALUES
    (40,'Golf','GTI',40);
INSERT INTO bauart(id, model, variante, pkw_id) VALUES
    (50,'Model 3','long range',50);
INSERT INTO bauart(id, model, variante, pkw_id) VALUES
    (60,'Cooper','Convertible',60);

