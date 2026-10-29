import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
const uploadFileToBackblaze = async (file) => {
    const client = new S3Client({
        region: "us-west-002",
        endpoint: "https://s3.us-west-002.backblazeb2.com",
        credentials: {
            accessKeyId: process.env.B2_KEY_ID,
            secretAccessKey: process.env.B2_APP_KEY,
        },
    });
       try{
          const result= await Backblaze.uploader.upload(file)
          fs.unlinkSync(file)
          return result.secure_url
        } catch (error) {
            fs.unlinkSync(file)
        console.log(error)
    }
}
export default uploadFileToBackblaze;