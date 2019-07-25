'use strict';

const { Client, Server } = require('../');

class Service {
    static _name() {
        return 'test';
    }

    static async test(job) {
        return job.data;
    }

    static async throws(job) {
        throw new Error(`Job ID#: ${ job.id }`);
    }

    static async delay(job) {
        return new Promise(resolve => {
            setTimeout(() => resolve(job.data), 200);
        });
    }

    static async conditionalSuccess(job) {
        if (job.options.retries) throw new Error('custom error');

        return job.data;
    }
}

const prefix = `dot_bee_test_${ Math.floor(Math.random() * 100000) }`;

const client = new Client({ bee: { prefix }, level: 'debug' });
const server = new Server({ bee: { prefix }, level: 'debug' });

beforeAll(async done => {
    server.addServices([ Service ]);
    client.acceptServices([ 'test' ]);
    setTimeout(() => done(), 750);
});
afterAll(async done => {
    await client.close();
    await server.destroy();
    await server.close();
    setTimeout(() => done(), 750);
});

const payload = { t: Date.now() };

test('echo', async done => {
    const r = await client.send('test', 'test', payload);
    expect(r.t).toEqual(payload.t);
    done();
});

test('throw', async done => {
    await expect(client.send('test', 'throws', payload)).rejects.toThrow();
    done();
});

test('conditional success', async done => {
    const r = await client.send('test', 'conditionalSuccess', payload);
    expect(r.t).toEqual(payload.t);
    done();
});

test('delay', async done => {
    await expect(client.send('test', 'delay', payload, { timeout: 100, retries: 2 })).rejects.toThrow();
    done();
});

test('speed', async done => {
    payload.t = Date.now();
    for (let i = 1 ; i < 1000 ; i++) await client.send('test', 'test', payload);
    expect(Date.now() - payload.t).toBeLessThan(1000);
    done();
});
