const readlineSync = require('readline-sync');
const enquire = (enquiry) => {
  return readlineSync.question(enquiry);
};

module.exports = {enquire};
