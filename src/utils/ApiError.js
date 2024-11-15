class ApiError extends Error {
    constructor (
        statusCode,
        messaage = "Something Went Wrong",
        errors = [],
        statck= ""
    ){
super(messaage)
this.statusCode = statusCode
this.data=null
this.message = messaage
this.success = false;
this.errors = errors

if (statck) {
    this.stack = statck
}else{
    Error.captureStackTrace(this,this.constructor)
}
    }
}

export {ApiError}