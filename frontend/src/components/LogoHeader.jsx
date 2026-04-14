import React from 'react';

export default function LogoHeader({ subtitle }) {
  return (
    <div className="flex flex-col items-center mb-6">
      <img src="/logo.svg" alt="Jenan BIZ" className="h-24 w-auto mb-2 object-contain" />
      {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
    </div>
  );
}
