import mongoose , {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const PlayListSchema = new Schema( 
    {
name:{
    type:String, //cloudinary url
    required:true
},
description:{
    type:String, //cloudinary url
    required:true
},
videos: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video" // assuming you have a Video model
        }
    ],
owner:{
    type:Schema.Types.ObjectId,
    ref:"User",
}
})

PlayListSchema.plugin(mongooseAggregatePaginate)

export const PlayList = mongoose.model("PlayList",PlayListSchema)