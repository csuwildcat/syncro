
const syncroTable = 'syncro_history';
const defaultFilter = 'CuckooFilter';

export default class Syncro {
  constructor (options = {}) {

    this.index = null;
    this.options = options;

    /* Default filter options and module import */

    let filters = options.filter = Object.assign({
      path: 'bloom-filters'
    }, options.filters || {});

    this._filters = new Promise(async resolve => {
      if (!filters.custom) resolve(await import(filters.path));
    }).catch(e => console.log(e));

    /* Default storage options and module import */

    let storage = options.storage = Object.assign({
      tables: [],
      path: '@nano-sql/core',
      syncroDatabase: 'syncro'
    }, options.storage || {});

    this._db = new Promise(async resolve => {
      if (!storage.custom) {
        let nano = (await import(storage.path)).nSQL;

        nano().createDatabase({
          id: storage.syncroDatabase,
          mode: 'PERM', // save changes to IndexedDB, WebSQL or SnapDB
          tables: [
            {
              name: syncroTable,
              model: {
                "index:int": { pk: true, ai: true, immutable: true },
                "cid:string": { immutable: true, notNull: true },
              }
            }
          ].concat(storage.tables),
          version: 1,
          onVersionUpdate: (lastVersion) => {
            if (storage.onVersionUpdate) storage.onVersionUpdate(nano, lastVersion)
          }
        }).catch(error => console.log(error));

        nano().useDatabase(storage.syncroDatabase).on('ready', () => {
          nano(syncroTable).on('upsert', e => {
            if (!e.oldRow) this.index = e.result.index;
          });
          resolve(nano); // resolve first to setup the promise-dependent methods
          this.refreshIndex(); // refresh the index next to ensure it is set for onReady logic
          if (storage.onReady) storage.onReady(); // call onReady when everything is done
        });
      }
    });

  }
  db (table, fn){
    return this._db.then(db => (fn || table)(db(fn ? table : syncroTable)))
  }
  filter (type, fn){
    return this._filters.then(filters => (fn || type)(filters[fn ? type : defaultFilter]));
  }
  async setEntry (cid){
    return this.getIndexOf(cid).then(index => {
      if (index === null) {
        return this.db(table => table.query('upsert', { cid: cid }).exec());
      }
      else return index;
    }).catch(e => console.log(e));
  }
  async getIndexOf (cid){
    return this.db(table => table.query('select').where(['cid', '=', cid]).exec())
                .then(rows => rows.length ? rows[0].index : null)
  }
  async getEntriesFromIndex (index){
    return this.db(table => table.query('select').where(['order', '>', index]).exec())
                .catch(e => console.log(e))
  }
  async queryForIndex (){
    return this.db(table => table.query('select').orderBy(['order DESC']).limit(1).exec())
                .then(rows => {
                  return rows[0] ? rows[0].index : 0;
                })
                .catch(e => console.log(e));
  }
  async refreshIndex (){
    return this.index = await this.queryForIndex();
  }
  async getIndex(){
    return this.index !== null ? this.index : this.refreshIndex();
  }
  async createFilter (items, asJson, errorRate = 0.04) {
    let filter = await this.filter(filter => filter.from(items, errorRate));
    return asJson ? filter.saveAsJSON() : filter;
  }
  async createFilterFromIndex (index, asJson, errorRate) {
    let rows = await getEntriesFromIndex(index);
    return this.createFilter(rows.map(row => row.cid), asJson, errorRate);
  }
  async createDiffFilter (index) {
    
  }
}


// let dbMethods = {
//   select(table, filter = []){
//     return this.db(table).query('select', filter);
//   },
//   async put(table){
//     return this.db(table).query('upsert', slice.call(arguments, 1)).exec();
//   },
//   async get(table, id, prop){
//     return 
//   },
//   async query(table, filters){
//     let query = this.db(table).query('select');
//     if (filters) {
//       query = query.where(arguments.length > 2 ? slice.call(arguments, 1) : filters)
//     }
//     return query.exec();
//   }
// }