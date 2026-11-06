import {useLayoutEffect,type ReactNode} from 'react';
import {useLang} from '../i18n';
import {GameUIProvider} from './components';

export function RuntimeDesignProvider({children}:{children:ReactNode}){
 const lang=useLang();
 useLayoutEffect(()=>{document.body.classList.add('game-runtime');return()=>document.body.classList.remove('game-runtime');},[]);
 return <GameUIProvider value={lang}>{children}</GameUIProvider>;
}
