import assert from 'node:assert/strict';
import {parquetPolygons,parquetRoomIds} from '../dist/floor-layout.js';
import {point,insidePolygon} from '../dist/model.js';
const isParquet=p=>{const [x,z]=point(p);return parquetPolygons.some(poly=>insidePolygon(x,z,poly));};
assert.deepEqual(parquetRoomIds,['room2','room3','bedroom']);
for(const x of [415,450,500,523])for(const z of [535,570,610,626])assert.ok(isParquet([x,z]),'Highlighted bedroom access recess is entirely parquet');
for(const p of [[450,500],[555,290],[160,650],[185,190],[409,580]])assert.ok(isParquet(p),'Existing bedrooms and threshold remain continuous');
for(const p of [[540,570],[614,620],[355,580],[480,640],[530,1120],[160,420]])assert.equal(isParquet(p),false,'Bathrooms, main hall and living room keep their current floor');
console.log('PASS: parquet covers the bedroom access recess and threshold; remaining finishes unchanged.');
