const rp = require('request-promise');
const expect = require('chai').expect;
const fs = require('fs');

const uri = 'http://localhost:3001';
let invoices = null;

describe('GET /', () => {
  it('should respond with 200', (done) => {
    rp({
      method: 'GET',
      uri,
      resolveWithFullResponse: true 
    })
      .then((response) => {
        expect(response.statusCode).to.equal(200);
	done();
      });
  });
});

describe('POST /', () => {
  before((done) => {
    fs.readFile('./test/data/invoices_many.json', 'utf8', (err, data) => {
      if (err) throw err;
      invoices = JSON.parse(data);
      done();
    });
  });
  
  it('should process one invoice', (done) => {
    rp({
      method: 'POST',
      uri,
      resolveWithFullResponse: true, 
      json: true,
      body: invoices[0] 
    })
      .then((response) => {
        expect(response.statusCode).to.equal(200);
	expect(response.headers['content-type']).to.equal('application/pdf');
	done();
      })
  }); 
});
