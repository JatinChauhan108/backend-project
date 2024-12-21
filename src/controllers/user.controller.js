import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import uploadonCloudinary from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async (req, res) => {
    const {username, fullName, email, password} = req.body;
    console.log(email);

    if(
        [username, fullName, email, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = User.findOne({
        $or : [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "Provided username or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar path not found")
    }

    const avatar = uploadonCloudinary(avatarLocalPath)
    const coverImage = uploadonCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar not uploaded successfully")
    }

    const user = await User.create({
        fullName,
        username : username.toLowerCase(),
        email,
        password,
        avatar : avatar.url,
        coverImage : coverImage?.url || "" ,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(400, "Something went wrong while registering the user")
    }

    res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )

})

export {registerUser}