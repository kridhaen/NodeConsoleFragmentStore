const fs = require('fs');
const fetch = require('node-fetch');
const n3 = require('n3');
const https = require("https");

const { DataFactory } = n3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;


//help needed
let rootca = require('ssl-root-cas/latest').create();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//process.env.NODE_EXTRA_CA_CERTS=[rootca];

class FragmentStore{
    constructor(){
        this.lastPreviousUrl = null;
        this.lastLatest = null;
        this.DATASET_URL = 'https://lodi.ilabt.imec.be/observer/rawdata/latest';
    }

    download(_url){
	    console.log("\x1b[32m","downloading: "+_url,"\x1b[0m");
	    const caAgent = new https.Agent({ca: rootca});
        return new Promise(resolve => {

            fetch(_url, {agent: caAgent})
                .then(function(response) {
                    return response.text();
                })
                .then(function(text) {
                    resolve(text);
                })
                .catch(err => console.log("\x1b[31m\x1b[47m",err,"\x1b[0m"));
        });
    }

    download2(_url){

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
                this.lastLatest = latest;
		        console.log("\x1b[36m","difference latest","\x1b[0m");
		        let currentTimeMillis = Date.now();
                fs.writeFile("./latest/fragment_"+currentTimeMillis, latest, function(err) {
                    if(err){
                        console.log(err);
                    }
		            console.log("\x1b[36m","latest saved","\x1b[0m");
                });
                //check previous if saved
                let store = await this.parseAndStoreQuads(latest);
                
		        let prev = store.getQuads(null, namedNode('http://www.w3.org/ns/hydra/core#previous'), null)[0];
                let oldLastPreviousUrl = this.lastPreviousUrl;
                if(prev){
                    this.lastPreviousUrl = prev.object.value;
                }
		        while (prev && oldLastPreviousUrl !== prev.object.value) {
                    let doc = await this.download(prev.object.value);
 		            console.log("\x1b[33m","downloaded previous","\x1b[0m");
                    store = await this.parseAndStoreQuads(doc);
		    
		        let name = /time=(.*)/.exec(prev.object.value);
                    fs.writeFile("./previous/"+name, doc, function(err) {
                        if(err){
                            console.log(err);
                        }
			    console.log("\x1b[33m","previous saved","\x1b[0m");
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
        setInterval(() => {
            try{
                this.download(this.DATASET_URL)
                    .then(console.log("\x1b[36m","downloaded latest fragment","\x1b[0m"))
                    .then((res) => this.compareAndSave(res));
                //this.compareAndSave(res);
                // console.log("fragment");
                // console.log(doc);
                // this.sleep(10000);
            }
            catch(e){
                console.log(e);
            }
        }, 10000);
    }

}

let fragmentStore = new FragmentStore();
fragmentStore.start().catch((err) => console.log(err));
