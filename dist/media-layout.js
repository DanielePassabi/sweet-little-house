// LG OLED83C14LA, dimensions without stand, from LG's specification sheet:
// https://www.lg.com/uk/tvs/oled-tv/oled83c14la/
export const television={model:'LG C1 83',width:1.851,height:1.062,depth:.0553,centerY:1.47,centerZ:9.72,frontX:3.175};
export const mediaConsole={x:3.28,z:9.72,depth:.38,width:2.02,top:.45};
// The PC and controllers are estimated from the photographs. Local X runs along
// the console, local Z faces the sofa; the glass side of the tower faces forward.
export const desktopPC={x:-.72,z:.135,width:.44,depth:.23,height:.46,bottom:mediaConsole.top};
export const gameControllers=[{name:'white-controller',x:.10,z:.18,angle:-.15,color:'#eeeae2'},
 {name:'grey-controller',x:.36,z:.17,angle:.12,color:'#888981',retro:true}];
export const cableDuct={x:0,z:-.0875,width:.04,depth:.019,bottom:.43,top:television.centerY};
export const mediaCollider={minX:mediaConsole.x-mediaConsole.depth/2,maxX:3.489,
 minZ:mediaConsole.z-mediaConsole.width/2,maxZ:mediaConsole.z+mediaConsole.width/2};
