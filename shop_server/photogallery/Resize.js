const sharp = require('sharp');
const uuidv4 = require('uuid/v4');
const path = require('path');
const { spawn } = require('child_process');
const gifsicle = require('gifsicle');
const fs = require('fs');
const buf = Buffer.alloc(256);

class Resize {
  constructor(folder) {
    this.folder = folder;
  }
  save(buffer) {
    const image = sharp(buffer);
    const self = this;
    let filename = '';
    let filepath = '';

    return new Promise(function(resolve, reject){
      image.metadata()
        .then(function({height, width, format}) {
              // let ratio_orig = width/height;
              let fitAction = sharp.fit.cover;
              height = 815;
              width = 610;

              // if (width/height > ratio_orig && width < height) {
                // height = Math.floor(height*ratio_orig); /*console.log('ratio_orig less');*/
              // } else {
                // width = Math.floor(width/ratio_orig); /*console.log('ratio_orig more');*/
                // fitAction = sharp.fit.cover;
              // }

              return {
                format,
                width,
                height,
                fitAction
              }

        }).then(async function(args) {
          filename = Resize.filename(args.format);
          filepath = self.filepath(filename);

          if(args.format !== 'gif') {

            await sharp(buffer)
              .resize(args.width, args.height, {
                fit: args.fitAction,
                withoutEnlargement: false
              })
              .toFile(filepath);

          } else {

              const stream = spawn(gifsicle, ['--resize', '-o', `${args.width}x${args.height}`, buffer])

              stream.on('close', () => {
                /*console.log('image resized!');*/
              });

              stream.stdout.pipe(fs.createWriteStream(filepath))

          }

        }).then(function(args) {
          setTimeout(function() {
            fs.unlink(buffer);
            return resolve(filename);
          }, 105);
        });
    });
  }

  static filename(format) {
    return `${uuidv4()}.${format}`;
  }

  filepath(filename) {
    return path.resolve(`${this.folder}/${filename}`)
  }
}

module.exports = Resize;