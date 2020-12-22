
const Koa = require('koa');
const Router = require('koa-router');
const IPFS = require('ipfs');

const Database = require('./js/modules/db.js');
const Syncro = require('./js/modules/syncro.js');
const Common = require('./js/modules/common.js');

const db = Database('node1');
const app = new Koa();
const router = new Router();
const ipfs = IPFS.create();

Common.startApp(1337, app, router, db, ipfs);
