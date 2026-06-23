import React from 'react';

const AnnouncementBanner = ({ config }) => {
  if (!config?.design?.announcement_text) return null;

  const bgColor = config.design.announcement_color || '#f59e0b';
  
  const getContrastYIQ = (hexcolor) => {
    if (!hexcolor) return 'text-gray-900';
    let hex = hexcolor.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    if (hex.length !== 6) return 'text-gray-900';
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#111827' : '#ffffff';
  };

  const textColor = getContrastYIQ(bgColor);

  return (
    <div
      className="py-2 px-4 overflow-hidden relative text-sm font-medium transition-all duration-300"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div
        className="marquee whitespace-nowrap"
        style={{
          display: 'inline-block',
          minWidth: '100%',
          animation: 'marquee-scroll 18s linear infinite',
        }}
      >
        {config.design.announcement_text}
      </div>
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default AnnouncementBanner;
