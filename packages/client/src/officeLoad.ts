import {companyById,officeLoad} from '@econ/sim';
import type {Building,World} from '@econ/sim';
export function officeLoadFor(world:World,building:Building):number{
 const company=companyById(world,building.companyId);
 return company?officeLoad(world,company):0;
}
