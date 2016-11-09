const request = require('supertest');
const server = require('../index');

const agent = request.agent(server);

describe('GET /', () => {
  it('should respond with 200', (done) => {
    agent
      .get('/')
      .expect(200, done);
  });
});

