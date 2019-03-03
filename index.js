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
	console.log("downloading: "+_url);
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

    //latest -> green, prev: blue
    async compareAndSave(latest){
	console.log("comparing");
        if(this.lastLatest){
            if(latest !== this.lastLatest){
                //save latest to disk
		        console.log("difference latest", "color: green");
                this.lastLatest = latest;
		        let currentTimeMillis = Date.now();
                fs.writeFile("./latest/fragment_"+currentTimeMillis, latest, function(err) {
                    if(err){
                        console.log(err);
                    }
		            console.log("latest saved", "color: green");
                });

                let store = await this.parseAndStoreQuads(latest);
                
		        let prev = store.getQuads(null, namedNode('http://www.w3.org/ns/hydra/core#previous'), null)[0];
                let oldLastPreviousUrl = this.lastPreviousUrl;
		        this.lastPreviousUrl = prev;
                while (prev && this.oldLastPreviousUrl !== prev.object.value) {
                    let doc = await this.download(prev.object.value);
 		            console.log("downloaded previous", "color: blue");
                    store = await this.parseAndStoreQuads(doc);
		    
		        let name = /time=(.*)/.exec(prev.object.value);
                    fs.writeFile("./previous/"+name, doc, function(err) {
                        if(err){
                            console.log(err);
                        }
			    console.log("previous saved", "color: blue");
                    });

                    prev = store.getQuads(null, namedNode('http://www.w3.org/ns/hydra/core#previous'), null)[0];
                }
            }
        }
        else {
            this.lastLatest = latest;
        }
    }

    async start(){
        console.log("running");
        while(true){
            let res = await this.download(this.DATASET_URL)
			    .then(console.log("downloaded latest fragment", "color: green"));
            this.compareAndSave(res);
            await this.sleep(10000);
            // console.log("fragment");
            // console.log(doc);
            // this.sleep(10000);
        }
    }

}

let fragmentStore = new FragmentStore();
fragmentStore.start().catch((err) => console.log(err));
