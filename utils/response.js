exports.success = (res,message,data,meta=null)=>{
res.json({
success:true,
message:message,
data:data,
meta:meta
});
};

exports.error = (res,message)=>{
res.status(500).json({
success:false,
message:message
});
};