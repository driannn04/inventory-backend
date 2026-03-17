module.exports = (req,res,next)=>{

console.log("===== API REQUEST =====");

console.log("Method :",req.method);

console.log("URL :",req.originalUrl);

console.log("Body :",req.body);

console.log("Query :",req.query);

console.log("=======================");

next();

};