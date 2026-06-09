// get-weather-alerts.js
// Returns active NWS weather alerts for Dane County
// Hub polls this every 2 minutes

const NWS_ZONE = 'WIZ064';
const NWS_URL  = `https://api.weather.gov/alerts/active?zone=${NWS_ZONE}`;

const ALERT_LEVELS = {
  'Tornado Warning':              { level: 'extreme',  color: '#dc2626', icon: '🌪️' },
  'Tornado Watch':                { level: 'severe',   color: '#ef4444', icon: '🌪️' },
  'Severe Thunderstorm Warning':  { level: 'extreme',  color: '#dc2626', icon: '⛈️' },
  'Severe Thunderstorm Watch':    { level: 'severe',   color: '#f97316', icon: '⛈️' },
  'High Wind Warning':            { level: 'severe',   color: '#f97316', icon: '💨' },
  'High Wind Watch':              { level: 'moderate', color: '#f59e0b', icon: '💨' },
  'Wind Advisory':                { level: 'moderate', color: '#f59e0b', icon: '💨' },
  'Flash Flood Warning':          { level: 'extreme',  color: '#dc2626', icon: '🌊' },
  'Flash Flood Watch':            { level: 'severe',   color: '#f97316', icon: '🌊' },
  'Thunderstorm':                 { level: 'moderate', color: '#f59e0b', icon: '⛈️' },
  'Rain':                         { level: 'minor',    color: '#3b82f6', icon: '🌧️' },
  'Special Weather Statement':    { level: 'moderate', color: '#f59e0b', icon: '⚠️' },
  'Dense Fog Advisory':           { level: 'minor',    color: '#64748b', icon: '🌫️' },
};

exports.handler = async () => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const res = await fetch(NWS_URL, {
      headers: { 'User-Agent': 'FDMOps/1.0 (fdm2026.netlify.app; contact: dabshere@gmail.com)' }
    });
    const data = await res.json();
    const features = data.features || [];

    const alerts = features.map(f => {
      const p = f.properties;
      const event = p.event || '';
      const match = Object.entries(ALERT_LEVELS).find(([k]) => event.toLowerCase().includes(k.toLowerCase()));
      const meta  = match ? match[1] : { level: 'minor', color: '#64748b', icon: '⚠️' };
      return {
        id:        f.id.split('/').pop(),
        event,
        headline:  p.headline  || '',
        severity:  p.severity  || '',
        urgency:   p.urgency   || '',
        effective: p.effective || '',
        expires:   p.expires   || '',
        color:     meta.color,
        icon:      meta.icon,
        level:     meta.level,
      };
    }).sort((a,b) => {
      const order = { extreme:0, severe:1, moderate:2, minor:3 };
      return (order[a.level]||3) - (order[b.level]||3);
    });

    return { statusCode: 200, headers, body: JSON.stringify({ alerts }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ alerts: [], error: err.message }) };
  }
};
