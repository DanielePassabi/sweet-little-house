import SunCalc from './vendor/suncalc.js';
export const LOCATION={latitude:45.93333,longitude:12.73333,timeZone:'Europe/Rome'};
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:LOCATION.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function parts(date){return Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]));}
export function romeDate(date=new Date()){const p=parts(date);return `${p.year}-${p.month}-${p.day}`;}
export function localInstant(day,minutes){
 const [y,m,d]=day.split('-').map(Number),target=Date.UTC(y,m-1,d,0,minutes);
 let utc=target;
 for(let i=0;i<3;i++){
  const p=parts(new Date(utc));const actual=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);
  utc+=target-actual;
 }
 return new Date(utc);
}
export function solarPosition(day,minutes){
 const instant=localInstant(day,minutes),p=SunCalc.getPosition(instant,LOCATION.latitude,LOCATION.longitude);
 // SunCalc 1.x azimuth: 0=S, positive=W. Plan axes: +X=N, +Z=E.
 const horizontal=Math.cos(p.altitude);
 return {instant,altitude:p.altitude,azimuth:(p.azimuth*180/Math.PI+180+360)%360,direction:[-Math.cos(p.azimuth)*horizontal,Math.sin(p.altitude),-Math.sin(p.azimuth)*horizontal]};
}
