const config = require('../conf')
// const handleError = (err, res) => {
//   res
//     .status(500)
//     .contentType('text/plain')
//     .end('Oops! Something went wrong!')
// }

const path = require('path')
const express = require('express')

const router = express.Router()
const upload = require('./uploadMiddleware')
const Resize = require('./Resize')

router.get('/', async function (req, res) {
  await res.render('index')
})

router.post('/', upload.single('file'), async (req, res) => {
  const imagePath = config.img + '/jpg/public'
  const fileUpload = new Resize(imagePath)

  if (!req.file) {
    res.status(401).json({error: 'Please provide an image'})
  }
  const filename = await fileUpload.save(req.file.path || req.file.buffer)

  return res.status(200).json({ name: '/img/jpg/public/' + filename })
})

module.exports = router
