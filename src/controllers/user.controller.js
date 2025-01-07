import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadonCloudinary, deleteFromCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'

const generateAccessAndRefreshToken = async(user) => {
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken = refreshToken
        
        await user.save();

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Error occurred while generating access or refresh tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const {username, fullName, email, password} = req.body;

    if(
        [username, fullName, email, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or : [{username}, {email}]
    })  

    if(existedUser){
        throw new ApiError(409, "Provided username or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path

    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar path not found")
    }

    const avatar = await uploadonCloudinary(avatarLocalPath)
    const coverImage = await uploadonCloudinary(coverImageLocalPath)
    
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

const loginUser = asyncHandler(async(req, res) => {
    const {email, username, password }= req.body;   
    
    if(!email && !username){
        throw new ApiError(400, "Username or email is required")
    }
    
    const user = await User.findOne({
        $or : [{username} , {email}]
    })
    
    if(!user){
        throw new ApiError(404, "User with the given email or username doesn't exist")
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }
    
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user);

    user.password = undefined

    const options = {
        httpOnly : true,
        secure : true
    }
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(
        200,    
        {
            ...user._doc, accessToken
        },
        "Successfully logged in"
    ))
})

const logoutUser = asyncHandler(async(req, res, next) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {refreshToken : undefined}
    
        },
        {
            new : true                                          // to return the new user object after updation
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged out successfully"))

})

const refreshAccessToken = asyncHandler(async(req, res) => {
    
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    if(!decodedToken){
        throw new ApiError(401, "Unauthorized access")
    }

    const user = await User.findById(decodedToken._id)

    if(!user){
        throw new ApiError(401, "Unauthorized access")
    }

    if(incomingRefreshToken !== user.refreshToken){
        throw new ApiError(401, "Unauthorized access")    
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user)

    const options = {
        httpOnly : true,
        secure : true
    }

    user.password = undefined

    res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            201,
            {
                ...user._doc, accessToken
            },
            "Token refreshed successfully"
        )
    )
})

const updatePassword = asyncHandler(async(req, res) => {
    const user = req.user
    const {oldPassword, newPassword} = req.body

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword;

    await user.save();

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "Password updated successfully"
    ))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName, email
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
    
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file not received")
    }

    const assetId = req.user?.avatar.split('/')[7].split('.')[0]
    
    const oldFileRemoved = await deleteFromCloudinary(assetId)    

    if(!oldFileRemoved || oldFileRemoved.result === 'not found'){
        throw new ApiError(400, "Old file couldn't be deleted")
    }

    const avatar = await uploadonCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(400, "Failed to upload on cloudinary")
    }
    

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            },
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "Avatar changed successfully"
    ))
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file not received")
    }
    
    const assetId = req.user?.coverImage.split('/')[7].split('.')[0]
    
    const oldFileRemoved = await deleteFromCloudinary(assetId)

    if(!oldFileRemoved || oldFileRemoved.result === 'not found'){
        throw new ApiError(400, "Old file couldn't be deleted")
    }

    const coverImage = await uploadonCloudinary(coverImageLocalPath)

    if(!coverImage){
        throw new ApiError(400, "Failed to upload on cloudinary")
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            },
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "Cover Image updated successfully"
    ))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updatePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}