import {v2 as cloudinary} from 'cloudinary' 
import fs from 'fs'

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadonCloudinary = async (localFilePath) => {
    if(!localFilePath) return null
    try {
        const response = await cloudinary.uploader.upload(localFilePath, 
            {
                resource_type : "auto"
            }
        )
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async(assetId) => {
    try {
        const response = await cloudinary.uploader.destroy(assetId)
        return response
    } catch (error) {
        return null
    }
}

export {
    uploadonCloudinary,
    deleteFromCloudinary,
}