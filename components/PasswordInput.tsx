'use client';
import {InputHTMLAttributes, useState} from 'react';
import {EyeIcon, EyeSlashIcon} from '@heroicons/react/24/outline';

export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false);
  return <div style={{position: 'relative'}}>
    <input {...props} type={show ? 'text' : 'password'} className="input" style={{width: '100%', paddingRight: 40}}/>
    <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan password' : 'Lihat password'} title={show ? 'Sembunyikan password' : 'Lihat password'}
      style={{position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: 'var(--muted)', padding: 4, display: 'grid'}}>
      {show ? <EyeSlashIcon width={18}/> : <EyeIcon width={18}/>}
    </button>
  </div>;
}
