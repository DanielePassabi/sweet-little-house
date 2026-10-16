import {point} from './model.js';

// Illustrative suspended ceramics: 38 × 58 cm, with an 18 cm floor clearance.
// Local -Z is the flat mounting face; local +Z points into the bathroom.
export const sanitarySize={width:.38,depth:.58,bottom:.18,rim:.415};
const bath1Wall=point([42,320])[1]+.15/2,bath2Wall=point([712,125])[0]-.30/2;
export const sanitaryFixtures=[
 {id:'bath1-bidet',type:'bidet',x:1.42,z:bath1Wall+.29,rotation:0},
 {id:'bath1-toilet',type:'toilet',x:2.12,z:bath1Wall+.29,rotation:0},
 {id:'bath2-bidet',type:'bidet',x:bath2Wall-.29,z:6.15,rotation:Math.PI/2},
 {id:'bath2-toilet',type:'toilet',x:bath2Wall-.29,z:6.91,rotation:Math.PI/2},
];
export function sanitaryPoint(f,x,z){
 return [f.x+Math.cos(f.rotation)*x-Math.sin(f.rotation)*z,f.z+Math.sin(f.rotation)*x+Math.cos(f.rotation)*z];
}
// A convex outline includes the flat rear housing as well as the oval bowl.
// Retain conservative full-height collision for the visitor and robot.
export const sanitaryColliders=sanitaryFixtures.map(f=>{
 const local=[[-.19,-.29],[.19,-.29],[.19,0]];
 for(let i=1;i<=20;i++){const a=i*Math.PI/20;local.push([Math.cos(a)*.19,Math.sin(a)*.29]);}
 const points=local.map(([x,z])=>sanitaryPoint(f,x,z));
 return {points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))};
});
