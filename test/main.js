const rp = require('request-promise');
const expect = require('chai').expect;

describe('GET /', () => {
  it('should respond with 200', (done) => {
    rp({
      method: 'GET',
      uri: 'http://localhost:3001',
      resolveWithFullResponse: true 
    })
      .then((response) => {
        expect(response.statusCode).to.equal(200);
	done();
      });
  });
});

