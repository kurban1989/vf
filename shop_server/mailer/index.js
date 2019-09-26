const config = require('../conf');
module.paths.push(config.pathToServer); // Добавим в глобал пафф, корневой каталог
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport(config.nodemailer);

const mailer = message => {
    return new Promise((resolve, reject) => {
        transporter.sendMail(message, (error, info) => {
            error ? reject(error) : resolve(info);
        });
    });
}
// verify connection configuration
const testMailer = () => {
    transporter.verify((error, success) => {
        if (error) {
            console.log(`Error verify \n ${error}`);
        } else {
            console.log("Server is ready to take our messages");
        }
    })
}

module.exports = {mailer, testMailer};
// async..await is not allowed in global scope, must use a wrapper
// async function main() {

//     // Generate test SMTP service account from ethereal.email
//     // Only needed if you don't have a real mail account for testing
//     let testAccount = await nodemailer.createTestAccount();

//     // create reusable transporter object using the default SMTP transport
//     let transporter = nodemailer.createTransport({
//         host: 'smtp.ethereal.email',
//         port: 587,
//         secure: false, // true for 465, false for other ports
//         auth: {
//             user: testAccount.user, // generated ethereal user
//             pass: testAccount.pass // generated ethereal password
//         }
//     });

//     // send mail with defined transport object
//     let info = await transporter.sendMail({
//         from: '"Fred Foo 👻" <foo@example.com>', // sender address
//         to: 'bar@example.com, baz@example.com', // list of receivers
//         subject: 'Hello ✔', // Subject line
//         text: 'Hello world?', // plain text body
//         html: '<b>Hello world?</b>' // html body
//     });

//     console.log('Message sent: %s', info.messageId);
//     // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

//     // Preview only available when sending through an Ethereal account
//     console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
//     // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
// }

// main().catch(console.error);