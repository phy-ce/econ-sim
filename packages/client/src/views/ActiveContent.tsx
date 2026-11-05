import {createContext,useContext,useCallback,useRef,useState,type ReactNode} from 'react';

const VisibleDetail=createContext<null|(()=>()=>void)>(null);
export function useVisibleDetail(){return useContext(VisibleDetail);}

/** Mount on first use, then keep local navigation and scroll while hidden. */
export function ActiveContent({active,children,suspended=false}:{active:boolean;children:ReactNode;suspended?:boolean}){
 const parent=useVisibleDetail(),[details,setDetails]=useState(0);
 const acquire=useCallback(()=>{setDetails(n=>n+1);const releaseParent=parent?.();return()=>{setDetails(n=>n-1);releaseParent?.();};},[parent]);
 const live=active||details>0,previouslyLive=useRef(false),retained=useRef<ReactNode>(null);
 // One transition render reaches effects (e.g. closing the budget detail).
 // A detached visible detail keeps its ancestors current even if its source is hidden.
 if((live||previouslyLive.current)&&(!suspended||live!==previouslyLive.current||retained.current===null))retained.current=children;
 previouslyLive.current=live;
 return <VisibleDetail.Provider value={acquire}>{retained.current}</VisibleDetail.Provider>;
}
