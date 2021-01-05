
const Koa = require('koa');
const Router = require('koa-router');
const Logger = require('koa-logger');
const BodyParser = require('koa-body');
const Static = require('koa-static');
const IPFS = require('ipfs');

var Syncro = import('../main.mjs').then(m => Syncro = m.default);

const toJCS = require('canonicalize');

const server = new Koa();
const router = new Router();

var syncIndex = 0;

async function getCIDs(syncro){
  return syncro.db(table => table.query('select').exec()).then(rows => {
    console.log(rows);
    return rows.map(row => { return { index: row.index, cid: row.cid } });
  });
}

async function createObject(ctx, syncro, ipfs){
  let error;
  let objects = Array.isArray(ctx.request.body) ? ctx.request.body : [ctx.request.body];
  await Promise.all(objects.map(async obj => {
    if (!obj.type || !obj.payload) {
      error = `Missing a type property or payload`;
    }
    else {
      let result;
      try {
        result = await ipfs.add({ content: toJCS(obj), pin: true });
        await syncro.setEntry(result.path);
        console.log(result);
      }
      catch (e) {
        error = e;
      }
    }
  }));

  if (error) {
    console.log(error);
  }
  ctx.response.status = 201;
  ctx.body = `Your object was created!`;
}

async function start(config){
  await Syncro;
  let ipfs = await IPFS.create();
  let syncro = new Syncro({
    // storage: {
    //   tables: [
    //     {
    //       name: 'objects',
    //       model: {
    //         "cid:string": { pk: true, immutable: true, notNull: true },
    //         "type:string": { immutable: true },
    //         "commits:object[]": {
    //             default: [],
    //             model: {
    //               "id:string": { immutable: true, notNull: true }
    //             }
    //         }
    //       }
    //     }
    //   ]
    // }
  })

  router.get('/stack', async (ctx, next) => {
    ctx.body = await getCIDs(syncro);
    next();
  });

  router.get('/objects', async (ctx, next) => {
    let entries = [];
    await Promise.all((await getCIDs(syncro)).map(async entry => {
      for await (const file of ipfs.get(entry.cid)) {
        if (!file.content) continue;
        const content = [];
        for await (const chunk of file.content) {
          content.push(chunk)
        }
        entry.content = [].concat(content);
        entries.push(entry);
      }
    }));
    ctx.body = entries;
    next();
  });

  router.post('/create', async (ctx, next) => {
    await createObject(ctx, syncro, ipfs);
    next();
  });

  router.post('/sync', async (ctx, next) => {
    let body = ctx.request.body;
    let currentIndex = await syncro.getIndex();
    if (body.filter && body.index){
      if (body.index < currentIndex) {
        let filter = syncro.createFilter(body.filter);
        let files = {};
        await Promise.all(await syncro.getEntriesFromIndex(body.index).map(async (promises, row) => {
          if (filter.has(row.id)) {
            for await (const file of ipfs.get(row.id)) {
              if (!file.content) continue;
              const content = [];
              for await (const chunk of file.content) {
                content.push(chunk)
              }
              files[row.id] = content;
            }
          } 
          return null;
        }));
        ctx.body = { files: files };
        ctx.response.status = 200;
      }
      else {
        ctx.response.status = 400;
        ctx.body = 'The submitted sync index exceeds the last sync index position';
      }
    }
    else if (body.index) {
      if (body.index < currentIndex) {
        ctx.body = { filter: await syncro.createFilterFromIndex(body.index, true) };
        ctx.response.status = 200;
      }
      else {
        ctx.response.status = 400;
        ctx.body = 'The submitted sync index exceeds the last sync index position';
      }
    }
    else {
      ctx.response.status = 400;
      ctx.body = 'No sync parameters were included in the request';
    }
    next();
  });

  server.use(async (ctx, next) => {
    await next();
    ctx.set('X-Sync-Index', await syncro.getIndex());
  });

  server.use(Static('./'));
  server.use(Logger());
  server.use(BodyParser());
  server.use(router.routes()).use(router.allowedMethods());
  server.listen(config.port, () => {
    console.log('Server running on port ' + config.port);
  });
}

start({ port: 1337 })