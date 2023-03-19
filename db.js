const {MongoClient} = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.URL;

async function run(){
    
     const client = new MongoClient(url);

     module.exports = client;
 
    try {

        await client.connect();

        console.log("db connected");

        const app = require('./app');

        app.listen(8000,()=>{
            console.log("server listening at 8000");
        })
 
    } catch (e) {
        console.error(e);
}
}

run().catch(console.error);




