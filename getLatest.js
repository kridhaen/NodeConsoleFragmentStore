const fs = require('fs');
const fetch = require('node-fetch');
const axios = require('axios');
const n3 = require('n3');
const https = require("https");

const { DataFactory } = n3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;


//help needed
//let rootca = require('ssl-root-cas/latest').create();
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//process.env.NODE_EXTRA_CA_CERTS=[rootca];

class FragmentStore{
    constructor(){
        this.DATASET_URL = 'https://lodi.ilabt.imec.be/observer/rawdata/latest';
    }

    download(_url){
        console.log("\x1b[32m","downloading: "+_url,"\x1b[0m");
        // const caAgent = new https.Agent({ca: rootca});
        return new Promise((resolve,reject) => {

            fetch(_url, { timeout: 2000000 })
                .then(function(response) {
                    resolve(response.text());
                })
                .catch(err => {console.log("\x1b[31m\x1b[47m",err,"\x1b[0m"); reject(err)});
        });
    }

    download2(_url){
        console.log("\x1b[32m","downloading: "+_url,"\x1b[0m");
        //const caAgent = new https.Agent({ca: rootca});
        return new Promise((resolve,reject) => {

            axios.get(_url)
                .then(function(response) {
                    resolve(response.data);
                })
                .catch(err => {console.log("\x1b[31m\x1b[47m",err,"\x1b[0m"); reject(err)});
        });
    }

    //latest -> green, prev: blue
    async compareAndSave(latest){
        console.log("comparing");
        //console.log(latest);
        if(latest){
            console.log("\x1b[36m","parse latest","\x1b[0m");
            let currentTimeMillis = Date.now();
            fs.writeFile("./latest/fragment_"+currentTimeMillis, latest, function(err) {
                if(err){
                    console.log(err);
                }
                console.log("\x1b[36m","latest saved","\x1b[0m");
            });
        }
    }

    start(){
        console.log("running");
        setInterval(() => { //changed interval to every 3 hours get all previous files
            //try{
            this.download(this.DATASET_URL)
                .then((res) => { console.log("\x1b[36m","downloaded latest fragment","\x1b[0m"); return res})
                .then((res) => this.compareAndSave(res))
                .catch(e => console.log(e));
            //this.compareAndSave(res);
            // console.log("fragment");
            // console.log(doc);
            // this.sleep(10000);
            // }
            //catch(e){
            //     console.log(e);
            // }
            console.log("\x1b[35m","ready for next latest","\x1b[0m");
        }, 1000); //iedere seconde
    }

}

let fragmentStore = new FragmentStore();
fragmentStore.start();
