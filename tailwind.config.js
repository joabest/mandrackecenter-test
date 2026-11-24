/** @type {import('tailwindcss').Config} */
module.exports={
 content:['./app/**/*.{js,jsx,ts,tsx}','./components/**/*.{js,jsx,ts,tsx}'],
 theme:{extend:{fontFamily:{sans:['Inter','system-ui','sans-serif']},colors:{mandracke:{bg:'#0c0b0f',sidebar:'#101014',surface:'#17151d',panel:'#1e1b26',border:'#302937',purple:'#9b70e1',muted:'#9892a4'}}}},
 plugins:[]
};
