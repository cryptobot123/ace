let config =  require('../config/default.json');

let settings = {}

settings.VOUCHERS_FILENAME = process.env.VOUCHERS_FILENAME || config.vouchers.filename

module.exports = settings
