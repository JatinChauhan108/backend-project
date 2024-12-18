import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
    cloud_name: CLOUDINARY_CLOUD_NAME, 
    api_key: CLOUDINARY_API_KEY, 
    api_secret: CLOUDINARY_API_SECRET
});

const uploadonCloudinary = async (localFilePath) => {
    if(!localFilePath) return null
    try {
        const response = await cloudinary.uploader.upload(localFilePath, 
            {
                resource_type : "auto"
            }
        )
        console.log("File is uploaded on the cloudinary ", response.url);
        
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

export {uploadonCloudinary}