/* eslint-disable new-cap */
/* eslint-disable no-new-require */
const config = require('../conf')
const mysql = new require('mysql')
const client = mysql.createPool(config.mysql)
// TO DO only for develop computer
// const client = mysql.createPool({
//   host: 'localhost',
//   port: '3306',
//   user: 'root',
//   password: 'root',
//   database: 'cargo'
// })
const htmlspecialchars = {
  encode: (string) => {
    const mapChars = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '–': '&ndash;',
      '—': '&mdash;',
      "'": '&#39;'
    }
    const repl = (c) => { return mapChars[c] }
    return string ? string.toString().replace(/[&<>"–'—]/gim, repl) : string
  }
}

function setCHARACTER () {
  client.getConnection(async (_err, connector) => {
    try {
      await connector.query('SET NAMES utf8')
      await connector.query("SET CHARACTER SET 'utf8'")
      await connector.query("SET SESSION collation_connection = 'utf8_general_ci'")
      connector.release()
    } catch (err) {
      throw new Error(err)
    }
  })
}

// setCHARACTER() // Первый запрос на изменение кодировки

// Функция для любого запроса к БД
exports.getQuery = (sql, callback) => {
  setCHARACTER()
  // Промис запроса
  return new Promise((resolve, reject) => {
    client.getConnection((_err, connector) => {
      connector.query(sql, (error, result) => {
        connector.release()

        if (error) {
          return reject(new Error(error))
        }

        if (typeof callback === 'function') {
          const resFunc = callback()
          return resolve(result, resFunc)
        } else {
          return resolve(result)
        }
      })
    })
  })
}

// Функция для любого СОДЕРЖАЩИЙ ЗАПРОС ПО ОДНОМУ ПОЛЮ запроса к БД, которые идут от юзера (безопасный запрос, не требует доп защит)
exports.getQuerySafe = (table, field, query, pattern = 'like', sorted = ' ORDER BY id DESC') => {
  setCHARACTER()

  let sql = 'SELECT id, ?? FROM ?? WHERE ?? like ?'
  let inserts = [field, table, field, '%' + query + '%']

  if (pattern === 'equality') {
    sql = 'SELECT * FROM ?? WHERE ?? = ?'
    inserts = [table, field, query]
  } else if (pattern === 'likeAllFields') {
    sql = 'SELECT * FROM ?? WHERE ?? like ?'
    inserts = [table, field, '%' + query + '%']
  } else if (pattern === 'deleteProd') {
    sql = 'DELETE FROM ?? WHERE ?? = ?'
    inserts = [table, field, query]
  }

  sql = sql + sorted
  // Промис запроса
  return new Promise((resolve, reject) => {
    client.getConnection((_err, connector) => {
      sql = connector.format(sql, inserts)

      connector.query(sql, (error, result) => {
        connector.release()

        if (error) {
          return reject(new Error(error))
        }

        return resolve(result)
      })
    })
  })
}
// Функция для любого многополевого запроса к БД, которые идут от юзера (безопасный запрос, не требует доп защит)
exports.getQueryManySafe = (table, obj, callback) => {
  setCHARACTER()

  return new Promise((resolve, reject) => {
    const excludeId = Object.prototype.hasOwnProperty.call(obj, 'excludeId') && obj.excludeId === false
    let dataWrite = ''
    let like = ''

    /* Если мы хотим чтобы последнее условие было как 'like %search%', то первый аргумент должен быть обязательно массивом */
    /* Где второй элемент должен быть парметром для этого LIKE */
    if (Array.isArray(table)) {
      like = table[1]
      table = table[0]
    }

    clearBad(obj, table, excludeId).then((saveObject) => {
      const fields = Object.keys(obj)
      let i = 0
      for (const prop in saveObject) {
        if ({}.hasOwnProperty.call(saveObject, prop)) {
          // если пусто то не продолжаем дальше итерацию
          if (saveObject[prop] === undefined || saveObject[prop] === 'NULL') {
            i++
          } else {
            if (like === 'latestLike' && i === fields.length - 1) {
              dataWrite += '`' + fields[i] + '` like "%' + saveObject[prop] + '%"'
            } else {
              dataWrite += '`' + fields[i] + '` = "' + saveObject[prop]
              dataWrite += '" AND '
            }
            i++
          }
        }
      }
    })
      .then(() => {
        dataWrite = dataWrite.replace(/(')/gm, '')
        dataWrite = dataWrite.replace(/"on"/gm, '1')

        if (like !== 'latestLike') {
        /* Обрезка хвостика ('" AND ') */
          dataWrite = dataWrite.substring(0, dataWrite.length - 5)
        }
      })
      .then(() => {
        const sql = 'SELECT * FROM ' + table + ' WHERE ' + dataWrite

        client.getConnection((_err, connector) => {
        // запрос
          connector.query(sql, (error, result) => {
            if (error) {
              connector.release() // Закрываем соединение
              return reject(new Error(error))
            }

            connector.release() // Закрываем соединение

            if (typeof callback === 'function') {
              callback()
              return resolve(result)
            } else {
              return resolve(result)
            }
          })
        })
      })
  })
}
/* Функция для обновления записи данных в БД */
exports.updateData = (table, obj, id, callback) => {
  setCHARACTER()

  return new Promise((resolve, reject) => {
    let fields = []
    let dataWrite = ''
    let sql = ''

    clearBad(obj, table).then((saveObject) => {
      fields = Object.keys(saveObject)
      let i = 0
      for (const prop in saveObject) {
        if ({}.hasOwnProperty.call(saveObject, prop)) {
          dataWrite += '`' + fields[i] + '` = "' + saveObject[prop]
          dataWrite += '", '
          i++
        }
      }
    })
      .then(() => {
        dataWrite = dataWrite.replace(/"on"/gm, '1')
        dataWrite = dataWrite.replace(/(')/gm, '')
        dataWrite = clearDigitsFields(dataWrite)
      })
      .then(() => {
        sql = 'UPDATE `' + table + '` SET ' + dataWrite + ' WHERE id=' + parseInt(id, 10) + ';'
        sql = sql.replace(/("NULL")/, 'NULL') // Если мы специально хотим записать NULL в ячейку.

        client.getConnection((_err, connector) => {
        // запрос
          connector.query(sql, (error, result) => {
            if (error) {
              connector.release() // Закрываем соединение
              return reject(new Error(error))
            }

            connector.release() // Закрываем соединение

            if (typeof callback === 'function') {
              callback()
              return resolve(result)
            } else {
              return resolve(result)
            }
          })
        })
      })
  })
}

/* Функция для записи данных в БД */
exports.setData = (table, obj, callback) => {
  setCHARACTER()

  return new Promise((resolve, reject) => {
    let fields = []
    let dataWrite = ''

    clearBad(obj, table).then((saveObject) => {
      fields = Object.keys(saveObject)
      for (const prop in saveObject) {
        if ({}.hasOwnProperty.call(saveObject, prop)) {
          dataWrite += '"' + saveObject[prop]
          dataWrite += '", '
        }
      }
    })
      .then(() => {
        dataWrite = dataWrite.replace(/(on)/gm, '1')
        dataWrite = dataWrite.replace(/(')/gm, '')
        dataWrite = clearDigitsFields(dataWrite)
      })
      .then(() => {
        const sql = 'INSERT INTO `' + table + '` (' + fields + ', date) VALUES (' + dataWrite + ', NOW());'

        client.getConnection((err, connector) => {
          if (err) {
            return reject(new Error(err))
          }
          // запрос
          connector.query(sql, (error, result) => {
            if (error) {
              connector.release() // Закрываем соединение
              return reject(new Error(error))
            }

            connector.release() // Закрываем соединение

            if (typeof callback === 'function') {
              callback()
              return resolve(result)
            } else {
              return resolve(result)
            }
          })
        })
      })
      .catch((err) => { throw new Error('Look it Error: ' + err) })
  })
}

async function clearBadFields (obj, table, excludeId = false) {
  const resObj = {}
  const sql = `SHOW COLUMNS FROM ${table}`

  if ({}.hasOwnProperty.call(obj, 'excludeId')) {
    delete obj.excludeId
  }
  // eslint-disable-next-line no-undef
  const columns = await new Promise((resolve, reject) => {
    client.getConnection((_err, connector) => {
      connector.query(sql, (error, result) => {
        connector.release()
        if (error) {
          return reject(new Error(error))
        }
        return resolve(result)
      })
    })
  })

  columns.forEach((column) => {
    if ((column.Extra !== 'auto_increment' || excludeId) && Object.prototype.hasOwnProperty.call(obj, column.Field)) {
      resObj[column.Field] = obj[column.Field]
    }
  })
  return resObj
}

async function clearBad (obj, table, excludeId) {
  obj = await clearBadFields(obj, table, excludeId)
  for (const prop in obj) {
    if ({}.hasOwnProperty.call(obj, prop)) {
      obj[prop] = await client.escape(htmlspecialchars.encode(obj[prop]))
    }
  }
  return obj
}
// Очистка от кавычек в цифровых полях
function clearDigitsFields (str) {
  if (str.search(/(,\s{1})/) > -1) {
    str = str.split(', ')
  } else if (str.search(/(\.\s{1})/) > -1) {
    str = str.split('. ')
  } else {
    return new Error('Invalid string separator.')
  }

  str = str.filter((item) => {
    return item.search(/"{1}\d+"{1}/) > -1 ? toNumber(item) : item
  })

  return str.join(',')
}

function toNumber (val) {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}
