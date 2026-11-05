export function wageDirection(current:number,target:number):'up'|'down'|null{
 return target>current*1.005?'up':target<current*.995?'down':null;
}
