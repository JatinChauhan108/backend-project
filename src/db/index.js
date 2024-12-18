import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';


export default async function dbConn(){
    try {
        const connInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        console.log(`\n MongoDB connected !! DB Host : ${connInstance.connection.host}`);
        
        
    } catch (error) {
        console.error("MongoDB connection error : ", error)
        process.exit(1);
    }
}
    