/*const config = require('./conf');
module.paths.push(config.pathToServer); // Добавим в глобал пафф, корневой каталог
const db = require("mysql_models");
const fs = require('fs'); // Модуль для чтения файлов
let arrRegion = fs.readFileSync(config.dirnameNew + '/city_rus.txt', 'utf8');

arrRegion = arrRegion.split('\n');

arrRegion.forEach(async function(item) {
    let test = await db.setData('cities', {region: 'Ямало-Ненецкий АО область', city: item})
    console.log(test)
});*/
// const https = require('https');
// const options = {
//   hostname: 'integration.cdek.ru',
//   port: 443,
//   path:'/v1/location/cities/json?size=5&page=0&cityName=' + encodeURIComponent('Тольятти'),
//   method: 'GET'
// }
// const req = https.request(options, (res) => {

//   if (res.statusCode != 200) {
//     //response.status(res.statusCode).send('<b>Удалённый сервер не ответил правильно. Статус ответа: <i>' + res.statusCode + '</i></b>');
//     console.error('Статус ответа: <i>' + res.statusCode);
//   }

//   res.on('data', (d) => {
//     process.stdout.write(d);
//   })
// })
// req.on('error', (error) => {
//   console.error(error);
// })
// req.end();