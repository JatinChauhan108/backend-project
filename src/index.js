// require('dotenv').config({path : './env'})

import dotenv from 'dotenv'
import connectDB from './db/index.js'
import app from './app.js'

dotenv.config({
    path : './env'
})

const port = process.env.PORT || 8000

connectDB()
.then(() => {
    app.listen(port , () => {
        console.log('Server listening at port ',port);
    })
})
.catch((err) => {
    console.log("Err : ", err);
    throw err;
})



































/*

import express from 'express'
import { DB_NAME } from '../constants';

const app = express();

export async function dbConn(){
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        app.on('error',(error) => {
            console.error("Error : ",error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("Error : ", error)
        throw error
    }
}
    
*/