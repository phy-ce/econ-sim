import type {ComponentProps} from 'react';
import {Notifications} from './Notifications';
export function NewsWindow(props:ComponentProps<typeof Notifications>){
 return <div className="news-window"><Notifications {...props}/></div>;
}
