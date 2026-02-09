
import React from 'react';

const Header = () => {
  return (
    <header className="h-20 bg-[#121212] border-b border-[#2a2a2a] flex items-center px-6 justify-between shrink-0">
      <div className="flex items-center gap-6">
        <img src="https://kidscorp.digital/wp-content/uploads/2025/02/LogoKC.png" alt="KidsCorp" className="h-10 w-auto object-contain" />
        <div className="h-8 w-[1px] bg-[#333]"></div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">AdPreview <span className="text-[#9500cb]">Pro</span></h1>
          <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Rich Media Validator</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] rounded-full border border-[#333]">
          <div className="w-2 h-2 rounded-full bg-[#9500cb] animate-pulse" />
          <span className="text-xs text-gray-300 font-medium">Mobile Environment</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
