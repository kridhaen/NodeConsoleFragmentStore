const fs = require('fs');
const fetch = require('node-fetch');
const n3 = require('n3');

const { DataFactory } = n3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;


//help needed
let rootca = require('ssl-root-cas/latest').create();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

class FragmentStore{
    constructor(){
        this.lastPreviousUrl = null;
        this.lastLatest = null;
        this.DATASET_URL = 'https://lodi.ilabt.imec.be/observer/rawdata/latest';
    }
    download(_url){
        return new Promise(resolve => {
            fetch(_url)
                .then(function(response) {
                    return response.text();
                })
                .then(function(text) {
                    resolve(text);
                })
                .catch(err => console.log(err));
        });
    }

    parseAndStoreQuads(_doc) {
        return new Promise(resolve => {
            const parser = new n3.Parser();
            const store = n3.Store();
            parser.parse(_doc, (error, quad, prefixes) => {
                if (quad)
                    store.addQuad(quad);
                else
                    return resolve(store);
            });
        })
    }

    async sleep(milliseconds){
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    async compareAndSave(latest){
        if(this.lastLatest){
            if(latest !== this.lastLatest){
                //save to disk
                let currentTimeMillis = Date.now();
                fs.writeFile("./fragments/fragment"+currentTimeMillis, latest, function(err) {
                    if(err){
                        console.log(err);
                    }
                });

                let store = this.parseAndStoreQuads(latest);
                let prev = store.getQuads(null, namedNode('http://www.w3.org/ns/hydra/core#previous'), null)[0];
                let newLastPreviousUrl = prev;
                while (prev && this.lastPreviousUrl !== prev.object.value) {
                    let doc = await this.download(prev.object.value);
                    store = await this.parseAndStoreQuads(doc);

                    fs.writeFile("./previous/"+encodeURI(prev.object.value), doc, function(err) {
                        if(err){
                            console.log(err);
                        }
                    });

                    prev = store.getQuads(null, namedNode('http://www.w3.org/ns/hydra/core#previous'), null)[0];
                }
                this.lastPreviousUrl = newLastPreviousUrl;
                this.lastLatest = latest;
            }
        }
        else {
            this.lastLatest = latest;
        }
    }

    async start(){
        console.log("running");
        while(true){
            this.download(this.DATASET_URL)
                .then(console.log("fragment"))
                .then(res => console.log(res))
                .then(await this.sleep(10000));
            // console.log("fragment");
            // console.log(doc);
            // this.sleep(10000);
        }
    }

}

let fragmentStore = new FragmentStore();
fragmentStore.start().catch((err) => console.log(err));
