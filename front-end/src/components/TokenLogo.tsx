'use client';

import React from 'react';

interface TokenLogoProps {
  symbol: string;
  size?: number;
  className?: string;
}

const TokenLogo: React.FC<TokenLogoProps> = ({ symbol, size = 32, className = '' }) => {
  const logoStyle = {
    width: size,
    height: size,
  };

  switch (symbol.toUpperCase()) {
    case 'USDC':
      return (
        <svg style={logoStyle} className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#2775CA"/>
          <circle cx="16" cy="16" r="12" fill="white"/>
          <circle cx="16" cy="16" r="8" fill="#2775CA"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
          <path d="M14.5 12h3v1.5h-1v5h1v1.5h-3v-1.5h1v-5h-1V12z" fill="#2775CA"/>
          <rect x="12" y="14.5" width="8" height="1" fill="#2775CA"/>
          <rect x="12" y="16.5" width="8" height="1" fill="#2775CA"/>
        </svg>
      );

    case 'WBTC':
      return (
        <svg style={logoStyle} className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#F7931A"/>
          <path d="M20.1 14.7c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.1-1.1-.2v0l-2.3-.6-.4 1.9s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 .1.1.1.1.1h-.1l-1.1 4.4c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.9 2 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.8c.5.1 1 .2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.1.7-1.9-.0-3.0-1.4-3.7 1.0-.2 1.8-1.0 2.0-2.5zm-3.6 5.0c-.5 2.1-4.1.9-5.3.7l.9-3.8c1.2.3 4.9.9 4.4 3.1zm.5-5.0c-.5 1.9-3.5.9-4.5.7l.8-3.4c1.0.2 4.1.7 3.7 2.7z" fill="white"/>
        </svg>
      );

    case 'WETH':
      return (
        <svg style={logoStyle} className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#627EEA"/>
          <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="white" fillOpacity="0.602"/>
          <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="white"/>
          <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="white" fillOpacity="0.602"/>
          <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.379z" fill="white"/>
          <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="white" fillOpacity="0.2"/>
          <path d="M9 16.22l7.498 4.353v-7.701L9 16.22z" fill="white" fillOpacity="0.602"/>
        </svg>
      );

    case 'LINK':
      return (
        <svg style={logoStyle} className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2.5L8.5 7v10l7.5 4.5L23.5 17V7L16 2.5z" fill="#375BD2"/>
          <path d="M16 7L11 9.5v7l5 3 5-3v-7L16 7z" fill="white"/>
          <path d="M16 10.5L13 12v4l3 1.8 3-1.8v-4l-3-1.5z" fill="#375BD2"/>
        </svg>
      );

    case 'DAI':
      return (
        <svg style={logoStyle} className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#F5AC37"/>
          <path d="M10 9h12c2.8 0 5 2.2 5 5s-2.2 5-5 5H10V9z" fill="white"/>
          <path d="M10 9h10c2.2 0 4 1.8 4 4s-1.8 4-4 4H10V9z" fill="#F5AC37"/>
          <rect x="7" y="13.5" width="18" height="1" fill="white"/>
          <rect x="7" y="16.5" width="18" height="1" fill="white"/>
        </svg>
      );

    default:
      // 默认图标 - 显示首字母
      return (
        <div 
          style={logoStyle} 
          className={`${className} bg-gray-500 rounded-full flex items-center justify-center text-white font-bold`}
        >
          <span style={{ fontSize: size * 0.4 }}>{symbol.charAt(0)}</span>
        </div>
      );
  }
};

export default TokenLogo;