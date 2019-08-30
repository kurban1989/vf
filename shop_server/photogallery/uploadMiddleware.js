// uploadMiddleware.js
const config = require('../conf');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.templateImg)
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});

const upload = multer({
    limits: {
      fileSize: 20 * 1024 * 1024,
    },
    fileFilter: function (req, file, cb) {
        sanitizeFile(file, cb);
    },
    storage
});

function sanitizeFile(file, cb) {
    // Define the allowed extension
    let fileExts = ['png', 'jpg', 'jpeg', 'gif']
    // Check allowed extensions
    let isAllowedExt = fileExts.includes(file.originalname.split('.')[1].toLowerCase());
    // Mime type must be an image
    let isAllowedMimeType = file.mimetype.startsWith("image/")
    if(isAllowedExt && isAllowedMimeType){
        return cb(null ,true) // no errors
    }
    else{
        // pass error msg to callback, which can be displaye in frontend
        cb('Error: File type not allowed!')
    }
};

module.exports = upload