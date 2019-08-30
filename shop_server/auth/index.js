const https = require('https');

exports.setUser = function(jsonString) {
  jsonStr = JSON.parse(jsonString);

  let fields = 'sex,city,email';

  const options = {
    hostname: 'api.vk.com',
    port: 443,
    path: `/method/users.get?user_ids=${jsonStr.user_id}&fields=${fields}&access_token=${jsonStr.access_token}&v=5.95`,
    method: 'GET'
  }

  return new Promise(function(resolve, reject){

    const req = https.request(options, (res) => {

      res.on('data', async (d) => {
        // process.stdout.write('std: '+d);
        return resolve(d);
      });
    });
    req.on('error', (error) => {
      return reject(error);
    });
    req.end();

  });
}
