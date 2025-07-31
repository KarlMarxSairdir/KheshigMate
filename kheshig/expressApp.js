// expressApp.js
// Temel Express.js sunucusu

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.EXPRESS_PORT || 4000;

// Statik dosyaları sunmak için public klasörünü kullan
app.use(express.static(path.join(__dirname, 'public')));

// Basit bir API endpoint örneği

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Merhaba, Express sunucusu çalışıyor!' });
});

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
});
