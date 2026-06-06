const fs   = require('fs');
const babel = require('@babel/core');
const OUT  = 'public/Public/public/Public';
fs.mkdirSync(OUT, {recursive:true});

function build(src, out, comp, title){
  if(!fs.existsSync(src)){ console.log('Skip:', src); return; }

  let c = fs.readFileSync(src, 'utf8')
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\n/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '');

  // Replace all top-level const/let with var (prevents JSX parser confusion)
  c = c.replace(/^const /gm, 'var ').replace(/^let /gm, 'var ');

  // Inject React hooks
  c = 'var useState=React.useState,useEffect=React.useEffect,useRef=React.useRef,useCallback=React.useCallback,useMemo=React.useMemo;\n' + c;

  let compiled;
  try {
    compiled = babel.transformSync(c, {
      presets : [
        ['@babel/preset-react', {runtime:'classic'}],
        ['@babel/preset-env',   {targets:{chrome:'80'}, modules:false}],
      ],
      plugins : [
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator',
      ],
      filename : src,
    }).code;
  } catch(e){
    console.error('Build error in', src + ':');
    console.error(e.message.split('\n').slice(0,6).join('\n'));
    process.exit(1);
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
<title>${title}</title>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="theme-color" content="#0d0d0d"/>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#0d0d0d;}</style>
</head><body>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script>
${compiled}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${comp},{onBack:function(){window.location.href='/'}}));
</script>
</body></html>`;

  fs.writeFileSync(`${OUT}/${out}`, html);
  console.log('Built', out, Math.round(html.length/1024)+'kb');
}

build('fdm-hub-preview.jsx',   'hub.html',   'HubApp',   'FDM Operations Hub');
build('fdm-field-preview.jsx', 'field.html', 'FieldApp', 'FDM Worker App');
build('fdm-equipment-tracker.jsx', 'equipment.html', 'EquipmentTracker', 'FDM Equipment Tracker');
console.log('Done!');
