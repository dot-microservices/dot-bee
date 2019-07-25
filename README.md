# dot-bee

a bee-queue based minimalist toolkit for building fast, decentralized, scalable and fault tolerant microservices

## Motivation

major difference from other [dot-rest](https://github.com/Dvs-Bilisim/dot-rest) or
[dot-ws](https://github.com/Dvs-Bilisim/dot-ws) projects is that
it works on top of a redis-based solid message queue called [bee-queue](https://github.com/bee-queue/bee-queue).
because of that, [clerq](https://github.com/Dvs-Bilisim/clerq) based service discovery is out of the architecture.

on the other hand, original [dot](https://github.com/Dvs-Bilisim/dot) has auto service discovery feature and
because of its dependencies, it has completely different use cases.

## Install

```bash
npm i --save dot-bee
```

You can also clone this repository and make use of it yourself.

```bash
git clone https://github.com/Dvs-Bilisim/dot-bee.git
cd dot-bee
npm i
npm test
```

Before running tests, please make sure that you have Redis available on localhost.
If you don't know how to do that temporarily, please use following command to run it via docker.

```bash
docker run -p 6379:6379 --name dot_redis redis:4-alpine
```

## Configuration

- **bee:** options for initializing a bee queue instance.
please see more details at [Bee Queue Settings](https://github.com/bee-queue/bee-queue#settings).
- **job:** options for creating a bee queue job.
only setId, retries, backoff, delayUntil and timeout methods allowed.
please see more details at [Bee Queue Job Settings](https://github.com/bee-queue/bee-queue#methods-1).
- **pino:** options for pino logger. it's { "level": "error" } by default.

## Server Methods

- **.addServices(services, concurrency = 1, [options]):**
adds list of services and automatically creates their queues and consumers
- **.addService(service, concurrency = 1, [options]):**
adds a new service and automatically creates related queue and its consumer
- **.close():**
stops all existing queues for a clean shutdown
- **.destroy():**
removes everything about existing queues from redis

## Client Methods

- **.acceptServices(services, [options]):** accepts existing services to send jobs
- **.acceptService(service, [options]):** accepts an existing service to send jobs
- **.forward(service, method, data, [options]):** sends a new job to an existing service
- **.send(service, method, data, [options]):** sends a new job to an existing service and retrieves its response
- **.close():** stops all existing queues for a clean shutdown

## Examples

```js
const { Client, Server } = require('dot-bee');

class Service {
    static _name() {
        return 'myService';
    }

    static async echo(job) {
        return job.data;
    }
}

const client = new Client();
const server = new Server();
server.addServices([ Service ]);
client.acceptServices([ 'myService' ]);

const r = await client.send('test', 'echo', { t: Date.now() });
console.log(r);

await client.close();
await server.destroy();
await server.close();
```

## Optional Job Configuration

please see more details at [Bee Queue Job Settings](https://github.com/bee-queue/bee-queue#methods-1).

```js
await client.send('test', 'echo', { t: Date.now() }, {
    setId: 'my-custom-job-id',
    retries: 2,
    backoff: [ 'fixed', 1000 ],
    delayUntil: Date.parse('2082-08-23T00:00:01.000Z'),
    timeout: 10000
});
```
