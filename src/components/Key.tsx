import React from 'react';

export const Key = ({ children }: { children?: React.ReactNode }) => (
  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 leading-none text-main bg-transparent border border-gray-300 rounded shadow-sm select-none pt-px mx-0.5 whitespace-nowrap">
    {children}
  </span>
);