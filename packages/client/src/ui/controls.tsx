import {forwardRef,type ButtonHTMLAttributes,type InputHTMLAttributes,type SelectHTMLAttributes} from 'react';
import {ActionButton} from './primitives';

/** Existing semantic class names select a variant; event handlers and native form behavior stay intact. */
export const Button=forwardRef<HTMLButtonElement,ButtonHTMLAttributes<HTMLButtonElement>>(function Button({className='',type,children,...props},ref){
 const kind=/(^|\s)(danger|btn-danger)(\s|$)/.test(className)?'danger':/(^|\s)(primary|btn-primary)(\s|$)/.test(className)?'primary':/(link|icon-btn|panel-close|detail-launch|tab|chip)/.test(className)?'quiet':'secondary';
 return <ActionButton {...props} ref={ref} type={type} kind={kind} className={`gu-runtime-button ${className}`}>{children}</ActionButton>;
});
export const Input=forwardRef<HTMLInputElement,InputHTMLAttributes<HTMLInputElement>>(function Input({className='',type,...props},ref){return <input {...props} ref={ref} type={type} className={`${type==='hidden'?'':type==='range'?'gu-range-control':type==='checkbox'||type==='radio'?'gu-check-control':'gu-input-control'} ${className}`}/>;});
export const Select=forwardRef<HTMLSelectElement,SelectHTMLAttributes<HTMLSelectElement>>(function Select({className='',children,...props},ref){return <select {...props} ref={ref} className={`gu-select-control ${className}`}>{children}</select>;});
