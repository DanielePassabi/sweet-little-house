// LG OLED83C14LA, dimensions without stand, from LG's specification sheet:
// https://www.lg.com/uk/tvs/oled-tv/oled83c14la/
export const television={model:'LG C1 83',width:1.851,height:1.062,depth:.0553,centerY:1.47,centerZ:9.72,frontX:3.175};
// Centred 260 cm oak console without a tower. The taller PC fits entirely
// to the right of the screen; the PS4 lies flat to the left of the controllers.
export const mediaConsole={x:3.33,z:television.centerZ,depth:.48,width:2.60,top:.60};
// The PC and controllers are estimated from the photographs. Local X runs along
// the TV, local Z faces the sofa. The rotated glass side faces left, towards the
// television; the solid black side faces right towards the adjacent wall.
export const desktopPC={x:1.14,z:.155,rotation:-Math.PI/2,width:.44,depth:.23,height:.46,bottom:mediaConsole.top};
export const gameControllers=[{name:'white-controller',x:.10,z:.18,angle:-.15,color:'#eeeae2'},
 {name:'grey-controller',x:.36,z:.17,angle:.12,color:'#888981',retro:true}];
// https://www.steamdeck.com/en/tech / https://www.steamdeck.com/en/tech/dock
export const steamDeck={x:.63,z:.155,width:.298,height:.117,depth:.049,tilt:-Math.PI/15};
export const steamDock={width:.117,height:.029,depth:.0505,bottom:mediaConsole.top};
// Official chassis dimensions in the horizontal position, on small rubber feet.
// https://www.playstation.com/en-au/ps4/tech-specs/
export const ps4Pro={x:-.42,z:.115,width:.295,height:.055,depth:.327,bottom:mediaConsole.top,footHeight:.004};
// The 12 mm raceway fits the 15 mm gap between the wall and the cabinet back.
export const cableDuct={x:0,z:-.0925,width:.04,depth:.012,bottom:.23,top:television.centerY};
export const dockCableHole={x:steamDeck.x,z:steamDeck.z-steamDock.depth/2-.009,radius:.032,rearY:mediaConsole.top-.08};
export const mediaCollider={minX:mediaConsole.x-mediaConsole.depth/2,maxX:mediaConsole.x+mediaConsole.depth/2,
 minZ:mediaConsole.z-mediaConsole.width/2,maxZ:mediaConsole.z+mediaConsole.width/2};
