module.exports = (err,req,res,next)=>{

console.error("===== API ERROR =====");

console.error("Endpoint :",req.originalUrl);

console.error("Error :",err.message);

console.error("=====================");

res.status(500).json({
message:"Internal Server Error"
});

};