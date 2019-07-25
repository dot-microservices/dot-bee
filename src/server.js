'use strict';

const Base = require('./base');
const is = require('is_js');
const Queue = require('bee-queue');

class Server extends Base {
    /**
     *Creates an instance of Server.
     * @param {Object} [options] options
     * @memberof Server
     */
    constructor(options) {
        super(options);
    }

    /**
     * @description adds list of services and automatically creates their queues and consumers
     * @param {Array<Function>} services list of service classes
     * @param {Number} [concurrency=1] flag for consuming queue in parallel
     * @param {Object} [options={}] options for creating a new queue
     * @see https://github.com/bee-queue/bee-queue#settings
     * @throws Error
     * @memberof Server
     */
    addServices(services, concurrency = 1, options) {
        if (is.not.array(services)) throw new Error('invalid services');

        for (let service of services)
            this.addService(service, concurrency, options);
    }


    /**
     * @description adds a new service and automatically creates related queue and its consumer
     * @param {Function} service service class
     * @param {Number} [concurrency=1] flag for consuming queue in parallel
     * @param {Object} [options={}] options for creating a new queue
     * @see https://github.com/bee-queue/bee-queue#settings
     * @throws Error
     * @memberof Server
     */
    addService(service, concurrency = 1, options) {
        if (is.object(concurrency)) {
            options = concurrency;
            concurrency = 1;
        }
        if (is.not.object(options)) options = this._options.bee;
        if (is.not.function(service)) throw new Error('service must be a class');
        if (is.not.number(concurrency)) throw new Error('invalid concurrency');
        if (is.not.object(options)) throw new Error('invalid options');

        const name = this._unCamelCase(this._name(service));
        if (is.not.existy(this._services[name])) {
            this._services[name] = new Queue(name, options);
            this._services[name].ready(() => {
                this._logger.info(`${ name }|ready`);
                this._services[name].process(concurrency, async job => {
                    if (is.not.object(job.data) || is.not.string(job.data._)) throw new Error('invalid request');
                    else if (job.data._.startsWith('_') || is.not.function(service[job.data._]))
                        throw new Error('invalid method');
                    else if (service[job.data._].constructor.name !== 'AsyncFunction')
                        throw new Error('method must be an async function');

                    return service[job.data._](job);
                });
                if (this._logger.isLevelEnabled('warn')) {
                    this._services[name].on('error', e => this._logger.warn(`${ name }|E|${ e.message }`));
                    this._services[name].on('failed', (j, e) => this._logger.warn(`${ name }|F|${ j.id }|${ e.message }`));
                    this._services[name].on('stalled', (j) => this._logger.warn(`${ name }|S|${ j }`));
                }
                if (this._logger.isLevelEnabled('info')) {
                    this._services[name].on('retrying', (j, e) => this._logger.info(`${ name }|R|${ j.id }|${ e.message }`));
                    this._services[name].on('job progress', (j, p) => this._logger.info(`${ name }|P|${ j }|${ p }%`));
                    this._services[name].on('succeeded',
                        (j, r) => this._logger.info(`${ name }|OK|${ j.id }|${ JSON.stringify(r) }`));
                }
            });
        }
    }

    /**
     * @description stops all existing queues for a clean shutdown
     * @returns Promise
     * @memberof Server
     */
    async close() {
        for (let name in this._services) await this._services[name].close();
    }

    /**
     * @description removes everything about existing queues from redis
     * @returns Promise
     * @memberof Server
     */
    async destroy() {
        for (let name in this._services) await this._services[name].destroy();
    }
}

module.exports = Server;
