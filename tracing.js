const { initTracer } = require('jaeger-client');

function initJaegerTracer(serviceName) {
  const config = {
    serviceName,
    sampler: {
      type: 'const',
      param: 1,
    },
    reporter: {
      logSpans: true,
    },
  };
  const options = {
    logger: {
      info: function logInfo(msg) {
        console.log('INFO ', msg);
      },
      error: function logError(msg) {
        console.log('ERROR', msg);
      },
    },
  };
  return initTracer(config, options);
}

module.exports = { initJaegerTracer };
