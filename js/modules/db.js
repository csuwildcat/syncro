
const nano = require('@nano-sql/core').nSQL;   

module.exports = async function (id, options){
  await nano().createDatabase(Object.assign({
    id: id, // can be anything that's a string
    mode: 'PERM', // save changes to IndexedDB, WebSQL or SnapDB
    tables: [
      {
        name: 'stack',
        model: {
          "order:int": { pk: true, ai: true, immutable: true },
          "id:string": { immutable: true, notNull: true },
        }
      },
      {
        name: 'objects',
        model: {
          "id:string": { pk: true, immutable: true, notNull: true },
          "type:string": { immutable: true, notNull: true },
          "commits:object[]": {
              default: [],
              model: {
                "id:string": { immutable: true, notNull: true }
              }
          }
        }
      }
    ],
    version: 1,
    onVersionUpdate: (prevVersion) => { // migrate versions

    }
  }, options)).then(function(){
    
  }).catch(error => {
    console.log(error);
  })

  return nano;
}