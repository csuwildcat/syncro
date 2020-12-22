
const Logger = require('koa-logger');
const BodyParser = require('koa-body');
const serve = require('koa-static');
const toJCS = require('canonicalize');

Common = {
  async startApp(port = 1337, app, router, db, ipfs){
    await db;
    await ipfs;
    router.post('/create', async (ctx, next) => {
      await Common.createObject(ctx, db, ipfs);
      next();
    });
    app.use(serve('./'));
    app.use(Logger());
    app.use(BodyParser());
    app.use(router.routes()).use(router.allowedMethods());
    app.listen(port, () => {
      console.log('Server running on port ' + port);
    });
  },
  async createObject(ctx, db, ipfs){
    let obj = ctx.request.body;
    console.log(obj);
    if (!obj.type || !obj.payload) {
      ctx.response.status = 400;
      ctx.body = `Missing a type property or payload`;
    }
    else {
      let result;
      try {
        result = await ipfs.add(toJCS(obj));
      }
      catch (e) {
        ctx.response.status = 400;
        ctx.body = e;
      }

      await db('objects').query('select').where(['id', '=', result.cid]).exec().then(z => {
        console.log(z);
      }).catch(e => {
        console.log(e);
        return db('objects').query('upsert', [{ id: result.cid, type: obj.type }])
      });

      ctx.response.status = 201;
      ctx.body = `Your object was created!`;
    }
  }
}

module.exports = Common;