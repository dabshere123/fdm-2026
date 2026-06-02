const fs=require('fs');
const babel=require('@babel/core');
const OUT='public/Public/public/Public';
fs.mkdirSync(OUT,{recursive:true});
function build(src,out,comp,title){
  if(!fs.existsSync(src)){console.log('Skip:',src);return;}
  let c=fs.readFileSync(src,'utf8')
    .replace(/^import\s+.*?;\n/gm,'')
    .replace(/^export\s+default\s+/gm,'')
    .replace(/^export\s+/gm,'');
  c='const {useState,useEffect,useRef}=React;\n'+c;
  const compiled=babel.transformSync(c,{presets:['@babel/preset-react','@babel/preset-env'],filename:src}).code;
  const html=`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1.0"/>\n<title>${title}</title>\n<meta name="apple-mobile-web-app-capable" content="yes"/>\n<meta name="theme-color" content="#0d0d0d"/>\n<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>\n<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#0d0d0d;}</style>\n</head>\n<body>\n<div id="root"></div>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>\n<script>\n${compiled}\nconst root=ReactDOM.createRoot(document.getElementById('root'));\nroot.render(React.createElement(${comp},{onBack:()=>window.location.href='/'}));\n</script>\n</body>\n</html>`;
  fs.writeFileSync(`${OUT}/${out}`,html);
  console.log('Built',out,Math.round(html.length/1024)+'kb');
}
build('fdm-hub-preview-7.jsx','hub.html','HubApp','FDM Operations Hub');
build('fdm-field-preview-5.jsx','field.html','FieldApp','FDM Worker App');
build('src/equipment.jsx','equipment-tracker.html','EquipmentTracker','FDM Equipment Tracker');
console.log('Done!');
